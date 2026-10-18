-- =============================================================================
-- One session per person across Prome Suite (src/oauth/oauth.store.js, ONE
-- SESSION PER PERSON): why a token was revoked, so the app on the computer a
-- newer login replaced can tell its user "you logged in on another computer"
-- rather than only "your session has ended". NULL for every other revocation.
--
-- PostgreSQL. The MySQL version is 003_single_session.mysql.sql. Idempotent.
-- Run it before deploying the updated oauth.store.js / oauth.routes.js; the
-- code works without it too, without the reason.
-- =============================================================================
BEGIN;

ALTER TABLE oauth_refresh_tokens ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
ALTER TABLE oauth_access_tokens  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

-- The query a login runs to end the person's other sessions.
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_user_live ON oauth_refresh_tokens (user_id, client_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_access_user_live  ON oauth_access_tokens  (user_id, client_id) WHERE revoked_at IS NULL;

COMMIT;
