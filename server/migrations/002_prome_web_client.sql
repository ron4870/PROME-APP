-- =============================================================================
-- The web version of Prome Suite (https://app.promeconsult.com) as a client of
-- its own: public (no secret: a web page can keep one no better than a desktop
-- app), PKCE required, and its one redirect is the site's /auth/callback —
-- byte for byte, no trailing slash. The desktop's `prome-desktop` row is not
-- touched. Idempotent: running it twice changes nothing.
--
-- PostgreSQL. The MySQL version is 002_prome_web_client.mysql.sql.
-- =============================================================================
BEGIN;

INSERT INTO oauth_clients (client_id, client_name, redirect_uris, is_public, require_pkce, allowed_scopes)
VALUES ('prome-web', 'Prome Suite (web)', 'https://app.promeconsult.com/auth/callback', TRUE, TRUE, 'profile')
ON CONFLICT (client_id) DO NOTHING;

COMMIT;
