// Vercel serverless function: POST /api/mcp (also reachable at /mcp via the
// rewrite in vercel.json). The @vercel/node runtime parses the JSON body into
// req.body, which we hand to the shared stateless MCP handler.
//
// GET/DELETE return 405 — this is a stateless server with no SSE stream.

import { handleMcp, noStreamError } from '../src/handler.js'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return handleMcp(req, res, req.body)
  }
  if (req.method === 'GET' || req.method === 'DELETE') {
    return res.status(405).json(noStreamError)
  }
  return res.status(405).json(noStreamError)
}
