-- =============================================================================
-- The web version of Prome Suite (https://app.promeconsult.com) as a client of
-- its own: public, PKCE required, its one redirect the site's /auth/callback,
-- byte for byte. See 002_prome_web_client.sql. Idempotent.
-- =============================================================================
INSERT IGNORE INTO oauth_clients
  (client_id, client_name, redirect_uris, is_public, require_pkce, allowed_scopes)
VALUES
  ('prome-web', 'Prome Suite (web)', 'https://app.promeconsult.com/auth/callback', 1, 1, 'profile');
