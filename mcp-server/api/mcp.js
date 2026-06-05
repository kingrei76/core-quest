// Vercel serverless function backing both connector entry points:
//
//   POST /mcp                -> header/query secret (Authorization / x-mcp-key / ?key=)
//   POST /mcp/<secret>       -> secret embedded in the URL *path*
//
// Both are rewritten to this one function in vercel.json. The path form exists
// because Claude's desktop custom-connector UI strips query strings and can't
// set headers — the path is the only part of the URL it preserves. The rewrite
// `/mcp/:secret -> /api/mcp?pathsecret=:secret` hands us that segment as
// req.query.pathsecret.
//
// We deliberately keep this as a SINGLE function (no nested api/mcp/[secret].js)
// so `mcp` isn't both a file and a directory — that name collision breaks
// Vercel's per-function dependency tracing and crashes the nested lambda.
//
// A wrong/missing path secret returns 404, never 401: a 401 is what makes the
// Claude connector start an OAuth discovery flow this server doesn't implement.
// GET/DELETE return 405 — this is a stateless server with no SSE stream.

import { handleMcp, runMcp, noStreamError } from '../src/handler.js'
import { config } from '../src/config.js'

export default async function handler(req, res) {
  const pathSecret = req.query?.pathsecret

  // Path-embedded secret route (/mcp/<secret>).
  if (pathSecret !== undefined) {
    if (config.sharedSecret && pathSecret !== config.sharedSecret) {
      return res.status(404).json({ error: 'Not found' })
    }
    if (req.method === 'POST') {
      return runMcp(req, res, req.body)
    }
    return res.status(405).json(noStreamError)
  }

  // Plain /mcp route — header/query secret (curl, local dev, backwards compat).
  if (req.method === 'POST') {
    return handleMcp(req, res, req.body)
  }
  return res.status(405).json(noStreamError)
}
