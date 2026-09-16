'use strict';

/**
 * PKCE (RFC 7636) — S256 only.
 *
 * WHY this is its own file: it is twenty lines, it is the single check that
 * stands between a stolen authorization code and a stolen account, and an
 * auditor should be able to read the whole of it on one screen without also
 * reading a router.
 *
 * WHY S256 only, never `plain`: with `plain` the "challenge" sent up the front
 * channel IS the verifier. Anything that can see the authorize request — a
 * browser extension, a corporate TLS-terminating proxy, a shoulder — learns
 * the secret and can redeem a code it intercepts. The hash is the entire
 * point; accepting `plain` silently turns PKCE off.
 */

const { createHash, timingSafeEqual } = require('node:crypto');

/** base64url per RFC 7636 §A: base64, `+`->`-`, `/`->`_`, no padding. */
function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The verifier is a high-entropy ASCII string, 43..128 chars, from the
 * unreserved set. WHY bother range-checking it: a one-character verifier
 * hashes to a perfectly valid-looking challenge, so without this a client
 * could "use PKCE" with a value an attacker can brute-force offline in
 * milliseconds. RFC 7636 §4.1 sets the floor at 43 characters.
 */
const VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;

function isWellFormedVerifier(verifier) {
  return typeof verifier === 'string' && VERIFIER_RE.test(verifier);
}

/**
 * A challenge is base64url of a 32-byte SHA-256 digest: exactly 43 chars.
 * WHY check the shape at /authorize time rather than only at /token time: a
 * malformed challenge cannot ever be satisfied, so issuing a code for it just
 * produces a confusing failure one round-trip later.
 */
const CHALLENGE_RE = /^[A-Za-z0-9\-._~]{43}$/;

function isWellFormedChallenge(challenge) {
  return typeof challenge === 'string' && CHALLENGE_RE.test(challenge);
}

/** S256: challenge = base64url(SHA256(ASCII(verifier))). */
function deriveChallenge(verifier) {
  return base64url(createHash('sha256').update(verifier, 'ascii').digest());
}

/**
 * Constant-time comparison of the stored challenge against the one derived
 * from the presented verifier.
 *
 * WHY constant time: the comparison is against a value an attacker controls
 * one side of. A byte-at-a-time `===` leaks how many leading characters were
 * right, which turns a 2^256 guess into 43 sequential guesses. The window is
 * short (60 s) but the fix is free, so there is no argument for taking the
 * risk.
 *
 * WHY hash both sides to a fixed 32 bytes before comparing: timingSafeEqual
 * throws on a length mismatch, and that throw is itself a length oracle.
 * Digesting first makes both operands the same size unconditionally, so the
 * only thing that varies is the answer.
 */
function verifyS256(codeChallenge, codeVerifier) {
  if (!isWellFormedVerifier(codeVerifier)) return false;
  if (!isWellFormedChallenge(codeChallenge)) return false;

  const expected = createHash('sha256').update(String(codeChallenge), 'ascii').digest();
  const actual = createHash('sha256').update(deriveChallenge(codeVerifier), 'ascii').digest();
  return timingSafeEqual(expected, actual);
}

module.exports = {
  base64url,
  deriveChallenge,
  isWellFormedChallenge,
  isWellFormedVerifier,
  verifyS256,
};
