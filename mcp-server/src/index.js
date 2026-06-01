// HTTP entry point for the Core Quest MCP server.
// Exposes a stateless Streamable-HTTP MCP endpoint at POST /mcp, gated by a
// shared secret (Authorization: Bearer <secret>, ?key=<secret>, or x-mcp-key).

import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { buildServer } from './server.js'
import { config } from './config.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

// --- auth ------------------------------------------------------------------
function authorized(req) {
  if (!config.sharedSecret) return true // open mode (testing only)
  const header = req.headers['authorization'] || ''
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const provided = bearer || req.headers['x-mcp-key'] || req.query.key
  return provided === config.sharedSecret
}

// --- health ----------------------------------------------------------------
app.get('/', (_req, res) => res.json({ ok: true, service: 'core-quest-mcp' }))
app.get('/health', (_req, res) => res.json({ ok: true }))

// --- MCP (stateless: fresh server+transport per request) -------------------
app.post('/mcp', async (req, res) => {
  if (!authorized(req)) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    })
  }
  try {
    const server = buildServer()
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
      transport.close()
      server.close()
    })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
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
})

// Stateless mode: no SSE stream / session teardown over GET/DELETE.
const noStream = (_req, res) =>
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed (stateless server).' },
    id: null,
  })
app.get('/mcp', noStream)
app.delete('/mcp', noStream)

app.listen(config.port, () => {
  console.log(`[core-quest-mcp] listening on :${config.port} (tz=${config.userTz}, auth=${config.sharedSecret ? 'on' : 'OPEN'})`)
})
