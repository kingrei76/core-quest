// Express app for local development (`npm start` / `npm run dev`).
// On Vercel the same logic is served by api/mcp.js + api/health.js, which call
// the shared handler directly — so this file is local-only.

import express from 'express'
import { handleMcp, noStreamError } from './handler.js'

export const app = express()
app.use(express.json({ limit: '1mb' }))

// Health / root.
app.get('/', (_req, res) => res.json({ ok: true, service: 'core-quest-mcp' }))
app.get('/health', (_req, res) => res.json({ ok: true }))

// MCP (stateless Streamable-HTTP).
app.post('/mcp', (req, res) => handleMcp(req, res, req.body))
const noStream = (_req, res) => res.status(405).json(noStreamError)
app.get('/mcp', noStream)
app.delete('/mcp', noStream)
