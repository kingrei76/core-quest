// Transport-agnostic MCP request core, shared by the local Express entry
// (src/index.js) and the Vercel serverless functions (api/*.js).
//
// The endpoint is stateless: a fresh McpServer + StreamableHTTPServerTransport
// is built per request (sessionIdGenerator: undefined). Because the body is
// passed in pre-parsed, this works identically whether Express's express.json()
// or Vercel's @vercel/node runtime did the parsing.

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { buildServer } from './server.js'
import { config } from './config.js'
import { verifyAccessToken, oauthDebug } from './oauth.js'

// Shared-secret gate. Accepts `Authorization: Bearer <secret>`, the
// `x-mcp-key` header, a `?key=` query param, or a valid OAuth-issued access
// token (Bearer) minted by api/oauth.js. Open if no secret configured.
export function authorized(req) {
  if (!config.sharedSecret) return true // open mode (testing only)
  const header = req.headers['authorization'] || ''
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const provided = bearer || req.headers['x-mcp-key'] || req.query?.key
  if (provided === config.sharedSecret) return true
  if (bearer && verifyAccessToken(bearer)) return true
  return false
}

// Build the WWW-Authenticate header that points a connector at our OAuth
// protected-resource metadata (RFC 9728) — this is what makes Claude's
// connector start the sign-in flow instead of giving up.
function wwwAuthenticate(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `Bearer resource_metadata="${proto}://${host}/.well-known/oauth-protected-resource"`
}

// Method-not-allowed body for GET/DELETE on a stateless server (no SSE stream).
export const noStreamError = {
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed (stateless server).' },
  id: null,
}

// Run a stateless MCP request — builds a fresh server+transport and replies.
// Assumes the caller has already authorized. `body` is the parsed JSON-RPC
// payload. Works with both Express and Vercel `res` objects (both expose
// status()/json() and are Node ServerResponse instances the SDK streams to).
export async function runMcp(req, res, body) {
  try {
    const server = buildServer()
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
      transport.close()
      server.close()
    })
    await server.connect(transport)
    await transport.handleRequest(req, res, body)
  } catch (err) {
    console.error('[mcp] request error', err)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      })
    }
  }
}

// Header/query-secret gated entry (Authorization: Bearer / x-mcp-key / ?key=).
// Used by curl + local dev. NOTE: Claude's desktop custom-connector UI drops
// query params and can't set headers, so it can't use this path — it must use
// the path-embedded secret route (api/mcp/[secret].js → /mcp/<secret>), which
// returns 404 (never 401) on a bad secret so the connector won't try OAuth.
export async function handleMcp(req, res, body) {
  if (!authorized(req)) {
    const header = req.headers['authorization'] || ''
    const hasBearer = /^Bearer\s+/i.test(header)
    await oauthDebug(hasBearer ? 'mcp_401_bad_token' : 'mcp_401_no_token', { method: body?.method })
    res.setHeader('WWW-Authenticate', wwwAuthenticate(req))
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    })
    return
  }
  await oauthDebug('mcp_authorized', { method: body?.method })
  return runMcp(req, res, body)
}
