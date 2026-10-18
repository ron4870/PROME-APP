-- =============================================================================
--  001_oauth.sql  —  PostgreSQL
--
--  OAuth 2.0 + PKCE storage for the PROME Intranet Portal.
--  Apply with:  psql "$OAUTH_DATABASE_URL" -v ON_ERROR_STOP=1 -f 001_oauth.sql
--
--  Nothing here touches an existing table. All four objects are new and
--  prefixed `oauth_`, so this is safe to run against the live portal database.
--
--  NOTE ON user_id: it is TEXT, not a foreign key to your users table. That is
--  deliberate — this file does not know whether your primary key is an integer,
--  a uuid or a string, and a wrong FK type fails the migration on a production
--  box at the worst possible moment. If you want referential integrity, add it
--  once you know the type:
--     ALTER TABLE oauth_authorization_codes
--       ADD CONSTRAINT fk_oauth_code_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
--  (and the same for the two token tables). Cascading delete is the useful part:
--  deleting a user should end their desktop sessions.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Registered clients. There will be exactly one row for a long time.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id      TEXT PRIMARY KEY,
  client_name    TEXT        NOT NULL,
  -- A whitespace- or comma-separated list. Every value here is compared by
  -- EXACT STRING EQUALITY at /authorize; there is no pattern syntax and adding
  -- one would reintroduce the open-redirect hole this design avoids.
  redirect_uris  TEXT        NOT NULL,
  -- TRUE means "ships to end users and therefore cannot keep a secret".
  -- A public client has no client_secret column for the same reason: a column
  -- that exists is a column somebody eventually fills in.
  is_public      BOOLEAN     NOT NULL DEFAULT TRUE,
  require_pkce   BOOLEAN     NOT NULL DEFAULT TRUE,
  allowed_scopes TEXT        NOT NULL DEFAULT 'profile',
  disabled_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Authorization codes. Short-lived, single-use.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id                    BIGSERIAL PRIMARY KEY,
  -- SHA-256 hex of the code. The code itself is NEVER stored: a dump of this
  -- table must not let anyone redeem anything.
  --
  -- UNIQUE is load-bearing, not tidiness. Single use is enforced by locking one
  -- row and marking it; if two rows could share a code_hash, two concurrent
  -- redemptions would lock DIFFERENT rows, both see used_at IS NULL, and both
  -- get tokens. The constraint is what guarantees there is exactly one row to
  -- serialise on.
  code_hash             CHAR(64)    NOT NULL UNIQUE,
  client_id             TEXT        NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  user_id               TEXT        NOT NULL,
  redirect_uri          TEXT        NOT NULL,
  code_challenge        CHAR(43),
  code_challenge_method TEXT        NOT NULL DEFAULT 'S256'
                                    CHECK (code_challenge_method = 'S256'),
  scope                 TEXT        NOT NULL DEFAULT 'profile',
  expires_at            TIMESTAMPTZ NOT NULL,
  -- NULL means unused. The redemption query says `WHERE id = $1 AND used_at IS
  -- NULL`, so this column IS the single-use flag; do not replace it with a
  -- DELETE, because keeping the used row is what makes a replay attempt
  -- visible rather than merely unsuccessful.
  used_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_authorization_codes (expires_at);

-- -----------------------------------------------------------------------------
-- Refresh tokens. Rotated on every use; `family_id` groups a whole chain.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id            BIGSERIAL PRIMARY KEY,
  token_hash    CHAR(64)    NOT NULL UNIQUE,
  client_id     TEXT        NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  user_id       TEXT        NOT NULL,
  scope         TEXT        NOT NULL DEFAULT 'profile',
  -- Every token descended from one authorization code shares this. Reuse of a
  -- superseded token revokes the family in a single UPDATE, which is why this
  -- is a column and not a linked list walk: walking `superseded_by` one row at
  -- a time is N queries and can be raced part-way through.
  family_id     TEXT        NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  -- Set to the successor's token_hash at rotation. Its presence is how the
  -- server tells "this was rotated and someone is replaying the old one"
  -- (theft) from "this was signed out" (routine).
  superseded_by CHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_family  ON oauth_refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_user    ON oauth_refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_expires ON oauth_refresh_tokens (expires_at);

-- -----------------------------------------------------------------------------
-- Access tokens. Opaque and hashed, so Sign Out can end them immediately.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id         BIGSERIAL PRIMARY KEY,
  token_hash CHAR(64)    NOT NULL UNIQUE,
  client_id  TEXT        NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL,
  scope      TEXT        NOT NULL DEFAULT 'profile',
  -- Same family as the refresh token it was issued beside, so revoking the
  -- family kills the live access token too instead of leaving it valid for up
  -- to another hour after Sign Out.
  family_id  TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_access_family  ON oauth_access_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_oauth_access_expires ON oauth_access_tokens (expires_at);

-- -----------------------------------------------------------------------------
-- The one client row. redirect_uri is EXACTLY this string, including the
-- absence of a trailing slash — the desktop app must send it byte for byte.
-- -----------------------------------------------------------------------------
INSERT INTO oauth_clients (client_id, client_name, redirect_uris, is_public, require_pkce, allowed_scopes)
VALUES ('prome-desktop', 'Prome Suite (macOS)', 'prome://auth/callback', TRUE, TRUE, 'profile')
ON CONFLICT (client_id) DO NOTHING;

COMMIT;

-- =============================================================================
-- Housekeeping. Expired rows are harmless but they are not free.
-- Run from cron, or from pg_cron if you have it:
--
--   DELETE FROM oauth_authorization_codes WHERE expires_at < now() - interval '1 day';
--   DELETE FROM oauth_access_tokens       WHERE expires_at < now() - interval '7 days';
--   DELETE FROM oauth_refresh_tokens      WHERE expires_at < now() - interval '30 days';
--
-- store.purgeExpired() runs exactly these.
-- =============================================================================
