// Vercel serverless function: GET /api/health (also /health via vercel.json).
// Plain liveness check — does not touch Supabase or require auth.

export default function handler(_req, res) {
  res.status(200).json({ ok: true, service: 'core-quest-mcp' })
}
