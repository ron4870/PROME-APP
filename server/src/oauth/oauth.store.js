'use strict';

/**
 * =============================================================================
 *  SEAM 1 of 5 — WHICH DATABASE.  This is the one obvious place to choose.
 * =============================================================================
 *
 * The PROME portal reports {"database":"connected"} and does not say which one,
 * so both are here and the choice is one environment variable:
 *
 *     OAUTH_DB_DRIVER=pg        PostgreSQL, via the `pg` package
 *     OAUTH_DB_DRIVER=mysql2    MySQL / MariaDB, via the `mysql2` package
 *     OAUTH_DB_DRIVER=memory    in-process, NOT for production (see below)
 *
 * If the portal already has a pool/connection, pass it in as `options.pool`
 * instead of letting this file build one — see SEAM 1b at `createOAuthStore`.
 * Nothing else in this codebase talks to a database.
 *
 * -----------------------------------------------------------------------------
 * WHY EVERYTHING IS STORED AS A SHA-256 HASH
 *
 * Authorization codes, access tokens and refresh tokens are *bearer* secrets:
 * whoever holds the string is the user. They are also, unlike a password, used
 * by machines at high frequency, so we cannot afford bcrypt on every API call.
 * SHA-256 of a 256-bit random value is the right trade: the value has full
 * entropy, so there is no dictionary to attack and no need for a salt or a slow
 * KDF, and a dump of these tables (a backup on a laptop, a SQL injection in an
 * unrelated report screen, a DBA's screenshot) yields nothing usable.
 *
 * The plaintext exists only in the HTTP response that issues it. It is never
 * written to a column and must never be written to a log.
 *
 * WHY OPAQUE RANDOM TOKENS RATHER THAN JWTs
 *
 * A JWT access token cannot be revoked before it expires without keeping a
 * denylist — which is a database lookup on every request, i.e. exactly the cost
 * a JWT was supposed to avoid, plus a second source of truth. This portal needs
 * Sign Out to actually end a session and needs refresh-token-reuse detection to
 * be able to kill a whole token family instantly. Both of those want a lookup
 * anyway, so an opaque 32-byte random string with a hashed index is simpler,
 * strictly more revocable, leaks nothing if it appears in a log, and never has
 * to have an `alg` confusion CVE. The portal's own `/api/auth/*` JWTs are
 * untouched; these are a separate credential for the desktop app.
 *
 * REUSE-DETECTION BLAST RADIUS  (OAUTH_REVOKE_ACCESS_ON_REUSE)
 *
 * When a superseded refresh token is presented, the whole refresh chain is
 * revoked unconditionally. That is RFC 9700 4.14.2 and it is not optional here:
 * whoever is replaying an old refresh token must never get another one, and
 * neither may the legitimate app, because the server cannot tell which of the
 * two is the thief.
 *
 * Whether to ALSO kill the access token already issued under that family is a
 * judgement call, so it is a flag, default OFF:
 *
 *   OFF (default): the outstanding access token keeps working until it expires
 *     - at most one hour. This is what the RFCs require and no more, and it is
 *     what the conformance suite expects: it checks that a live access token
 *     still answers at /userinfo immediately after a reuse event.
 *   ON  (OAUTH_REVOKE_ACCESS_ON_REUSE=true): the access token dies too. Strictly
 *     safer, at the cost of signing a legitimate user out mid-task whenever a
 *     flaky network makes their app retry a refresh that had in fact already
 *     succeeded - which is the common cause of a false reuse signal.
 *
 * Explicit revocation (POST /oauth/revoke, i.e. Sign Out) always kills access
 * tokens as well, flag or no flag: there the user has said the session is over,
 * so there is no ambiguity to trade against.
 */

const { randomBytes, createHash } = require('node:crypto');
const { base64url } = require('./pkce');

// -----------------------------------------------------------------------------
// Shared helpers — identical for every adapter, so all three behave the same.
// -----------------------------------------------------------------------------

/** 256 bits of CSPRNG output, base64url — 43 URL-safe characters. */
function randomToken() {
  return base64url(randomBytes(32));
}

/**
 * The single hashing function for every secret in this subsystem.
 * Hex, so the column is a fixed CHAR(64) and can carry a UNIQUE index cheaply.
 */
function hashToken(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

/** A refresh-token family: every token descended from one authorization code. */
function newFamilyId() {
  return base64url(randomBytes(16));
}

/**
 * Build the plaintext + row data for one access/refresh pair.
 * Kept here rather than in the router so that the plaintext is created in the
 * same place as the hash and cannot drift apart.
 */
function mintTokenPair({ clientId, userId, scope, familyId, accessTtlSeconds, refreshTtlSeconds, now }) {
  const accessToken = randomToken();
  const refreshToken = randomToken();
  return {
    plaintext: { accessToken, refreshToken },
    access: {
      tokenHash: hashToken(accessToken),
      clientId,
      userId,
      scope,
      familyId,
      expiresAt: new Date(now.getTime() + accessTtlSeconds * 1000),
    },
    refresh: {
      tokenHash: hashToken(refreshToken),
      clientId,
      userId,
      scope,
      familyId,
      expiresAt: new Date(now.getTime() + refreshTtlSeconds * 1000),
    },
  };
}

// -----------------------------------------------------------------------------
// The interface every adapter implements.
//
// Two of these methods take a `decide` callback. That is deliberate: the
// security *decisions* (is this code expired? does the verifier match? has this
// refresh token already been superseded?) live in oauth.routes.js where they can
// be read in order and audited, while the *atomicity* lives here. The adapter
// guarantees that the row is locked for the whole of `decide` and that marking
// it used and inserting the new tokens happen in the same transaction as the
// read — which is the whole of the single-use rule.
// -----------------------------------------------------------------------------
//
//   getClient(clientId) -> client | null
//   saveAuthorizationCode(record) -> void
//   redeemAuthorizationCode(codeHash, decide) -> { error } | { tokens }
//   rotateRefreshToken(tokenHash, decide) -> { error } | { tokens }
//   findAccessToken(tokenHash) -> row | null
//   revokeToken(tokenHash) -> void   (never throws for an unknown token)
//   purgeExpired(now) -> void
//   close() -> void
//
// `decide` returns one of:
//   { error: 'invalid_grant', errorDescription: '...' }            refuse
//   { error: '...', burn: true }                                   refuse AND
//                                                                  invalidate
//   { grant: { userId, clientId, scope, familyId? } }              issue
// -----------------------------------------------------------------------------

/* ===========================================================================
 * PostgreSQL adapter
 * ======================================================================== */

function createPgStore(options) {
  // Lazy require so a MySQL deployment never needs `pg` installed at all.
  const { Pool } = require('pg');
  const pool =
    options.pool ||
    new Pool({
      connectionString: options.connectionString,
      max: options.poolMax || 10,
      // WHY: a token request that cannot get a connection must fail fast with a
      // 503 rather than pile up behind the portal's own report queries.
      connectionTimeoutMillis: 5000,
      ...(options.ssl ? { ssl: options.ssl } : {}),
    });

  async function inTransaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* connection already dead */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async function insertTokenPair(client, pair) {
    await client.query(
      `INSERT INTO oauth_access_tokens
         (token_hash, client_id, user_id, scope, family_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [pair.access.tokenHash, pair.access.clientId, pair.access.userId,
       pair.access.scope, pair.access.familyId, pair.access.expiresAt],
    );
    await client.query(
      `INSERT INTO oauth_refresh_tokens
         (token_hash, client_id, user_id, scope, family_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [pair.refresh.tokenHash, pair.refresh.clientId, pair.refresh.userId,
       pair.refresh.scope, pair.refresh.familyId, pair.refresh.expiresAt],
    );
  }

  return {
    driver: 'pg',

    async getClient(clientId) {
      const { rows } = await pool.query(
        `SELECT client_id, client_name, redirect_uris, is_public, require_pkce, allowed_scopes
           FROM oauth_clients WHERE client_id = $1 AND disabled_at IS NULL`,
        [clientId],
      );
      return rows[0] ? normaliseClient(rows[0]) : null;
    },

    async saveAuthorizationCode(record) {
      await pool.query(
        `INSERT INTO oauth_authorization_codes
           (code_hash, client_id, user_id, redirect_uri, code_challenge,
            code_challenge_method, scope, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [record.codeHash, record.clientId, record.userId, record.redirectUri,
         record.codeChallenge, record.codeChallengeMethod, record.scope, record.expiresAt],
      );
    },

    async redeemAuthorizationCode(codeHash, decide) {
      return inTransaction(async (client) => {
        // FOR UPDATE is the lock that makes single-use real. Without it, two
        // requests carrying the same stolen code both read used_at = NULL and
        // both get tokens. The UNIQUE index on code_hash means there is exactly
        // one row to lock, so this serialises them.
        const { rows } = await client.query(
          `SELECT * FROM oauth_authorization_codes WHERE code_hash = $1 FOR UPDATE`,
          [codeHash],
        );
        const decision = await decide(rows[0] ? normaliseCode(rows[0]) : null);

        if (decision.error) {
          if (decision.burn && rows[0]) {
            await client.query(
              `UPDATE oauth_authorization_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL`,
              [rows[0].id],
            );
          }
          return { error: decision.error, errorDescription: decision.errorDescription };
        }

        // Mark used FIRST and insist the UPDATE actually touched a row. Belt
        // and braces on top of FOR UPDATE: if anything ever weakens the lock,
        // `used_at IS NULL` in the WHERE clause still makes the second
        // redemption a no-op and this rollback denies it a token.
        const marked = await client.query(
          `UPDATE oauth_authorization_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL`,
          [rows[0].id],
        );
        if (marked.rowCount !== 1) {
          return { error: 'invalid_grant', errorDescription: 'authorization code has already been used' };
        }

        const pair = mintTokenPair({ ...decision.grant, familyId: newFamilyId(), ...options.ttl, now: new Date() });
        await insertTokenPair(client, pair);
        return { tokens: { ...pair.plaintext, scope: decision.grant.scope, userId: decision.grant.userId } };
      });
    },

    async rotateRefreshToken(tokenHash, decide) {
      return inTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM oauth_refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
          [tokenHash],
        );
        const row = rows[0] ? normaliseRefresh(rows[0]) : null;
        const decision = await decide(row);

        if (decision.error) {
          // `burn` here means reuse of a superseded token — see
          // REUSE-DETECTION BLAST RADIUS above for why the refresh chain always
          // dies and the live access token only optionally does.
          if (decision.burn && row) {
            await client.query(
              `UPDATE oauth_refresh_tokens SET revoked_at = now()
                 WHERE family_id = $1 AND revoked_at IS NULL`, [row.familyId]);
            if (options.revokeAccessTokensOnReuse) {
              await client.query(
                `UPDATE oauth_access_tokens SET revoked_at = now()
                   WHERE family_id = $1 AND revoked_at IS NULL`, [row.familyId]);
            }
          }
          return { error: decision.error, errorDescription: decision.errorDescription };
        }

        const pair = mintTokenPair({ ...decision.grant, familyId: row.familyId, ...options.ttl, now: new Date() });
        // Retire the presented token in the same transaction that mints its
        // successor, and record the link so a later reuse is *detectable* rather
        // than merely refused.
        const retired = await client.query(
          `UPDATE oauth_refresh_tokens
              SET revoked_at = now(), superseded_by = $2
            WHERE id = $1 AND revoked_at IS NULL`,
          [row.id, pair.refresh.tokenHash],
        );
        if (retired.rowCount !== 1) {
          return { error: 'invalid_grant', errorDescription: 'refresh token is no longer valid' };
        }
        await insertTokenPair(client, pair);
        return { tokens: { ...pair.plaintext, scope: decision.grant.scope, userId: decision.grant.userId } };
      });
    },

    async findAccessToken(tokenHash) {
      const { rows } = await pool.query(
        `SELECT * FROM oauth_access_tokens WHERE token_hash = $1`, [tokenHash]);
      return rows[0] ? normaliseAccess(rows[0]) : null;
    },

    async revokeToken(tokenHash) {
      // RFC 7009: revoking a refresh token SHOULD revoke what was issued with
      // it. We revoke the family, so Sign Out really signs out everywhere that
      // chain reached.
      const { rows } = await pool.query(
        `SELECT family_id FROM oauth_refresh_tokens WHERE token_hash = $1`, [tokenHash]);
      const familyId = rows[0]
        ? rows[0].family_id
        : (await pool.query(`SELECT family_id FROM oauth_access_tokens WHERE token_hash = $1`, [tokenHash])).rows[0]?.family_id;
      if (!familyId) return; // Unknown token: say nothing, do nothing, answer 200.
      await pool.query(`UPDATE oauth_refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL`, [familyId]);
      await pool.query(`UPDATE oauth_access_tokens  SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL`, [familyId]);
    },

    async purgeExpired() {
      await pool.query(`DELETE FROM oauth_authorization_codes WHERE expires_at < now() - interval '1 day'`);
      await pool.query(`DELETE FROM oauth_access_tokens       WHERE expires_at < now() - interval '7 days'`);
      await pool.query(`DELETE FROM oauth_refresh_tokens      WHERE expires_at < now() - interval '30 days'`);
    },

    async close() { if (!options.pool) await pool.end(); },
  };
}

/* ===========================================================================
 * MySQL / MariaDB adapter
 * ======================================================================== */

function createMysqlStore(options) {
  const mysql = require('mysql2/promise');
  const pool =
    options.pool ||
    mysql.createPool({
      uri: options.connectionString,
      connectionLimit: options.poolMax || 10,
      // WHY: mysql2 returns DATETIME as a JS Date only with this default; we
      // rely on Date comparisons in the route, so keep it explicit.
      dateStrings: false,
      // WHY 'Z': without it mysql2 serialises a JS Date using the Node
      // process's local time zone, while the `used_at`/`revoked_at` columns are
      // written by UTC_TIMESTAMP(3) on the server. On a box that is not UTC
      // those two conventions differ by the offset, and an expiry written at
      // 09:00 local would be compared against a server clock reading 08:00 UTC
      // — tokens then live an hour too long, or expire an hour early, depending
      // which way the offset runs. Pinning both ends to UTC removes the
      // question entirely.
      timezone: 'Z',
      ...(options.ssl ? { ssl: options.ssl } : {}),
    });

  async function inTransaction(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (error) {
      try { await conn.rollback(); } catch { /* connection already dead */ }
      throw error;
    } finally {
      conn.release();
    }
  }

  async function insertTokenPair(conn, pair) {
    await conn.execute(
      `INSERT INTO oauth_access_tokens
         (token_hash, client_id, user_id, scope, family_id, expires_at)
       VALUES (?,?,?,?,?,?)`,
      [pair.access.tokenHash, pair.access.clientId, pair.access.userId,
       pair.access.scope, pair.access.familyId, pair.access.expiresAt],
    );
    await conn.execute(
      `INSERT INTO oauth_refresh_tokens
         (token_hash, client_id, user_id, scope, family_id, expires_at)
       VALUES (?,?,?,?,?,?)`,
      [pair.refresh.tokenHash, pair.refresh.clientId, pair.refresh.userId,
       pair.refresh.scope, pair.refresh.familyId, pair.refresh.expiresAt],
    );
  }

  return {
    driver: 'mysql2',

    async getClient(clientId) {
      const [rows] = await pool.execute(
        `SELECT client_id, client_name, redirect_uris, is_public, require_pkce, allowed_scopes
           FROM oauth_clients WHERE client_id = ? AND disabled_at IS NULL`,
        [clientId],
      );
      return rows[0] ? normaliseClient(rows[0]) : null;
    },

    async saveAuthorizationCode(record) {
      await pool.execute(
        `INSERT INTO oauth_authorization_codes
           (code_hash, client_id, user_id, redirect_uri, code_challenge,
            code_challenge_method, scope, expires_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [record.codeHash, record.clientId, record.userId, record.redirectUri,
         record.codeChallenge, record.codeChallengeMethod, record.scope, record.expiresAt],
      );
    },

    async redeemAuthorizationCode(codeHash, decide) {
      return inTransaction(async (conn) => {
        // InnoDB: SELECT ... FOR UPDATE on a UNIQUE index takes a record lock,
        // so a concurrent redemption of the same code blocks here instead of
        // racing us to the UPDATE.
        const [rows] = await conn.execute(
          `SELECT * FROM oauth_authorization_codes WHERE code_hash = ? FOR UPDATE`, [codeHash]);
        const decision = await decide(rows[0] ? normaliseCode(rows[0]) : null);

        if (decision.error) {
          if (decision.burn && rows[0]) {
            await conn.execute(
              `UPDATE oauth_authorization_codes SET used_at = UTC_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL`,
              [rows[0].id]);
          }
          return { error: decision.error, errorDescription: decision.errorDescription };
        }

        const [marked] = await conn.execute(
          `UPDATE oauth_authorization_codes SET used_at = UTC_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL`,
          [rows[0].id]);
        if (marked.affectedRows !== 1) {
          return { error: 'invalid_grant', errorDescription: 'authorization code has already been used' };
        }

        const pair = mintTokenPair({ ...decision.grant, familyId: newFamilyId(), ...options.ttl, now: new Date() });
        await insertTokenPair(conn, pair);
        return { tokens: { ...pair.plaintext, scope: decision.grant.scope, userId: decision.grant.userId } };
      });
    },

    async rotateRefreshToken(tokenHash, decide) {
      return inTransaction(async (conn) => {
        const [rows] = await conn.execute(
          `SELECT * FROM oauth_refresh_tokens WHERE token_hash = ? FOR UPDATE`, [tokenHash]);
        const row = rows[0] ? normaliseRefresh(rows[0]) : null;
        const decision = await decide(row);

        if (decision.error) {
          // See REUSE-DETECTION BLAST RADIUS at the top of this file.
          if (decision.burn && row) {
            await conn.execute(
              `UPDATE oauth_refresh_tokens SET revoked_at = UTC_TIMESTAMP(3)
                 WHERE family_id = ? AND revoked_at IS NULL`, [row.familyId]);
            if (options.revokeAccessTokensOnReuse) {
              await conn.execute(
                `UPDATE oauth_access_tokens SET revoked_at = UTC_TIMESTAMP(3)
                   WHERE family_id = ? AND revoked_at IS NULL`, [row.familyId]);
            }
          }
          return { error: decision.error, errorDescription: decision.errorDescription };
        }

        const pair = mintTokenPair({ ...decision.grant, familyId: row.familyId, ...options.ttl, now: new Date() });
        const [retired] = await conn.execute(
          `UPDATE oauth_refresh_tokens SET revoked_at = UTC_TIMESTAMP(3), superseded_by = ?
             WHERE id = ? AND revoked_at IS NULL`,
          [pair.refresh.tokenHash, row.id]);
        if (retired.affectedRows !== 1) {
          return { error: 'invalid_grant', errorDescription: 'refresh token is no longer valid' };
        }
        await insertTokenPair(conn, pair);
        return { tokens: { ...pair.plaintext, scope: decision.grant.scope, userId: decision.grant.userId } };
      });
    },

    async findAccessToken(tokenHash) {
      const [rows] = await pool.execute(`SELECT * FROM oauth_access_tokens WHERE token_hash = ?`, [tokenHash]);
      return rows[0] ? normaliseAccess(rows[0]) : null;
    },

    async revokeToken(tokenHash) {
      const [r1] = await pool.execute(`SELECT family_id FROM oauth_refresh_tokens WHERE token_hash = ?`, [tokenHash]);
      let familyId = r1[0]?.family_id;
      if (!familyId) {
        const [r2] = await pool.execute(`SELECT family_id FROM oauth_access_tokens WHERE token_hash = ?`, [tokenHash]);
        familyId = r2[0]?.family_id;
      }
      if (!familyId) return;
      await pool.execute(`UPDATE oauth_refresh_tokens SET revoked_at = UTC_TIMESTAMP(3) WHERE family_id = ? AND revoked_at IS NULL`, [familyId]);
      await pool.execute(`UPDATE oauth_access_tokens  SET revoked_at = UTC_TIMESTAMP(3) WHERE family_id = ? AND revoked_at IS NULL`, [familyId]);
    },

    async purgeExpired() {
      await pool.execute(`DELETE FROM oauth_authorization_codes WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 1 DAY`);
      await pool.execute(`DELETE FROM oauth_access_tokens       WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 7 DAY`);
      await pool.execute(`DELETE FROM oauth_refresh_tokens      WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 30 DAY`);
    },

    async close() { if (!options.pool) await pool.end(); },
  };
}

/* ===========================================================================
 * In-process adapter — DEVELOPMENT AND CONFORMANCE TESTING ONLY
 *
 * Present so the conformance suite can be run with no database at all, and so
 * a developer can bring the flow up on a laptop. It is NOT production storage:
 * every token dies on restart and nothing is shared between workers, so with
 * more than one Node process a refresh will randomly fail. Setting
 * OAUTH_DB_DRIVER=memory with NODE_ENV=production throws in createOAuthStore.
 * ======================================================================== */

function createMemoryStore(options) {
  const clients = new Map();
  const codes = new Map();        // code_hash -> row
  const refreshTokens = new Map(); // token_hash -> row
  const accessTokens = new Map();  // token_hash -> row
  let seq = 0;

  // A single promise chain in place of row locks. Node is single-threaded, but
  // an `await` inside `decide` still yields, so without this two redemptions
  // genuinely can interleave between the read and the write.
  let queue = Promise.resolve();
  const serialize = (fn) => (queue = queue.then(fn, fn));

  return {
    driver: 'memory',

    /** Test/dev convenience — the SQL adapters get their clients from a seeded row. */
    _seedClient(client) { clients.set(client.clientId, normaliseClient(client)); },

    async getClient(clientId) { return clients.get(clientId) || null; },

    async saveAuthorizationCode(record) {
      if (codes.has(record.codeHash)) throw new Error('duplicate code_hash'); // mirrors the UNIQUE index
      codes.set(record.codeHash, { id: ++seq, ...record, usedAt: null });
    },

    async redeemAuthorizationCode(codeHash, decide) {
      return serialize(async () => {
        const row = codes.get(codeHash) || null;
        const decision = await decide(row);
        if (decision.error) {
          if (decision.burn && row && !row.usedAt) row.usedAt = new Date();
          return { error: decision.error, errorDescription: decision.errorDescription };
        }
        if (row.usedAt) return { error: 'invalid_grant', errorDescription: 'authorization code has already been used' };
        row.usedAt = new Date();
        const pair = mintTokenPair({ ...decision.grant, familyId: newFamilyId(), ...options.ttl, now: new Date() });
        accessTokens.set(pair.access.tokenHash, { id: ++seq, ...pair.access, revokedAt: null });
        refreshTokens.set(pair.refresh.tokenHash, { id: ++seq, ...pair.refresh, revokedAt: null, supersededBy: null });
        return { tokens: { ...pair.plaintext, scope: decision.grant.scope, userId: decision.grant.userId } };
      });
    },

    async rotateRefreshToken(tokenHash, decide) {
      return serialize(async () => {
        const row = refreshTokens.get(tokenHash) || null;
        const decision = await decide(row);
        if (decision.error) {
          // See REUSE-DETECTION BLAST RADIUS at the top of this file.
          if (decision.burn && row) {
            for (const t of refreshTokens.values()) if (t.familyId === row.familyId && !t.revokedAt) t.revokedAt = new Date();
            if (options.revokeAccessTokensOnReuse) {
              for (const t of accessTokens.values()) if (t.familyId === row.familyId && !t.revokedAt) t.revokedAt = new Date();
            }
          }
          return { error: decision.error, errorDescription: decision.errorDescription };
        }
        const pair = mintTokenPair({ ...decision.grant, familyId: row.familyId, ...options.ttl, now: new Date() });
        if (row.revokedAt) return { error: 'invalid_grant', errorDescription: 'refresh token is no longer valid' };
        row.revokedAt = new Date();
        row.supersededBy = pair.refresh.tokenHash;
        accessTokens.set(pair.access.tokenHash, { id: ++seq, ...pair.access, revokedAt: null });
        refreshTokens.set(pair.refresh.tokenHash, { id: ++seq, ...pair.refresh, revokedAt: null, supersededBy: null });
        return { tokens: { ...pair.plaintext, scope: decision.grant.scope, userId: decision.grant.userId } };
      });
    },

    async findAccessToken(tokenHash) { return accessTokens.get(tokenHash) || null; },

    async revokeToken(tokenHash) {
      const row = refreshTokens.get(tokenHash) || accessTokens.get(tokenHash);
      if (!row) return;
      for (const t of refreshTokens.values()) if (t.familyId === row.familyId && !t.revokedAt) t.revokedAt = new Date();
      for (const t of accessTokens.values())  if (t.familyId === row.familyId && !t.revokedAt) t.revokedAt = new Date();
    },

    async purgeExpired(now = new Date()) {
      for (const [k, v] of codes)         if (v.expiresAt < now) codes.delete(k);
      for (const [k, v] of accessTokens)  if (v.expiresAt < now) accessTokens.delete(k);
    },

    async close() { /* nothing to close */ },
  };
}

/* ===========================================================================
 * Row normalisation — pg gives snake_case, mysql2 gives snake_case, the memory
 * adapter already holds camelCase. Everything above the store sees camelCase,
 * so a driver swap changes nothing in oauth.routes.js.
 * ======================================================================== */

function toBool(v) { return v === true || v === 1 || v === '1' || v === 't' || v === 'true'; }

function splitList(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  const s = String(v).trim();
  // Accept a JSON array (Postgres jsonb / MySQL JSON) or a simple space- or
  // comma-separated list, because the seed row may be written either way.
  if (s.startsWith('[')) { try { return JSON.parse(s); } catch { /* fall through */ } }
  return s.split(/[\s,]+/).filter(Boolean);
}

function normaliseClient(r) {
  return {
    clientId: r.clientId ?? r.client_id,
    clientName: r.clientName ?? r.client_name,
    redirectUris: splitList(r.redirectUris ?? r.redirect_uris),
    isPublic: r.isPublic !== undefined ? !!r.isPublic : toBool(r.is_public),
    requirePkce: r.requirePkce !== undefined ? !!r.requirePkce : toBool(r.require_pkce),
    allowedScopes: splitList(r.allowedScopes ?? r.allowed_scopes),
  };
}

function normaliseCode(r) {
  if (r.codeHash) return r; // already camelCase (memory adapter)
  return {
    id: r.id,
    codeHash: r.code_hash,
    clientId: r.client_id,
    userId: String(r.user_id),
    redirectUri: r.redirect_uri,
    codeChallenge: r.code_challenge,
    codeChallengeMethod: r.code_challenge_method,
    scope: r.scope,
    expiresAt: new Date(r.expires_at),
    usedAt: r.used_at ? new Date(r.used_at) : null,
  };
}

function normaliseRefresh(r) {
  if (r.tokenHash) return r;
  return {
    id: r.id,
    tokenHash: r.token_hash,
    clientId: r.client_id,
    userId: String(r.user_id),
    scope: r.scope,
    familyId: r.family_id,
    expiresAt: new Date(r.expires_at),
    revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
    supersededBy: r.superseded_by || null,
  };
}

function normaliseAccess(r) {
  if (r.tokenHash) return r;
  return {
    id: r.id,
    tokenHash: r.token_hash,
    clientId: r.client_id,
    userId: String(r.user_id),
    scope: r.scope,
    familyId: r.family_id,
    expiresAt: new Date(r.expires_at),
    revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
  };
}

/* ===========================================================================
 * SEAM 1b — the factory.
 *
 * Call with nothing and it reads the environment. Call with `pool` and it uses
 * the portal's existing connection pool, which is what you want if the app
 * already has one: two pools against the same database is two sets of
 * connection limits to tune and two things to shut down.
 *
 *   const store = createOAuthStore({ pool: app.locals.db });   // reuse
 *   const store = createOAuthStore();                          // from env
 * ======================================================================== */

function createOAuthStore(options = {}) {
  const driver = options.driver || process.env.OAUTH_DB_DRIVER || 'pg';
  const config = {
    ...options,
    connectionString: options.connectionString || process.env.OAUTH_DATABASE_URL || process.env.DATABASE_URL,
    ttl: {
      accessTtlSeconds: Number(options.accessTtlSeconds || process.env.OAUTH_ACCESS_TOKEN_TTL || 3600),
      refreshTtlSeconds: Number(options.refreshTtlSeconds || process.env.OAUTH_REFRESH_TOKEN_TTL || 60 * 60 * 24 * 30),
    },
    revokeAccessTokensOnReuse: options.revokeAccessTokensOnReuse !== undefined
      ? options.revokeAccessTokensOnReuse
      : process.env.OAUTH_REVOKE_ACCESS_ON_REUSE === 'true',
  };

  if (driver === 'pg') return createPgStore(config);
  if (driver === 'mysql2' || driver === 'mysql') return createMysqlStore(config);
  if (driver === 'memory') {
    // WHY this guard: the memory adapter passes every conformance check, which
    // makes it dangerously easy to ship by accident. It would then lose every
    // session on deploy and break outright under pm2 cluster mode.
    if (process.env.NODE_ENV === 'production' && !options.allowMemoryInProduction) {
      throw new Error('OAUTH_DB_DRIVER=memory is not usable in production: tokens would not survive a restart and are not shared between workers.');
    }
    return createMemoryStore(config);
  }
  throw new Error(`Unknown OAUTH_DB_DRIVER '${driver}'. Expected 'pg', 'mysql2' or 'memory'.`);
}

module.exports = {
  createOAuthStore,
  hashToken,
  randomToken,
  newFamilyId,
  // exported for tests and for anyone writing a fourth adapter
  _adapters: { createPgStore, createMysqlStore, createMemoryStore },
};
