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

// Shared-secret gate. Accepts `Authorization: Bearer <secret>`, the
// `x-mcp-key` header, or a `?key=` query param. Open if no secret configured.
export function authorized(req) {
  if (!config.sharedSecret) return true // open mode (testing only)
  const header = req.headers['authorization'] || ''
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const provided = bearer || req.headers['x-mcp-key'] || req.query?.key
  return provided === config.sharedSecret
}

// Method-not-allowed body for GET/DELETE on a stateless server (no SSE stream).
export const noStreamError = {
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed (stateless server).' },
  id: null,
}

// Handle a POST /mcp request. `body` is the already-parsed JSON-RPC payload.
// Works with both Express and Vercel `res` objects (both expose status()/json()
// and are Node ServerResponse instances the SDK can stream to).
export async function handleMcp(req, res, body) {
  if (!authorized(req)) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    })
    return
  }
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
