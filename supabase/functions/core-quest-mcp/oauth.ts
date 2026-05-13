// OAuth 2.1 implementation for the Core Quest MCP server.
// Single-user/single-tenant: only the user themselves can complete the login
// step (verified via Supabase Auth's password grant). Issued access tokens
// are short-lived HS256 JWTs signed with MCP_JWT_SECRET; refresh tokens are
// opaque random strings stored hashed in mcp_oauth_refresh_tokens.

import { admin, json, publicBaseUrl } from './index.ts'

const ACCESS_TOKEN_TTL_SECONDS = 3600
const AUTH_CODE_TTL_SECONDS = 600
const REFRESH_TOKEN_TTL_DAYS = 90
const JWT_ISSUER = 'core-quest-mcp'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const MCP_JWT_SECRET = Deno.env.get('MCP_JWT_SECRET') || ''

// ---------- discovery ----------

export async function handleProtectedResourceMetadata(req: Request): Promise<Response> {
  const base = publicBaseUrl(req)
  return json({
    resource: base,
    authorization_servers: [base],
    bearer_methods_supported: ['header'],
    resource_documentation: `${base}/`,
  })
}

export async function handleAuthorizationServerMetadata(req: Request): Promise<Response> {
  const base = publicBaseUrl(req)
  return json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
  })
}

// ---------- dynamic client registration ----------

export async function handleRegister(req: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_client_metadata', error_description: 'body must be JSON' }, 400)
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter(
    (u): u is string => typeof u === 'string',
  ) : []
  if (redirectUris.length === 0) {
    return json({
      error: 'invalid_redirect_uri',
      error_description: 'at least one redirect_uri required',
    }, 400)
  }

  const clientId = `mcp_${crypto.randomUUID().replace(/-/g, '')}`
  const clientName = typeof body.client_name === 'string' ? body.client_name : 'mcp-client'

  const { error } = await admin.from('mcp_oauth_clients').insert({
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none',
  })
  if (error) {
    console.error('register client insert failed:', error)
    return json({ error: 'server_error' }, 500)
  }

  return json({
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  }, 201)
}

// ---------- authorize: GET form + POST handler ----------

type AuthorizeParams = {
  response_type: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: string
  state: string
  resource: string
  scope: string
}

function parseAuthorizeParams(searchParams: URLSearchParams): AuthorizeParams {
  return {
    response_type: searchParams.get('response_type') || '',
    client_id: searchParams.get('client_id') || '',
    redirect_uri: searchParams.get('redirect_uri') || '',
    code_challenge: searchParams.get('code_challenge') || '',
    code_challenge_method: searchParams.get('code_challenge_method') || 'S256',
    state: searchParams.get('state') || '',
    resource: searchParams.get('resource') || '',
    scope: searchParams.get('scope') || 'mcp',
  }
}

async function loadClient(clientId: string) {
  const { data } = await admin
    .from('mcp_oauth_clients')
    .select('client_id, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()
  return data
}

export async function handleAuthorizeGet(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const params = parseAuthorizeParams(url.searchParams)

  if (params.response_type !== 'code') {
    return errorPage('Unsupported response_type. Only "code" is supported.', 400)
  }
  if (!params.code_challenge || params.code_challenge_method !== 'S256') {
    return errorPage('Missing or invalid PKCE challenge. S256 required.', 400)
  }
  const client = await loadClient(params.client_id)
  if (!client) return errorPage('Unknown client_id.', 400)
  if (!client.redirect_uris.includes(params.redirect_uri)) {
    return errorPage('redirect_uri not registered for this client.', 400)
  }

  return loginPage(params, null)
}

export async function handleAuthorizePost(req: Request): Promise<Response> {
  const form = await req.formData()
  const params: AuthorizeParams = {
    response_type: String(form.get('response_type') || ''),
    client_id: String(form.get('client_id') || ''),
    redirect_uri: String(form.get('redirect_uri') || ''),
    code_challenge: String(form.get('code_challenge') || ''),
    code_challenge_method: String(form.get('code_challenge_method') || 'S256'),
    state: String(form.get('state') || ''),
    resource: String(form.get('resource') || ''),
    scope: String(form.get('scope') || 'mcp'),
  }
  const email = String(form.get('email') || '').trim()
  const password = String(form.get('password') || '')

  const client = await loadClient(params.client_id)
  if (!client) return errorPage('Unknown client_id.', 400)
  if (!client.redirect_uris.includes(params.redirect_uri)) {
    return errorPage('redirect_uri not registered for this client.', 400)
  }
  if (!email || !password) {
    return loginPage(params, 'Email and password are required.')
  }

  // Verify the user via Supabase Auth's password grant. We don't keep the
  // returned tokens — we just need to confirm the user.
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  if (!authRes.ok) {
    return loginPage(params, 'Sign-in failed. Check your email and password.')
  }
  const authBody = await authRes.json()
  const userId = authBody?.user?.id
  if (!userId) return loginPage(params, 'Sign-in succeeded but no user id returned.')

  const code = randomToken(32)
  const codeHash = await sha256Hex(code)
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000).toISOString()

  const { error } = await admin.from('mcp_oauth_authcodes').insert({
    code_hash: codeHash,
    client_id: params.client_id,
    user_id: userId,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
    redirect_uri: params.redirect_uri,
    resource: params.resource || null,
    scope: params.scope,
    expires_at: expiresAt,
  })
  if (error) {
    console.error('authcode insert failed:', error)
    return errorPage('Failed to issue authorization code.', 500)
  }

  const redirect = new URL(params.redirect_uri)
  redirect.searchParams.set('code', code)
  if (params.state) redirect.searchParams.set('state', params.state)
  return new Response(null, {
    status: 302,
    headers: { Location: redirect.toString() },
  })
}

// ---------- token endpoint ----------

export async function handleToken(req: Request): Promise<Response> {
  const contentType = req.headers.get('content-type') || ''
  const params = new URLSearchParams(
    contentType.includes('application/json')
      ? new URLSearchParams(Object.entries(await req.json()).map(([k, v]) => [k, String(v)]))
      : await req.text(),
  )

  const grantType = params.get('grant_type') || ''
  if (grantType === 'authorization_code') {
    return tokenFromAuthCode(params)
  }
  if (grantType === 'refresh_token') {
    return tokenFromRefresh(params)
  }
  return json({ error: 'unsupported_grant_type' }, 400)
}

async function tokenFromAuthCode(params: URLSearchParams): Promise<Response> {
  const code = params.get('code') || ''
  const verifier = params.get('code_verifier') || ''
  const redirectUri = params.get('redirect_uri') || ''
  const clientId = params.get('client_id') || ''
  if (!code || !verifier || !redirectUri || !clientId) {
    return json({ error: 'invalid_request' }, 400)
  }

  const codeHash = await sha256Hex(code)
  const { data: row } = await admin
    .from('mcp_oauth_authcodes')
    .select('*')
    .eq('code_hash', codeHash)
    .maybeSingle()

  if (!row) return json({ error: 'invalid_grant', error_description: 'unknown code' }, 400)
  if (row.consumed_at) return json({ error: 'invalid_grant', error_description: 'code already used' }, 400)
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json({ error: 'invalid_grant', error_description: 'code expired' }, 400)
  }
  if (row.client_id !== clientId) {
    return json({ error: 'invalid_grant', error_description: 'client mismatch' }, 400)
  }
  if (row.redirect_uri !== redirectUri) {
    return json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' }, 400)
  }

  // Verify PKCE.
  const challenge = await pkceChallengeFromVerifier(verifier)
  if (challenge !== row.code_challenge) {
    return json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, 400)
  }

  await admin
    .from('mcp_oauth_authcodes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('code_hash', codeHash)

  return issueTokenPair(row.user_id, row.client_id, row.scope || 'mcp')
}

async function tokenFromRefresh(params: URLSearchParams): Promise<Response> {
  const refresh = params.get('refresh_token') || ''
  const clientId = params.get('client_id') || ''
  if (!refresh || !clientId) return json({ error: 'invalid_request' }, 400)

  const tokenHash = await sha256Hex(refresh)
  const { data: row } = await admin
    .from('mcp_oauth_refresh_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!row) return json({ error: 'invalid_grant', error_description: 'unknown refresh token' }, 400)
  if (row.client_id !== clientId) {
    return json({ error: 'invalid_grant', error_description: 'client mismatch' }, 400)
  }
  if (row.revoked_at) return json({ error: 'invalid_grant', error_description: 'token revoked' }, 400)
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return json({ error: 'invalid_grant', error_description: 'token expired' }, 400)
  }

  await admin
    .from('mcp_oauth_refresh_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)

  return issueTokenPair(row.user_id, row.client_id, row.scope || 'mcp', { rotateRefresh: false })
}

async function issueTokenPair(
  userId: string,
  clientId: string,
  scope: string,
  opts: { rotateRefresh?: boolean } = { rotateRefresh: true },
): Promise<Response> {
  if (!MCP_JWT_SECRET) {
    console.error('MCP_JWT_SECRET not set')
    return json({ error: 'server_error', error_description: 'jwt secret not configured' }, 500)
  }

  const accessToken = await signJwt({
    sub: userId,
    iss: JWT_ISSUER,
    aud: clientId,
    scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
  }, MCP_JWT_SECRET)

  let refreshToken: string | undefined
  if (opts.rotateRefresh) {
    refreshToken = randomToken(48)
    const refreshHash = await sha256Hex(refreshToken)
    const refreshExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000,
    ).toISOString()
    const { error } = await admin.from('mcp_oauth_refresh_tokens').insert({
      token_hash: refreshHash,
      client_id: clientId,
      user_id: userId,
      scope,
      expires_at: refreshExpiresAt,
    })
    if (error) {
      console.error('refresh token insert failed:', error)
      return json({ error: 'server_error' }, 500)
    }
  }

  return json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
  })
}

// ---------- 401 + WWW-Authenticate ----------

export function unauthorized(req: Request, reason: string): Response {
  const metadataUrl = `${publicBaseUrl(req)}/.well-known/oauth-protected-resource`
  return new Response(
    JSON.stringify({ error: 'unauthorized', error_description: reason }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="core-quest-mcp", resource_metadata="${metadataUrl}"`,
      },
    },
  )
}

// ---------- crypto helpers (Web Crypto API, native to Deno) ----------

function randomToken(byteLen: number): string {
  const bytes = new Uint8Array(byteLen)
  crypto.getRandomValues(bytes)
  return base64urlBytes(bytes)
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function pkceChallengeFromVerifier(verifier: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64urlBytes(new Uint8Array(buf))
}

function base64urlBytes(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlText(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64urlText(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64urlText(JSON.stringify(payload))
  const data = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return `${data}.${base64urlBytes(new Uint8Array(sig))}`
}

export async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  if (!MCP_JWT_SECRET) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, bodyB64, sigB64] = parts
  const data = `${headerB64}.${bodyB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(MCP_JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    base64urlDecode(sigB64),
    new TextEncoder().encode(data),
  )
  if (!ok) return null

  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(bodyB64))) as Record<
    string,
    unknown
  >
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null
  return payload
}

// ---------- HTML pages ----------

function loginPage(params: AuthorizeParams, error: string | null): Response {
  const hidden = (name: keyof AuthorizeParams) =>
    `<input type="hidden" name="${name}" value="${escapeHtml(params[name])}">`
  const errorHtml = error
    ? `<p style="color:#c33;margin-bottom:1em;">${escapeHtml(error)}</p>`
    : ''
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in to Core Quest</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #1a1d26; color: #e8e8ec; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2em 1em; }
    .card { background: #23273a; border: 1px solid #34384d; border-radius: 12px; padding: 2em; max-width: 360px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
    h1 { margin: 0 0 0.25em; font-size: 1.3em; }
    .sub { opacity: 0.7; font-size: 0.9em; margin-bottom: 1.5em; }
    label { display: block; font-size: 0.85em; margin: 0.75em 0 0.25em; opacity: 0.85; }
    input[type=email], input[type=password] { width: 100%; box-sizing: border-box; padding: 0.6em 0.75em; border-radius: 6px; border: 1px solid #3a3f55; background: #1a1d26; color: #e8e8ec; font-size: 0.95em; }
    input:focus { outline: none; border-color: #6b8eff; }
    button { margin-top: 1.5em; width: 100%; padding: 0.7em; background: #6b8eff; color: white; border: none; border-radius: 6px; font-size: 1em; font-weight: 600; cursor: pointer; }
    button:hover { background: #5577f5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Sign in to Core Quest</h1>
    <div class="sub">Authorize Claude to access your quest data.</div>
    ${errorHtml}
    <form method="post" action="/functions/v1/core-quest-mcp/authorize">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" autocomplete="email" required autofocus>
      <label for="password">Password</label>
      <input type="password" id="password" name="password" autocomplete="current-password" required>
      ${hidden('response_type')}
      ${hidden('client_id')}
      ${hidden('redirect_uri')}
      ${hidden('code_challenge')}
      ${hidden('code_challenge_method')}
      ${hidden('state')}
      ${hidden('resource')}
      ${hidden('scope')}
      <button type="submit">Authorize</button>
    </form>
  </div>
</body>
</html>`
  return new Response(html, {
    status: error ? 400 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function errorPage(message: string, status: number): Response {
  const html = `<!doctype html><html><body style="font-family:system-ui;padding:2em;color:#333;">
<h1>Authorization error</h1><p>${escapeHtml(message)}</p></body></html>`
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
