// Vercel function backing the OAuth endpoints, dispatched by ?action= (wired in
// vercel.json):
//   /.well-known/oauth-authorization-server  -> action=as-metadata
//   /.well-known/oauth-protected-resource     -> action=pr-metadata
//   /register                                 -> action=register   (DCR)
//   /authorize                                -> action=authorize  (GET form / POST submit)
//   /token                                    -> action=token
//
// See src/oauth.js for the stateless token design. The whole layer exists only
// so Claude's connector can complete its required OAuth handshake.

import crypto from 'crypto'
import {
  asMetadata,
  prMetadata,
  issueCode,
  verifyCode,
  issueAccessToken,
  pkceMatches,
  passwordOk,
  redirectAllowed,
} from '../src/oauth.js'

function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function json(res, status, body) {
  cors(res)
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  )

// OAuth params we must carry through the login form back to ourselves.
const PARAMS = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'scope', 'resource']

function loginPage(values, { error } = {}) {
  const hidden = PARAMS.map((p) => `<input type="hidden" name="${p}" value="${esc(values[p])}">`).join('\n      ')
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect Core Quest</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4f2;
    display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#1a1a1a}
  .card{background:#fff;padding:32px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);
    width:100%;max-width:360px;box-sizing:border-box}
  h1{font-size:20px;margin:0 0 4px}p{color:#666;font-size:14px;margin:0 0 20px}
  input[type=password]{width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;
    font-size:16px;box-sizing:border-box}
  button{width:100%;margin-top:16px;padding:12px;border:0;border-radius:10px;background:#c4633f;
    color:#fff;font-size:16px;font-weight:600;cursor:pointer}
  .err{color:#c0392b;font-size:13px;margin-top:12px}
</style></head><body>
  <form class="card" method="POST" action="/authorize">
    <h1>Connect Core Quest</h1>
    <p>Enter your connector password to link this device.</p>
    ${hidden}
    <input type="password" name="password" placeholder="Connector password" autofocus autocomplete="off">
    <button type="submit">Connect</button>
    ${error ? `<div class="err">${esc(error)}</div>` : ''}
  </form>
</body></html>`
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    cors(res)
    return res.status(204).end()
  }

  const action = req.query?.action
  const base = baseUrl(req)

  // --- discovery metadata ----------------------------------------------------
  if (action === 'as-metadata') return json(res, 200, asMetadata(base))
  if (action === 'pr-metadata') return json(res, 200, prMetadata(base))

  // --- dynamic client registration ------------------------------------------
  if (action === 'register') {
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
    const meta = req.body || {}
    const redirectUris = Array.isArray(meta.redirect_uris) ? meta.redirect_uris : []
    // Single-tenant: we don't persist clients, so issue an opaque id and echo back.
    return json(res, 201, {
      client_id: 'cq_' + crypto.randomBytes(12).toString('hex'),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
      client_name: meta.client_name || 'Core Quest Connector',
    })
  }

  // --- authorization endpoint -----------------------------------------------
  if (action === 'authorize') {
    const src = req.method === 'POST' ? req.body || {} : req.query || {}
    const values = Object.fromEntries(PARAMS.map((p) => [p, src[p]]))

    // Show the login form on GET (or re-show with an error on bad POST).
    if (req.method === 'GET') {
      cors(res)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(loginPage(values))
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

    const renderError = (msg) => {
      cors(res)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(loginPage(values, { error: msg }))
    }

    if (!values.redirect_uri || !redirectAllowed(values.redirect_uri)) {
      return renderError('Invalid redirect URI.')
    }
    if (!values.code_challenge) {
      return renderError('Missing PKCE challenge from the client.')
    }
    if (!passwordOk(src.password)) {
      return renderError('Incorrect password. Try again.')
    }

    const code = issueCode({ codeChallenge: values.code_challenge, redirectUri: values.redirect_uri })
    const dest = new URL(values.redirect_uri)
    dest.searchParams.set('code', code)
    if (values.state) dest.searchParams.set('state', values.state)
    res.setHeader('Location', dest.toString())
    return res.status(302).end()
  }

  // --- token endpoint --------------------------------------------------------
  if (action === 'token') {
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
    const body = req.body || {}
    if (body.grant_type !== 'authorization_code') {
      return json(res, 400, { error: 'unsupported_grant_type' })
    }
    const code = verifyCode(body.code)
    if (!code) return json(res, 400, { error: 'invalid_grant' })
    if (body.redirect_uri && body.redirect_uri !== code.ru) {
      return json(res, 400, { error: 'invalid_grant', error_description: 'redirect_uri mismatch' })
    }
    if (!pkceMatches(body.code_verifier, code.cc)) {
      return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' })
    }
    return json(res, 200, {
      access_token: issueAccessToken(),
      token_type: 'Bearer',
      expires_in: 31536000,
      scope: 'mcp',
    })
  }

  return json(res, 404, { error: 'not_found' })
}
