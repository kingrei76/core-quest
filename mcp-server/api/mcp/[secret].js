// Vercel serverless function: POST /mcp/<secret> (rewritten to /api/mcp/:secret).
//
// The shared secret is embedded in the URL *path* — not a query param or header
// — because Claude's desktop custom-connector UI strips query strings and can't
// send custom headers. The path is preserved verbatim as the MCP endpoint, so
// the secret survives.
//
// A wrong/missing secret returns 404 (Not Found), deliberately NOT 401. A 401
// is what makes the Claude connector kick off an OAuth discovery flow (which
// this server doesn't implement) — returning 404 keeps it from ever trying.

import { runMcp, noStreamError } from '../../src/handler.js'
import { config } from '../../src/config.js'

export default async function handler(req, res) {
  if (config.sharedSecret && req.query.secret !== config.sharedSecret) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (req.method === 'POST') {
    return runMcp(req, res, req.body)
  }
  // Stateless server: no SSE stream on GET/DELETE. 405 (not 401) avoids OAuth.
  return res.status(405).json(noStreamError)
}
