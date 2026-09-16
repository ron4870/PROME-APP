# OAuth 2.0 + PKCE for the PROME Intranet Portal

Desktop sign-in for the macOS Prome Suite app, as four endpoints on the existing
Express API plus one React route on the existing SPA.

Nothing here modifies an existing table, route or middleware. The four new
tables are all prefixed `oauth_`; the router mounts at a path that does not yet
exist.

---

## 1. Mount the router — exactly where

In whichever file builds the Express app (usually `src/app.js`, `src/server.js`
or `index.js`), beside the other `app.use('/api/...')` lines:

```js
const { createOAuthRouter } = require('./oauth/oauth.routes');
const { createOAuthStore }  = require('./oauth/oauth.store');

const oauthStore = createOAuthStore({
  // Hand it the portal's existing pool if there is one. Otherwise it builds
  // its own from OAUTH_DB_DRIVER + OAUTH_DATABASE_URL.
  // pool: db,
});

app.use('/api/oauth', createOAuthRouter({
  store: oauthStore,

  // SEAM 2 — reuse the portal's own auth middleware verbatim.
  authorizeMiddleware: authenticate,
  resolveBearerUser: async (req) => req.user || null,

  // SEAM 3 — the shape of a user, for the token response and /userinfo.
  loadUserProfile: async (id) => {
    const u = await User.findByPk(id);           // your query
    return u && { id: u.id, name: u.name, email: u.email, role: u.role };
  },
}));
```

Two things about placement:

* **Mount it before any catch-all 404 handler** and before anything that
  requires authentication globally. `/api/oauth/token` and `/api/oauth/revoke`
  are called by the desktop app with no session at all — if a global
  `requireAuth` runs first, the desktop app can never get its first token.
* **`app.set('trust proxy', 1)`** if it is not already set. nginx fronts this;
  without it `req.ip` is always `127.0.0.1` and the rate limiter buckets the
  whole portal into one counter.

Body parsing is mounted on the router itself, so this works whether or not the
host app already parses bodies — `body-parser` marks the request and a second
parser is a no-op.

### The endpoints this creates

| Method | Path | Auth | Called by |
|---|---|---|---|
| POST | `/api/oauth/authorize` | Bearer — the **portal's JWT** | the SPA page below |
| POST | `/api/oauth/token` | none (public client) | the desktop app |
| POST | `/api/oauth/revoke` | none | the desktop app, on Sign Out |
| GET | `/api/oauth/userinfo` | Bearer — an **OAuth access token** | the desktop app |

---

## 2. Apply the migration and seed the client row

Pick the file that matches your database. Apply one, not both.

```bash
# PostgreSQL
psql "$OAUTH_DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_oauth.sql

# MySQL / MariaDB
mysql --user=... --password --database=ims < migrations/001_oauth.mysql.sql
```

**The client row is seeded by the migration itself** — the last statement in
each file. There is no separate seed step. To check it landed:

```sql
SELECT client_id, redirect_uris, is_public, require_pkce FROM oauth_clients;
--  prome-desktop | prome://auth/callback | t | t
```

`redirect_uris` is compared by **exact string equality** at `/authorize`. There
is no pattern syntax and adding one would reintroduce the open-redirect hole
this design exists to avoid. `prome://auth/callback` — no trailing slash, no
trailing space. The desktop app must send that byte for byte.

To register a second callback later, make it a space-separated list:
`'prome://auth/callback prome://auth/callback2'`. Each entry is still matched
whole.

---

## 3. Environment

See `.env.example` for all of it, commented. The short version:

| Variable | Default | Notes |
|---|---|---|
| `OAUTH_DB_DRIVER` | `pg` | `pg` \| `mysql2` \| `memory`. **The one decision.** |
| `OAUTH_DATABASE_URL` | falls back to `DATABASE_URL` | unnecessary if you pass `pool` |
| `OAUTH_CODE_TTL` | `60` | seconds |
| `OAUTH_ACCESS_TOKEN_TTL` | `3600` | seconds |
| `OAUTH_REFRESH_TOKEN_TTL` | `2592000` | 30 days — this is "stay signed in" |
| `OAUTH_DEFAULT_SCOPES` | `profile` | |
| `OAUTH_REQUIRE_STATE` | `true` | leave it on |
| `OAUTH_REVOKE_ACCESS_ON_REUSE` | `false` | see `.env.example` §3 |
| `OAUTH_RATE_LIMIT_MAX` | `60` | per minute per IP |

`memory` is for development and the conformance suite only. It refuses to start
when `NODE_ENV=production`.

---

## 4. The SPA route

Copy `spa/OAuthAuthorize.jsx` into the React app and route it:

```jsx
<Route path="/oauth/authorize" element={<OAuthAuthorize />} />
```

It has **two seams**, both marked in the file:

* **SEAM 4** `getPortalToken()` — how this SPA stores its JWT. The default tries
  the usual `localStorage` keys, which will probably work, but replace it with
  the one line your app already uses.
* **SEAM 5** `goToLogin()` — how to send the user to the portal login and get
  them back on **this URL with the query string intact**. If your login screen
  always lands on the dashboard, fix that first: the flow loops forever
  otherwise and the desktop app never receives its code.

The page has no UI-kit dependency — plain React, `fetch`, inline styles. Restyle
the three render branches at the bottom; nothing above them cares.

---

## 5. nginx — three lines

```nginx
# 1. /oauth/authorize is a SPA ROUTE, not an API path. Serve index.html.
location = /oauth/authorize { try_files $uri /index.html; }

# 2. The API proxy you already have. Nothing about it changes.
location /api/ { proxy_pass http://127.0.0.1:3000; }

# 3. Rate-limit the token endpoint here rather than in Node — it is cheaper,
#    and it is shared across workers, which the in-process limiter is not.
#    (with `limit_req_zone $binary_remote_addr zone=oauth_token:10m rate=10r/m;` in http{})
location = /api/oauth/token { limit_req zone=oauth_token burst=20 nodelay; proxy_pass http://127.0.0.1:3000; }
```

**There is no `proxy_redirect` rule, and none is needed.** The hand-off to
`prome://auth/callback` is done by `window.location.replace()` inside the SPA,
never by a `Location:` header. That is deliberate: nginx does not reliably pass
a `Location:` header carrying a non-HTTP scheme — depending on version,
`proxy_redirect` settings and whether the response came from an upstream or a
`return`, a `prome://` Location is rewritten, prefixed with the server's own
scheme and host, or dropped entirely, and there is no configuration that makes
it dependable across an upgrade. Keeping the custom scheme inside JavaScript
sidesteps the whole question.

---

## 6. Design decisions, and why

### CommonJS, not ESM

This is a drop-in for a codebase we cannot see. An Express 4 app with
`x-powered-by: Express` on every response is CommonJS far more often than not,
and the interop is asymmetric: CommonJS can be `require`d from an ESM file (or
reached through `createRequire`), while an ESM file **cannot** be `require`d
from CommonJS at all. Shipping CJS means it drops into either kind of project.
Shipping ESM would mean it drops into exactly one.

If the portal turns out to be `"type": "module"`, `import { createOAuthRouter }
from './oauth/oauth.routes.js'` works unchanged — Node's CJS-named-exports
interop handles this file's `module.exports` object fine.

### Opaque random tokens, not JWTs

`jsonwebtoken` is already in most portals of this shape and it was available, so
this is a choice rather than a constraint.

A JWT access token cannot be revoked before it expires without a denylist — and
a denylist is a database lookup on every API call, which is the cost a JWT was
meant to avoid, plus a second source of truth that can disagree with the first.
This deployment needs Sign Out to actually end a session, and needs
refresh-token-reuse detection to kill a whole token family instantly. Both want
the lookup anyway.

So: 32 bytes from `crypto.randomBytes`, base64url, stored as a SHA-256 hex hash
with a UNIQUE index. It is simpler to read, strictly more revocable, leaks
nothing if it turns up in a log, and has no `alg` confusion CVE in its future.

The portal's own `/api/auth/*` JWTs are untouched. These are a separate
credential belonging to the desktop app.

### Everything is stored hashed

Authorization codes, access tokens and refresh tokens are bearer secrets: the
string *is* the identity. They are also used by machines at high frequency, so
bcrypt on every API call is not affordable. SHA-256 of a 256-bit random value is
the right trade — full entropy means no dictionary to attack and no need for a
salt — and a dump of these tables yields nothing redeemable.

The plaintext exists only in the HTTP response that issues it, and is never
written to a column or a log line.

### The security order in `/token`

The order of checks is the security. It is, in `oauth.routes.js`:

1. a `client_secret` or `Authorization` header is refused outright — this is a
   public client (answered `invalid_request`, **not** `invalid_client`: the
   parameter does not belong here at all, and saying `invalid_client` would tell
   a correctly-built public client to go and find a secret);
2. `grant_type` must be present and supported;
3. static parameters present — no database round trip for a malformed request;
4. `client_id` known;
5. then, **inside one transaction with the code row locked**: code exists → not
   used → not expired → client matches → `redirect_uri` matches → PKCE verifies
   → mark used → insert tokens → commit.

Every failure in step 5 answers the same `invalid_grant` with the same
description. Distinguishing "no such code" from "expired" from "already used"
from "wrong verifier" would turn the endpoint into an oracle confirming that a
guessed or stolen code was real.

A failed PKCE check, a client mismatch and a `redirect_uri` mismatch all **burn
the code**. A wrong verifier means the presenter is not the app that started the
sign-in — leaving the code redeemable would let the thief retry, and would let
the legitimate app succeed afterwards, hiding the theft completely.

### Refresh rotation and families

Every refresh token carries a `family_id`, shared by everything descended from
one authorization code. Rotation sets `revoked_at` **and** `superseded_by` on
the presented token in the same transaction that mints its successor.

Reuse of a superseded token revokes the whole family in one `UPDATE`. The check
for `superseded_by` comes **before** the generic `revoked_at` check, and that
order matters: a rotated token is both. Testing `superseded_by` first is what
distinguishes "someone is replaying a token that was already replaced" — theft —
from "this was signed out". Get it the wrong way round and rotation degrades to
a plain refusal, which lets an attacker who copied a refresh token keep trying
until they win the race against the real app.

---

## 7. Running the conformance suite

The suite is `conformance/conformance.mjs` from the handoff bundle. It needs
nothing installed.

```bash
npm install express pg          # or: express mysql2

# memory driver — no database needed
node test/harness.js --driver memory --port 8799 &
node conformance.mjs --base http://localhost:8799 --auto

# against a real PostgreSQL
psql "$OAUTH_DATABASE_URL" -f migrations/001_oauth.sql
OAUTH_DATABASE_URL=... node test/harness.js --driver pg --port 8801 &
node conformance.mjs --base http://localhost:8801 --auto
```

Expected: **34 passed, 0 failed, 1 skipped**. The skip is the HTTPS check, which
correctly refuses to pass on a loopback address.

`test/harness.js` is **test-only and must not be deployed**. It contains three
things the real server does not have, each marked `TEST-ONLY`: a stub for
SEAM 2, an auto-approving `GET /oauth/authorize` so `--auto` can run unattended,
and a mount of the router at `/oauth` as well as `/api/oauth` so the suite's
default paths resolve. The auto-approving GET calls the same
`evaluateAuthorizeRequest()` the production POST endpoint calls, so what the
suite exercises is the production decision logic — its only invention is
deciding, without asking, that a user is signed in.

To run the suite against the deployed server instead, point it at the real
paths:

```bash
node conformance.mjs \
  --base      https://ims.promeconsult.com \
  --authorize https://ims.promeconsult.com/oauth/authorize \
  --token     https://ims.promeconsult.com/api/oauth/token \
  --revoke    https://ims.promeconsult.com/api/oauth/revoke \
  --userinfo  https://ims.promeconsult.com/api/oauth/userinfo \
  --interactive
```

(Or add `location = /oauth/token { proxy_pass http://127.0.0.1:3000/api/oauth/token; }`
and friends to nginx, and the bare `--base` form works.)

---

## 8. The five seams, in one place

| # | File | What it is | If you skip it |
|---|---|---|---|
| 1 | `oauth.store.js` | which database driver | throws on the first query |
| 2 | `oauth.routes.js` | verifying the portal's JWT | falls back to HS256 + `JWT_SECRET`; probably wrong |
| 3 | `oauth.routes.js` | the shape of a user row | the desktop app shows a blank name |
| 4 | `spa/OAuthAuthorize.jsx` | reading the stored JWT | guesses common `localStorage` keys |
| 5 | `spa/OAuthAuthorize.jsx` | login round trip | the flow loops and never returns a code |

Seam 1 has a working default only in the sense that it defaults to `pg`. The
other four have defaults that will run; three of them will run *wrongly* against
a portal that does something else. Read each one.
