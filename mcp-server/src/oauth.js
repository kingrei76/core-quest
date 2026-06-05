// Minimal, stateless OAuth 2.1 authorization-server + protected-resource layer
// so Claude's custom-connector flow can sign in. The MCP "Connectors" UI insists
// on OAuth (it can't send a custom header or use a path secret), so we speak just
// enough OAuth to satisfy it:
//
//   1. POST /mcp with no token        -> 401 + WWW-Authenticate (handler.js)
//   2. GET /.well-known/oauth-protected-resource   -> prMetadata()
//   3. GET /.well-known/oauth-authorization-server -> asMetadata()
//   4. POST /register (Dynamic Client Registration) -> a client_id
//   5. GET  /authorize -> password gate -> 302 back with ?code=...
//   6. POST /token -> verify code + PKCE -> { access_token }
//   7. POST /mcp with Bearer <access_token> -> connected
//
// Everything is single-tenant and stateless: codes/tokens are HMAC-signed blobs
// (keyed by MCP_SHARED_SECRET) so no store is needed between serverless calls.
// MCP_SHARED_SECRET doubles as the sign-in password — the server can write to
// Matt's real tasks, so we never auto-approve anonymously.

import crypto from 'crypto'
import { config } from './config.js'

const KEY = config.sharedSecret || 'dev-insecure-key'
const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

const b64u = (buf) => Buffer.from(buf).toString('base64url')

function hmac(data) {
  return crypto.createHmac('sha256', KEY).update(data).digest()
}

// Pack a payload into `<base64url(json)>.<base64url(hmac)>`.
function pack(payload) {
  const body = b64u(JSON.stringify(payload))
  return `${body}.${b64u(hmac(body))}`
}

// Verify + decode a packed token; returns the payload or null (bad sig / expired).
function unpack(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = b64u(hmac(body))
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

// --- authorization code (carries PKCE challenge + redirect_uri) --------------
export function issueCode({ codeChallenge, redirectUri }) {
  return pack({ k: 'code', cc: codeChallenge, ru: redirectUri, exp: Date.now() + CODE_TTL_MS })
}
export function verifyCode(code) {
  const p = unpack(code)
  return p && p.k === 'code' ? p : null
}

// --- access token ------------------------------------------------------------
export function issueAccessToken() {
  return pack({ k: 'at', exp: Date.now() + TOKEN_TTL_MS })
}
export function verifyAccessToken(token) {
  const p = unpack(token)
  return Boolean(p && p.k === 'at')
}

// --- PKCE (S256) -------------------------------------------------------------
export function pkceMatches(verifier, challenge) {
  if (!verifier || !challenge) return false
  const h = b64u(crypto.createHash('sha256').update(verifier).digest())
  const a = Buffer.from(h)
  const b = Buffer.from(challenge)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// --- discovery metadata ------------------------------------------------------
export function asMetadata(base) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: ['mcp'],
  }
}
export function prMetadata(base) {
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp'],
  }
}

// The sign-in password (== the shared secret). Constant-time compare.
export function passwordOk(input) {
  if (!input || !config.sharedSecret) return false
  const a = Buffer.from(String(input))
  const b = Buffer.from(config.sharedSecret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Only allow redirecting back to https endpoints or localhost loopbacks.
export function redirectAllowed(uri) {
  try {
    const u = new URL(uri)
    return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}
