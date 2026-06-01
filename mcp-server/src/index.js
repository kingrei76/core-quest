// Local HTTP entry point for the Core Quest MCP server.
// Starts a long-running Express server — used for local development.
// In production the server runs on Vercel as serverless functions (see api/).

import { app } from './app.js'
import { config } from './config.js'

app.listen(config.port, () => {
  console.log(
    `[core-quest-mcp] listening on :${config.port} (tz=${config.userTz}, auth=${config.sharedSecret ? 'on' : 'OPEN'})`,
  )
})
