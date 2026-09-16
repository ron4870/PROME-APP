'use strict';

/**
 * OAuth 2.0 Authorization Code + PKCE for the PROME Intranet Portal.
 *
 * Mount it on the existing Express app:
 *
 *     const { createOAuthRouter } = require('./oauth/oauth.routes');
 *     const { createOAuthStore }  = require('./oauth/oauth.store');
 *
 *     app.use('/api/oauth', createOAuthRouter({
 *       store: createOAuthStore(),
 *       resolveBearerUser,   // SEAM 2 — see below
 *       loadUserProfile,     // SEAM 3 — see below
 *     }));
 *
 * Endpoints (paths shown as mounted at /api/oauth):
 *
 *   POST /api/oauth/authorize   Bearer-authenticated. Called by the SPA, not by
 *                               the desktop app. Returns { redirect_to }.
 *   POST /api/oauth/token       Public. authorization_code and refresh_token.
 *   POST /api/oauth/revoke      Public. RFC 7009. Always 200.
 *   GET  /api/oauth/userinfo    Bearer (an OAuth access token, not a portal JWT).
 *
 * -----------------------------------------------------------------------------
 * WHY /authorize IS A BEARER-AUTHENTICATED POST INSTEAD OF A BROWSER GET
 *
 * A textbook /oauth/authorize is a GET that relies on a browser *cookie
 * session* to know who is asking. This portal has no cookie session — the SPA
 * holds a JWT in client-side storage and sends it as `Authorization: Bearer`.
 * A GET arriving from a freshly opened browser tab therefore carries no
 * identity at all, and there is nothing for the server to read.
 *
 * So the authorize step is mediated by the SPA. The desktop app opens
 * https://ims.promeconsult.com/oauth/authorize?... in the system browser, nginx
 * serves the React app, a route at /oauth/authorize reads the query string,
 * signs the user in if needed, and then POSTs those same parameters here with
 * the portal JWT attached. The server answers with the URL to jump to, and the
 * page performs the jump itself.
 *
 * That last detail is not just convenience. nginx will not reliably emit a
 * `Location:` header for a non-HTTP scheme like `prome://` — depending on
 * version and proxy configuration it rewrites, mangles or refuses such a
 * header, and there is no configuration that makes it dependable across
 * upgrades. Doing the hand-off with window.location.replace() in the page keeps
 * the custom scheme entirely inside the browser, where it works, and means this
 * endpoint never has to emit a redirect at all.
 */

const express = require('express');
const { hashToken } = require('./oauth.store');
const pkce = require('./pkce');

/* ===========================================================================
 * SEAM 2 — "WHO IS THIS BEARER TOKEN?"
 *
 * POST /api/oauth/authorize must identify the signed-in portal user from the
 * SAME `Authorization: Bearer <jwt>` header that `GET /api/auth/me` already
 * accepts. This file deliberately does not know how that works: it does not
 * know the JWT secret, the algorithm, the claim that holds the user id, or
 * whether the portal validates tokens against a sessions table.
 *
 * WHAT TO CHANGE: pass your own `resolveBearerUser` into createOAuthRouter.
 * In almost every Express app of this shape, the portal already has an
 * `authenticate` / `requireAuth` middleware that sets `req.user`. If so, the
 * whole seam is:
 *
 *     const { authenticate } = require('../middleware/auth');
 *     createOAuthRouter({
 *       store,
 *       authorizeMiddleware: authenticate,                  // reuse it verbatim
 *       resolveBearerUser: async (req) => req.user || null,
 *     });
 *
 * Contract: return `{ id, name?, email?, ... }` for a valid token, or `null`
 * for anything else. NEVER throw for a bad token — throwing turns a routine
 * 401 into a 500 and the SPA cannot tell "sign in again" from "server broken".
 *
 * The default below is a last resort that verifies an HS256 JWT with
 * `jsonwebtoken` and process.env.JWT_SECRET. It is almost certainly not how
 * your portal does it. Replace it.
 * ======================================================================== */
function defaultResolveBearerUser(req) {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  try {
    // eslint-disable-next-line global-require
    const jwt = require('jsonwebtoken');
    const claims = jwt.verify(match[1], process.env.JWT_SECRET, {
      // WHY pin the algorithm: without `algorithms` a token signed with
      // alg:"none", or an HS256 token signed with a public RSA key, is accepted
      // by some versions. Pinning removes the whole class of bug.
      algorithms: [process.env.JWT_ALGORITHM || 'HS256'],
    });
    const id = claims.sub ?? claims.id ?? claims.userId ?? claims.user_id;
    if (id === undefined || id === null) return null;
    return { id: String(id), name: claims.name, email: claims.email, role: claims.role };
  } catch {
    return null; // expired, forged, wrong secret — all of them are just "not signed in"
  }
}

/* ===========================================================================
 * SEAM 3 — THE SHAPE OF A USER.
 *
 * The token response and /userinfo both describe the signed-in user, and this
 * file does not know the portal's `users` table. `loadUserProfile(userId)` is
 * called with the id that `resolveBearerUser` returned and must give back
 * whatever the desktop app should display.
 *
 * WHAT TO CHANGE: pass your own, e.g.
 *
 *     loadUserProfile: async (id) => {
 *       const u = await db.user.findById(id);         // your query
 *       return u && { id: u.id, name: u.full_name, email: u.email, role: u.role };
 *     };
 *
 * The default returns only the id, which is correct but thin — the desktop app
 * will show a blank name until you replace it.
 * ======================================================================== */
async function defaultLoadUserProfile(userId) {
  return { id: String(userId) };
}

/* ===========================================================================
 * Small helpers
 * ======================================================================== */

/**
 * WHY every response from this router is no-store:
 * RFC 6749 §5.1 requires it on token responses, but the same reasoning applies
 * to /authorize (its body contains an authorization code in a URL) and to
 * /userinfo. A caching proxy or a browser back-button that hands a second
 * person a cached token is the same breach either way. One helper, no
 * exceptions, nothing to forget.
 */
function noStore(res) {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  return res;
}

/** RFC 6749 §5.2 error body. The desktop app switches on `error`. */
function oauthError(res, status, error, description) {
  return noStore(res).status(status).json({
    error,
    ...(description ? { error_description: description } : {}),
  });
}

/**
 * Build the redirect URL back to the desktop app.
 *
 * WHY this is built with URLSearchParams and string concatenation rather than
 * `new URL()`: `prome://auth/callback` is an opaque, non-special scheme, and
 * WHATWG URL parsing of such schemes does not round-trip the path the way you
 * expect. The registered redirect_uri is an exact, known, trusted string at
 * this point, so appending a query to it is both simpler and safer.
 */
function callbackUrl(redirectUri, params) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') query.set(k, v);
  const joiner = redirectUri.includes('?') ? '&' : '?';
  return `${redirectUri}${joiner}${query.toString()}`;
}

/**
 * Rate limiting for /token and /revoke.
 *
 * WHY: /token is the one endpoint an unauthenticated attacker can hit with
 * unlimited guesses. The values it guesses are 256-bit random, so brute force
 * is hopeless — but the endpoint does a database round trip per call, which
 * makes it a cheap denial-of-service lever against the portal's own pool.
 *
 * WHERE TO PUT THE REAL ONE: this fixed-window counter is per-process and
 * resets on deploy. That is adequate for a single-process Node behind nginx,
 * and NOT adequate under pm2 cluster mode or two app servers. Replace it with
 * either
 *   (a) nginx, which already fronts this and is the cheapest place:
 *         limit_req_zone $binary_remote_addr zone=oauth_token:10m rate=10r/m;
 *         location /api/oauth/token { limit_req zone=oauth_token burst=20 nodelay; ... }
 *   (b) `express-rate-limit` with a Redis store, if you want the limit shared
 *       between workers and visible to the app.
 *
 * NOTE: req.ip is only the real client address if the app does
 * `app.set('trust proxy', 1)`. Without it every request appears to come from
 * 127.0.0.1 and this limiter throttles the whole portal at once.
 */
function createRateLimiter({ windowMs, max, enabled }) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    if (!enabled) return next();
    const now = Date.now();
    const key = req.ip || 'unknown';
    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Opportunistic sweep so the Map cannot grow without bound from a
      // rotating source address.
      if (hits.size > 10000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      // `invalid_request` rather than a bare 429 body, so the desktop app's
      // existing OAuth error handling still understands the shape.
      return oauthError(res, 429, 'invalid_request', 'too many requests; slow down');
    }
    return next();
  };
}

/* ===========================================================================
 * The authorize decision — shared by POST /authorize and by any GET shim.
 *
 * It returns a description of what should happen rather than doing it, so the
 * identical logic serves the JSON endpoint the SPA calls, the conformance
 * harness's auto-approving GET, and any future front-channel variant. There is
 * exactly one copy of these rules.
 * ======================================================================== */

/** @returns {{outcome:'error_page'|'redirect_error'|'ok', ...}} */
async function evaluateAuthorizeRequest({ store, params, config }) {
  const clientId = params.client_id;
  const redirectUri = params.redirect_uri;
  const state = params.state;

  // ---- 1. The client must exist. -----------------------------------------
  // WHY this refusal can never be a redirect: we have not yet established that
  // the supplied redirect_uri belongs to anybody. Bouncing the browser there to
  // "report the error" would make this endpoint an open redirect on the
  // portal's own domain — the classic phishing primitive, a link that really is
  // ims.promeconsult.com and really does send you somewhere else.
  if (!clientId) {
    return { outcome: 'error_page', status: 400, error: 'invalid_request', errorDescription: 'client_id is required' };
  }
  const client = await store.getClient(clientId);
  if (!client) {
    return { outcome: 'error_page', status: 400, error: 'invalid_client', errorDescription: 'unknown client_id' };
  }

  // ---- 2. redirect_uri: EXACT string match. ------------------------------
  // WHY exact, never a prefix and never a "starts with" or "same host": the
  // registered value is `prome://auth/callback`. A prefix rule accepts
  // `prome://auth/callback.evil.example` and `prome://auth/callbackX`; a host
  // rule accepts a different path on the same host. Every one of those is a
  // working authorization code delivered to somebody else. String equality has
  // no such edge cases, which is the entire reason to use it.
  if (!redirectUri) {
    return { outcome: 'error_page', status: 400, error: 'invalid_request', errorDescription: 'redirect_uri is required' };
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return { outcome: 'error_page', status: 400, error: 'invalid_request', errorDescription: 'redirect_uri does not match a registered value' };
  }

  // Past this line the redirect_uri is a registered one, so it is safe to send
  // errors back to it — which is what lets the desktop app show a real message
  // instead of hanging on a browser window that never comes back.

  // ---- 3. state. ---------------------------------------------------------
  // WHY required rather than merely recommended: state is how the desktop app
  // knows that the callback it just received belongs to the sign-in IT started,
  // and not to one an attacker started and then fed to the user. For a single
  // first-party public client there is no compatibility cost to insisting.
  if (config.requireState && !state) {
    return { outcome: 'redirect_error', redirectUri, state, error: 'invalid_request', errorDescription: 'state is required' };
  }

  // ---- 4. response_type. -------------------------------------------------
  // Only `code`. WHY no `token`: the implicit grant puts an access token in a
  // URL fragment, where it lands in browser history and in any referrer, and it
  // cannot be PKCE-protected. RFC 9700 §2.1.2 says do not implement it.
  if (params.response_type !== 'code') {
    return {
      outcome: 'redirect_error', redirectUri, state,
      error: 'unsupported_response_type',
      errorDescription: "only response_type=code is supported",
    };
  }

  // ---- 5. PKCE is REQUIRED for this client. ------------------------------
  // WHY required and not merely honoured-if-present: a desktop app registers a
  // custom URL scheme with the OS, and on both macOS and Windows a second
  // application can register the same scheme. Without PKCE, that application
  // receives the code and redeems it — nothing else in the flow proves the
  // redeemer is the app that started the sign-in. Tolerating a missing
  // challenge means an attacker simply omits it.
  const challenge = params.code_challenge;
  const method = params.code_challenge_method;
  if (client.requirePkce && !challenge) {
    return {
      outcome: 'redirect_error', redirectUri, state,
      error: 'invalid_request', errorDescription: 'code_challenge is required (PKCE, RFC 7636)',
    };
  }
  // WHY S256 only: with `plain` the challenge IS the verifier, travelling in a
  // URL through the browser, the OS handler chain and any proxy. Accepting
  // `plain` is accepting no PKCE while appearing to have it.
  if (challenge && method !== 'S256') {
    return {
      outcome: 'redirect_error', redirectUri, state,
      error: 'invalid_request',
      errorDescription: "code_challenge_method must be S256; 'plain' is not accepted",
    };
  }
  if (challenge && !pkce.isWellFormedChallenge(challenge)) {
    return {
      outcome: 'redirect_error', redirectUri, state,
      error: 'invalid_request', errorDescription: 'code_challenge is not a base64url SHA-256 digest',
    };
  }

  // ---- 6. scope. ---------------------------------------------------------
  const requested = String(params.scope || '').split(/\s+/).filter(Boolean);
  const scope = requested.length ? requested : config.defaultScopes.slice();
  const unknown = scope.filter((s) => !client.allowedScopes.includes(s));
  if (unknown.length) {
    return {
      outcome: 'redirect_error', redirectUri, state,
      error: 'invalid_scope', errorDescription: `unknown scope: ${unknown.join(' ')}`,
    };
  }

  return { outcome: 'ok', client, redirectUri, state, challenge, method: 'S256', scope: scope.join(' ') };
}

/**
 * Mint the authorization code for an already-approved request.
 * Separate from evaluation so the evaluation can be run without side effects.
 */
async function issueAuthorizationCode({ store, config, decision, userId }) {
  const { randomToken } = require('./oauth.store');
  const code = randomToken();
  await store.saveAuthorizationCode({
    codeHash: hashToken(code),
    clientId: decision.client.clientId,
    userId: String(userId),
    redirectUri: decision.redirectUri,
    codeChallenge: decision.challenge,
    codeChallengeMethod: decision.method,
    scope: decision.scope,
    // WHY 60 seconds: RFC 6749 §4.1.2 says a code SHOULD be short-lived and
    // RFC 9700 recommends one minute. The code only has to survive one local
    // HTTP round trip from the desktop app; a longer life buys nothing and
    // widens the window in which a code sitting in a browser history, an OS
    // URL-handler log or a crash report is still worth stealing.
    expiresAt: new Date(Date.now() + config.codeTtlSeconds * 1000),
  });
  return code;
}

/* ===========================================================================
 * The router
 * ======================================================================== */

function createOAuthRouter(options = {}) {
  if (!options.store) throw new Error('createOAuthRouter: `store` is required (see oauth.store.js)');

  const store = options.store;
  const resolveBearerUser = options.resolveBearerUser || defaultResolveBearerUser;   // SEAM 2
  const loadUserProfile = options.loadUserProfile || defaultLoadUserProfile;         // SEAM 3
  const authorizeMiddleware = options.authorizeMiddleware || ((req, res, next) => next());

  const config = {
    codeTtlSeconds: Number(options.codeTtlSeconds || process.env.OAUTH_CODE_TTL || 60),
    accessTtlSeconds: Number(options.accessTtlSeconds || process.env.OAUTH_ACCESS_TOKEN_TTL || 3600),
    defaultScopes: (options.defaultScopes || process.env.OAUTH_DEFAULT_SCOPES || 'profile').split(/[\s,]+/).filter(Boolean),
    requireState: options.requireState !== undefined
      ? options.requireState
      : process.env.OAUTH_REQUIRE_STATE !== 'false',
  };

  const rateLimit = createRateLimiter({
    windowMs: Number(options.rateLimitWindowMs || process.env.OAUTH_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(options.rateLimitMax || process.env.OAUTH_RATE_LIMIT_MAX || 60),
    enabled: options.rateLimit !== false && process.env.OAUTH_RATE_LIMIT_ENABLED !== 'false',
  });

  const router = express.Router();

  // Body parsing is mounted on the router itself so this drops in whether or
  // not the host app already parses bodies. body-parser marks `req._body` and
  // a second parser is a no-op, so there is no conflict either way.
  router.use(express.urlencoded({ extended: false, limit: '16kb' }));
  router.use(express.json({ limit: '16kb' }));

  /**
   * Express's urlencoded parser throws on a malformed body, and the default
   * error handler answers with an HTML 500. The desktop app parses JSON and
   * reads `error`, so a 500 with HTML in it reads as "the server is down" when
   * the truth is "you sent rubbish". Convert it here.
   */
  router.use((err, req, res, next) => {
    if (err && (err.type === 'entity.parse.failed' || err.type === 'entity.too.large' || err instanceof SyntaxError)) {
      return oauthError(res, 400, 'invalid_request', 'request body could not be parsed');
    }
    return next(err);
  });

  /* -------------------------------------------------------------------------
   * POST /api/oauth/authorize          (Bearer: the portal's own JWT)
   *
   * Called by the SPA page at /oauth/authorize, never by the desktop app.
   * Answers { redirect_to } and lets the page do window.location.replace().
   * ---------------------------------------------------------------------- */
  router.post('/authorize', authorizeMiddleware, async (req, res, next) => {
    try {
      const params = { ...req.query, ...req.body }; // body wins; query is accepted for convenience

      // The parameters are validated BEFORE we look at who is signed in. WHY:
      // a request from an unknown client or with an unregistered redirect_uri
      // must be refused identically whether or not anybody is logged in, so
      // that this endpoint cannot be used to probe session validity.
      const decision = await evaluateAuthorizeRequest({ store, params, config });

      if (decision.outcome === 'error_page') {
        // No `redirect_to` in this body — that absence is the signal to the SPA
        // to render an error rather than send the browser anywhere.
        return oauthError(res, decision.status, decision.error, decision.errorDescription);
      }
      if (decision.outcome === 'redirect_error') {
        return noStore(res).status(400).json({
          error: decision.error,
          error_description: decision.errorDescription,
          redirect_to: callbackUrl(decision.redirectUri, {
            error: decision.error, error_description: decision.errorDescription, state: decision.state,
          }),
        });
      }

      // SEAM 2 in use. A missing or invalid JWT is 401 with `login_required`,
      // which is the SPA's cue to show the portal login and come back.
      const user = await resolveBearerUser(req);
      if (!user || user.id === undefined || user.id === null) {
        return oauthError(res, 401, 'login_required', 'no valid session; sign in and retry');
      }

      const code = await issueAuthorizationCode({ store, config, decision, userId: user.id });

      return noStore(res).json({
        // The SPA does window.location.replace(redirect_to). See the header
        // comment: this is a JavaScript navigation precisely because nginx
        // cannot be trusted to pass a `Location:` with a prome:// scheme.
        redirect_to: callbackUrl(decision.redirectUri, { code, state: decision.state }),
        expires_in: config.codeTtlSeconds,
      });
    } catch (error) { return next(error); }
  });

  /* -------------------------------------------------------------------------
   * POST /api/oauth/token          (public client — no authentication)
   * ---------------------------------------------------------------------- */
  router.post('/token', rateLimit, async (req, res, next) => {
    try {
      const body = req.body || {};

      // ---- A public client must not present a secret. --------------------
      // WHY refuse rather than ignore: a desktop app ships as a downloadable
      // bundle, so any "secret" in it is public the moment someone unzips the
      // .app. Accepting one would let a deployment drift into believing the
      // secret authenticates anything. It does not, so it is rejected outright.
      //
      // WHY `invalid_request` and NOT `invalid_client`: `invalid_client` means
      // "your credentials were wrong", which would tell a client this endpoint
      // has credentials to get right, and would make a correctly-built public
      // client conclude it must find a secret. The truth is that the parameter
      // does not belong here at all, which is what `invalid_request` says.
      if (body.client_secret || req.get('authorization')) {
        return oauthError(res, 400, 'invalid_request',
          'this is a public client; client_secret and HTTP Basic client authentication are not accepted');
      }

      const grantType = body.grant_type;
      if (!grantType) return oauthError(res, 400, 'invalid_request', 'grant_type is required');

      if (grantType === 'authorization_code') return handleAuthorizationCodeGrant(req, res, body);
      if (grantType === 'refresh_token') return handleRefreshTokenGrant(req, res, body);

      return oauthError(res, 400, 'unsupported_grant_type', `grant_type '${grantType}' is not supported`);
    } catch (error) { return next(error); }
  });

  // GET is answered explicitly rather than falling through to a 404, because a
  // 405 with `Allow` tells a developer what they did wrong. Credentials in a
  // query string end up in nginx's access log, so GET is never acceptable here.
  router.get('/token', (req, res) => noStore(res).set('Allow', 'POST').status(405)
    .json({ error: 'invalid_request', error_description: 'the token endpoint is POST only' }));

  async function handleAuthorizationCodeGrant(req, res, body) {
    const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier } = body;

    // Static parameter checks first: they need no database round trip and they
    // reveal nothing about which codes exist.
    if (!code || !redirectUri || !clientId) {
      return oauthError(res, 400, 'invalid_request', 'code, redirect_uri and client_id are required');
    }
    const client = await store.getClient(clientId);
    if (!client) return oauthError(res, 400, 'invalid_client', 'unknown client_id');
    if (client.requirePkce && !verifier) {
      return oauthError(res, 400, 'invalid_request', 'code_verifier is required (PKCE, RFC 7636)');
    }

    // Everything from here happens inside one transaction with the code row
    // locked. `decide` is called with the row; whatever it returns, the store
    // commits atomically. The single-use rule is only a rule if the check and
    // the mark cannot be separated by a concurrent request.
    const now = new Date();
    const result = await store.redeemAuthorizationCode(hashToken(code), async (row) => {
      // WHY every one of these is `invalid_grant` with the same shape: the
      // desktop app must not be able to tell "no such code" from "expired" from
      // "already used" from "wrong verifier". Distinguishing them turns this
      // endpoint into an oracle that confirms a guessed or stolen code was real.
      if (!row) return { error: 'invalid_grant', errorDescription: 'authorization code is invalid or expired' };
      if (row.usedAt) {
        // Replay. RFC 9700 §4.1.2: a code presented twice means it leaked.
        // The row is already marked used, so the second caller gets nothing —
        // and a real deployment should raise an alert here.
        return { error: 'invalid_grant', errorDescription: 'authorization code is invalid or expired' };
      }
      if (row.expiresAt <= now) return { error: 'invalid_grant', errorDescription: 'authorization code is invalid or expired' };
      if (row.clientId !== clientId) return { error: 'invalid_grant', burn: true, errorDescription: 'authorization code is invalid or expired' };

      // RFC 6749 §4.1.3: the redirect_uri here must be identical to the one in
      // the authorization request. WHY it matters even though the code is
      // already bound to a user: it stops a code obtained for one registered
      // URI being redeemed as though it came back through another.
      if (row.redirectUri !== redirectUri) {
        return { error: 'invalid_grant', burn: true, errorDescription: 'authorization code is invalid or expired' };
      }

      // ---- PKCE. The check this whole design exists for. ----------------
      if (row.codeChallenge) {
        if (row.codeChallengeMethod !== 'S256') {
          return { error: 'invalid_grant', burn: true, errorDescription: 'authorization code is invalid or expired' };
        }
        if (!pkce.verifyS256(row.codeChallenge, verifier)) {
          // Burn it. A wrong verifier means the presenter is not the app that
          // began this sign-in — i.e. the code has been intercepted. Leaving it
          // redeemable would let the thief simply try again, and would let the
          // legitimate app succeed afterwards, hiding the theft entirely.
          return { error: 'invalid_grant', burn: true, errorDescription: 'authorization code is invalid or expired' };
        }
      }

      return { grant: { clientId: row.clientId, userId: row.userId, scope: row.scope } };
    });

    if (result.error) return oauthError(res, 400, result.error, result.errorDescription);
    return sendTokens(res, result.tokens);
  }

  async function handleRefreshTokenGrant(req, res, body) {
    const { refresh_token: refreshToken, client_id: clientId, scope: requestedScope } = body;
    if (!refreshToken || !clientId) {
      return oauthError(res, 400, 'invalid_request', 'refresh_token and client_id are required');
    }
    const client = await store.getClient(clientId);
    if (!client) return oauthError(res, 400, 'invalid_client', 'unknown client_id');

    const now = new Date();
    const result = await store.rotateRefreshToken(hashToken(refreshToken), async (row) => {
      if (!row) return { error: 'invalid_grant', errorDescription: 'refresh token is invalid, expired or revoked' };

      // ---- Reuse detection comes BEFORE the generic revoked check. -------
      // A rotated token is both revoked AND superseded. Testing `supersededBy`
      // first is what distinguishes "this token was replaced and somebody is
      // still using the old one" — theft — from "this was signed out". Get the
      // order wrong and rotation degrades to a plain refusal, which lets an
      // attacker who copied a refresh token keep trying until they win the race
      // against the real app.
      if (row.supersededBy) {
        return {
          error: 'invalid_grant', burn: true,
          errorDescription: 'refresh token is invalid, expired or revoked',
        };
      }
      if (row.revokedAt) return { error: 'invalid_grant', errorDescription: 'refresh token is invalid, expired or revoked' };
      if (row.expiresAt <= now) return { error: 'invalid_grant', errorDescription: 'refresh token is invalid, expired or revoked' };
      if (row.clientId !== clientId) return { error: 'invalid_grant', errorDescription: 'refresh token is invalid, expired or revoked' };

      // A refresh may narrow scope but never widen it (RFC 6749 §6).
      let scope = row.scope;
      if (requestedScope) {
        const want = String(requestedScope).split(/\s+/).filter(Boolean);
        const have = String(row.scope || '').split(/\s+/).filter(Boolean);
        if (want.some((s) => !have.includes(s))) {
          return { error: 'invalid_scope', errorDescription: 'a refresh cannot widen scope' };
        }
        scope = want.join(' ');
      }
      return { grant: { clientId: row.clientId, userId: row.userId, scope } };
    });

    if (result.error) {
      const status = result.error === 'invalid_scope' ? 400 : 400;
      return oauthError(res, status, result.error, result.errorDescription);
    }
    return sendTokens(res, result.tokens);
  }

  async function sendTokens(res, tokens) {
    const profile = await loadUserProfile(tokens.userId); // SEAM 3
    return noStore(res).json({
      access_token: tokens.accessToken,
      token_type: 'Bearer',
      expires_in: config.accessTtlSeconds,
      refresh_token: tokens.refreshToken,
      scope: tokens.scope,
      // Not part of RFC 6749, but it saves the desktop app a round trip on
      // every launch. /userinfo below is the standards-shaped equivalent.
      user: profile || { id: String(tokens.userId) },
    });
  }

  /* -------------------------------------------------------------------------
   * POST /api/oauth/revoke     RFC 7009
   * ---------------------------------------------------------------------- */
  router.post('/revoke', rateLimit, async (req, res, next) => {
    try {
      const token = (req.body || {}).token;
      if (token) {
        // Swallow failures deliberately: see the 200 below.
        try { await store.revokeToken(hashToken(token)); } catch { /* logged by the caller's error hook if wired */ }
      }
      // RFC 7009 §2.2: 200 for an unknown, already-revoked or malformed token.
      // WHY it must be unconditional: any other answer makes this endpoint a
      // free oracle for testing whether a stolen string is a live token.
      return noStore(res).status(200).json({});
    } catch (error) { return next(error); }
  });

  /* -------------------------------------------------------------------------
   * GET /api/oauth/userinfo    (Bearer: an OAuth ACCESS token from /token,
   *                             NOT the portal's own JWT)
   * ---------------------------------------------------------------------- */
  router.get('/userinfo', async (req, res, next) => {
    try {
      const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
      if (!match) {
        return noStore(res).set('WWW-Authenticate', 'Bearer').status(401)
          .json({ error: 'invalid_token', error_description: 'a Bearer access token is required' });
      }
      const row = await store.findAccessToken(hashToken(match[1].trim()));
      const bad = !row || row.revokedAt || row.expiresAt <= new Date();
      if (bad) {
        // RFC 6750 §3.1: 401 invalid_token, and the same answer for expired,
        // revoked and never-existed so this cannot be used to enumerate.
        return noStore(res).set('WWW-Authenticate', 'Bearer error="invalid_token"').status(401)
          .json({ error: 'invalid_token', error_description: 'the access token is invalid or expired' });
      }
      const profile = (await loadUserProfile(row.userId)) || { id: String(row.userId) }; // SEAM 3
      return noStore(res).json({
        sub: String(row.userId),
        ...profile,
        scope: row.scope,
      });
    } catch (error) { return next(error); }
  });

  /**
   * Last-resort error handler for this router only.
   * WHY: without it, a dropped database connection becomes Express's HTML 500
   * page, and the desktop app — which parses JSON — reports it as a protocol
   * error. `server_error` is a documented OAuth code the app already handles.
   */
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    // Never let a token, a code or a verifier reach the log line. The query
    // string is cut off deliberately: /authorize accepts its parameters there,
    // and a stray ?code= in an access log is a credential sitting in plain text
    // on disk, readable by anyone who can read logs. The error message alone is
    // enough to debug with.
    // eslint-disable-next-line no-console
    console.error('[oauth] unhandled error on %s %s: %s',
      req.method, String(req.originalUrl || '').split('?')[0], err && err.message);
    if (res.headersSent) return;
    noStore(res).status(500).json({ error: 'server_error', error_description: 'the authorization server failed to process the request' });
  });

  // Exposed so a test harness (or a future front-channel route) can reuse the
  // exact same rules rather than a second copy of them.
  router.evaluateAuthorizeRequest = (params) => evaluateAuthorizeRequest({ store, params, config });
  router.issueAuthorizationCode = (decision, userId) => issueAuthorizationCode({ store, config, decision, userId });
  router.callbackUrl = callbackUrl;

  return router;
}

module.exports = {
  createOAuthRouter,
  evaluateAuthorizeRequest,
  issueAuthorizationCode,
  callbackUrl,
  defaultResolveBearerUser,
  defaultLoadUserProfile,
};
