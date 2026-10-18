-- =============================================================================
--  001_oauth.mysql.sql  —  MySQL 8 / MariaDB 10.5+
--
--  The MySQL twin of 001_oauth.sql. Apply ONE of the two, not both.
--    mysql --user=... --password --database=ims < 001_oauth.mysql.sql
--
--  Differences from the PostgreSQL file, and why:
--    * InnoDB is required, not optional. The single-use rule rests on
--      SELECT ... FOR UPDATE taking a row lock; MyISAM has no row locks and no
--      transactions, so on MyISAM two concurrent redemptions of one code both
--      succeed. This is the difference between working and only appearing to.
--    * DATETIME(3) in UTC rather than TIMESTAMPTZ. MySQL's TIMESTAMP type is
--      range-limited and silently converts through the session time zone;
--      DATETIME(3) plus writing UTC_TIMESTAMP(3) everywhere keeps expiry
--      arithmetic independent of whatever @@time_zone the app connects with.
--    * utf8mb4 / *_bin collation on the hash and id columns. A case-INSENSITIVE
--      collation (MySQL's default) would make two different hex hashes compare
--      equal, which would let a lookup match the wrong row. `ascii_bin` makes
--      the comparison byte-exact.
--    * No DDL transaction. MySQL commits implicitly on every CREATE TABLE, so
--      if this file fails half way it leaves the tables it already made. Re-run
--      it — every statement is IF NOT EXISTS / INSERT IGNORE and idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id      VARCHAR(128)  NOT NULL,
  client_name    VARCHAR(255)  NOT NULL,
  -- Whitespace- or comma-separated. Compared by EXACT STRING EQUALITY only.
  redirect_uris  TEXT          NOT NULL,
  is_public      TINYINT(1)    NOT NULL DEFAULT 1,
  require_pkce   TINYINT(1)    NOT NULL DEFAULT 1,
  allowed_scopes VARCHAR(255)  NOT NULL DEFAULT 'profile',
  disabled_at    DATETIME(3)   NULL,
  created_at     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- SHA-256 hex. The code itself is never stored.
  --
  -- The UNIQUE key is what makes single use enforceable: it guarantees exactly
  -- one row per code, so SELECT ... FOR UPDATE serialises two concurrent
  -- redemptions onto the same lock instead of letting them lock separate rows
  -- and both succeed.
  code_hash             CHAR(64)  CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  client_id             VARCHAR(128) NOT NULL,
  user_id               VARCHAR(128) NOT NULL,
  redirect_uri          TEXT         NOT NULL,
  code_challenge        CHAR(43)  CHARACTER SET ascii COLLATE ascii_bin NULL,
  code_challenge_method VARCHAR(8)   NOT NULL DEFAULT 'S256',
  scope                 VARCHAR(255) NOT NULL DEFAULT 'profile',
  expires_at            DATETIME(3)  NOT NULL,
  -- NULL means unused; this column IS the single-use flag.
  used_at               DATETIME(3)  NULL,
  created_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_codes_hash (code_hash),
  KEY idx_oauth_codes_expires (expires_at),
  CONSTRAINT fk_oauth_codes_client FOREIGN KEY (client_id)
    REFERENCES oauth_clients (client_id) ON DELETE CASCADE,
  -- MariaDB < 10.2.1 and MySQL < 8.0.16 parse CHECK and ignore it. Harmless
  -- there; the application refuses anything but S256 regardless.
  CONSTRAINT chk_oauth_codes_s256 CHECK (code_challenge_method = 'S256')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash    CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  client_id     VARCHAR(128) NOT NULL,
  user_id       VARCHAR(128) NOT NULL,
  scope         VARCHAR(255) NOT NULL DEFAULT 'profile',
  -- One value per authorization code. Reuse of a superseded token revokes the
  -- whole family in one UPDATE.
  family_id     VARCHAR(64)  CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at    DATETIME(3)  NOT NULL,
  revoked_at    DATETIME(3)  NULL,
  -- Successor's token_hash. Its presence distinguishes theft from sign-out.
  superseded_by CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_refresh_hash (token_hash),
  KEY idx_oauth_refresh_family (family_id),
  KEY idx_oauth_refresh_user (user_id),
  KEY idx_oauth_refresh_expires (expires_at),
  CONSTRAINT fk_oauth_refresh_client FOREIGN KEY (client_id)
    REFERENCES oauth_clients (client_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  client_id  VARCHAR(128) NOT NULL,
  user_id    VARCHAR(128) NOT NULL,
  scope      VARCHAR(255) NOT NULL DEFAULT 'profile',
  family_id  VARCHAR(64)  CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(3)  NOT NULL,
  revoked_at DATETIME(3)  NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_access_hash (token_hash),
  KEY idx_oauth_access_family (family_id),
  KEY idx_oauth_access_expires (expires_at),
  CONSTRAINT fk_oauth_access_client FOREIGN KEY (client_id)
    REFERENCES oauth_clients (client_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- The one client row. `prome://auth/callback` byte for byte.
INSERT IGNORE INTO oauth_clients
  (client_id, client_name, redirect_uris, is_public, require_pkce, allowed_scopes)
VALUES
  ('prome-desktop', 'Prome Suite (macOS)', 'prome://auth/callback', 1, 1, 'profile');

-- =============================================================================
-- Housekeeping (cron, or a MySQL EVENT):
--   DELETE FROM oauth_authorization_codes WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 1 DAY;
--   DELETE FROM oauth_access_tokens       WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 7 DAY;
--   DELETE FROM oauth_refresh_tokens      WHERE expires_at < UTC_TIMESTAMP(3) - INTERVAL 30 DAY;
-- store.purgeExpired() runs exactly these.
-- =============================================================================
