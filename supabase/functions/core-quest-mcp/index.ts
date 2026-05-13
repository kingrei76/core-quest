// Core Quest MCP server — Streamable HTTP + OAuth 2.1.
// Exposes Core Quest data to Claude Cowork / Claude Code as a remote MCP server.
//
// Endpoints (all relative to https://<ref>.supabase.co/functions/v1/core-quest-mcp):
//   /                                            POST  → JSON-RPC dispatch
//                                                GET   → SSE (not implemented; 405)
//   /.well-known/oauth-protected-resource        GET   → RFC 9728 metadata
//   /.well-known/oauth-authorization-server      GET   → RFC 8414 metadata
//   /register                                    POST  → RFC 7591 dynamic client registration
//   /authorize                                   GET   → login HTML form
//                                                POST  → form submission → code redirect
//   /token                                       POST  → code/refresh → access token
//
// Tier 1 of ~/.claude/plans/i-don-t-mean-temporarily-drifting-cake.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  handleProtectedResourceMetadata,
  handleAuthorizationServerMetadata,
  handleRegister,
  handleAuthorizeGet,
  handleAuthorizePost,
  handleToken,
  unauthorized,
} from './oauth.ts'
import { handleMcpPost, verifyAccessToken } from './mcp.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-session-id, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id, www-authenticate',
}

function corsResponse(): Response {
  return new Response(null, { headers: corsHeaders })
}

/**
 * Pull the sub-path after the function name. Supabase routes
 *   https://<ref>.supabase.co/functions/v1/core-quest-mcp/foo
 * to this function; req.url's pathname contains everything after the host,
 * so we slice off the prefix.
 */
function subPath(url: string): string {
  const { pathname } = new URL(url)
  const marker = '/core-quest-mcp'
  const idx = pathname.indexOf(marker)
  if (idx < 0) return pathname
  return pathname.slice(idx + marker.length) || '/'
}

/** Public base URL of this function — used in metadata responses. */
export function publicBaseUrl(req: Request): string {
  const url = new URL(req.url)
  const marker = '/core-quest-mcp'
  const idx = url.pathname.indexOf(marker)
  const base = idx >= 0 ? url.pathname.slice(0, idx + marker.length) : url.pathname
  return `${url.origin}${base}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const path = subPath(req.url)
  const method = req.method

  try {
    // OAuth discovery — host-relative .well-known is impossible on Supabase
    // (we don't control the host root), so we publish under the function
    // path and surface the URL via WWW-Authenticate on 401s. The MCP spec
    // explicitly supports this discovery-via-WWW-Authenticate flow.
    if (path === '/.well-known/oauth-protected-resource' && method === 'GET') {
      return withCors(await handleProtectedResourceMetadata(req))
    }
    if (path === '/.well-known/oauth-authorization-server' && method === 'GET') {
      return withCors(await handleAuthorizationServerMetadata(req))
    }

    // Dynamic client registration (RFC 7591).
    if (path === '/register' && method === 'POST') {
      return withCors(await handleRegister(req))
    }

    // Authorization endpoint — GET shows form, POST processes login.
    if (path === '/authorize' && method === 'GET') {
      return withCors(await handleAuthorizeGet(req))
    }
    if (path === '/authorize' && method === 'POST') {
      return withCors(await handleAuthorizePost(req))
    }

    // Token endpoint.
    if (path === '/token' && method === 'POST') {
      return withCors(await handleToken(req))
    }

    // MCP transport — root path. POST for JSON-RPC, GET for SSE (unimplemented).
    if ((path === '' || path === '/') && method === 'POST') {
      const auth = await verifyAccessToken(req)
      if (!auth.ok) return withCors(unauthorized(req, auth.reason))
      return withCors(await handleMcpPost(req, auth.userId))
    }
    if ((path === '' || path === '/') && method === 'GET') {
      // SSE streaming for server-initiated messages is optional in
      // Streamable HTTP. Cowork's daily routine doesn't need it; return 405
      // so the client falls back to POST-only mode.
      return withCors(json({ error: 'GET (SSE) not implemented' }, 405))
    }

    return withCors(json({ error: 'not found', path }, 404))
  } catch (err) {
    console.error('core-quest-mcp unhandled error:', err)
    return withCors(json({ error: 'internal error' }, 500))
  }
})

function withCors(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v)
  return new Response(res.body, { status: res.status, headers })
}

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}
