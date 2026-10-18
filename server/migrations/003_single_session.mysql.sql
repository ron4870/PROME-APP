-- =============================================================================
-- One session per person across Prome Suite: why a token was revoked. See
-- 003_single_session.sql. MySQL 8 has no ADD COLUMN IF NOT EXISTS, so run
-- this once; a second run reports the columns already exist and changes
-- nothing.
-- =============================================================================
ALTER TABLE oauth_refresh_tokens ADD COLUMN revoked_reason VARCHAR(32) NULL;
ALTER TABLE oauth_access_tokens  ADD COLUMN revoked_reason VARCHAR(32) NULL;
CREATE INDEX idx_oauth_refresh_user ON oauth_refresh_tokens (user_id, client_id);
CREATE INDEX idx_oauth_access_user  ON oauth_access_tokens  (user_id, client_id);
