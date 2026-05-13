// MCP JSON-RPC dispatcher + Wave 1 tool implementations.
//
// Protocol: 2025-06-18 (Streamable HTTP). We support the minimum surface
// needed for a Cowork custom connector — initialize, tools/list, tools/call,
// ping, and the notifications/initialized ack. Server-initiated SSE is not
// implemented; clients fall back to POST-only.

import { admin, json } from './index.ts'
import { verifyJwt } from './oauth.ts'

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'core-quest-mcp', version: '0.1.0' }

// Categories mirror src/config/constants.js — kept in sync manually. If
// constants.js changes, update this list and the inputSchema enum below.
const BUILT_IN_CATEGORIES: Record<string, { label: string; stat: string }> = {
  health:        { label: 'Health',        stat: 'vitality' },
  intelligence:  { label: 'Intelligence',  stat: 'wisdom' },
  money:         { label: 'Money',         stat: 'fortune' },
  relationships: { label: 'Relationships', stat: 'charisma' },
  household:     { label: 'Household',     stat: 'vitality' },
}

const DIFFICULTY_KEYS = ['trivial', 'easy', 'medium', 'hard', 'epic', 'legendary'] as const

// ---------- access token verification ----------

export async function verifyAccessToken(
  req: Request,
): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const auth = req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (!match) return { ok: false, reason: 'missing bearer token' }
  const token = match[1].trim()
  const claims = await verifyJwt(token)
  if (!claims) return { ok: false, reason: 'invalid or expired token' }
  const sub = typeof claims.sub === 'string' ? claims.sub : null
  if (!sub) return { ok: false, reason: 'token missing subject' }
  return { ok: true, userId: sub }
}

// ---------- top-level handler ----------

export async function handleMcpPost(req: Request, userId: string): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(rpcError(null, -32700, 'parse error'), 400)
  }

  if (Array.isArray(body)) {
    // Batch request. Drop notifications from response array.
    const results = await Promise.all(body.map((msg) => dispatch(msg, userId)))
    const filtered = results.filter((r): r is RpcResponse => r !== null)
    return json(filtered)
  }
  const single = await dispatch(body, userId)
  if (single === null) return new Response(null, { status: 202 })
  return json(single)
}

type RpcRequest = { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: unknown }
type RpcResponse = {
  jsonrpc: '2.0'
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

async function dispatch(msg: unknown, userId: string): Promise<RpcResponse | null> {
  const req = msg as RpcRequest
  if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return rpcError(null, -32600, 'invalid request')
  }
  const id = req.id ?? null
  const isNotification = req.id === undefined || req.id === null

  try {
    switch (req.method) {
      case 'initialize':
        return rpcOk(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
        })

      case 'notifications/initialized':
      case 'notifications/cancelled':
        return null

      case 'ping':
        return rpcOk(id, {})

      case 'tools/list':
        return rpcOk(id, { tools: toolDefinitions() })

      case 'tools/call': {
        const params = (req.params || {}) as { name?: string; arguments?: Record<string, unknown> }
        if (!params.name) return rpcError(id, -32602, 'tools/call requires name')
        const result = await callTool(params.name, params.arguments || {}, userId)
        return rpcOk(id, result)
      }

      default:
        if (isNotification) return null
        return rpcError(id, -32601, `method not found: ${req.method}`)
    }
  } catch (err) {
    console.error('dispatch error:', req.method, err)
    return rpcError(id, -32603, 'internal error')
  }
}

function rpcOk(id: number | string | null, result: unknown): RpcResponse {
  return { jsonrpc: '2.0', id, result }
}
function rpcError(
  id: number | string | null,
  code: number,
  message: string,
  data?: unknown,
): RpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } }
}

// ---------- tool definitions ----------

function toolDefinitions() {
  return [
    {
      name: 'list_quests',
      description:
        "List the user's quests. Use status='available' for open quests (the default for 'what's on my plate'). Returns title, category, difficulty, due_date, status, and structural flags (is_boss, parent_quest_id).",
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['available', 'in_progress', 'completed', 'failed', 'abandoned', 'all'],
            description: 'Filter by quest status. Omit or use "all" to get every quest.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 200,
            description: 'Max number of quests to return (default 100).',
          },
        },
      },
    },
    {
      name: 'list_inbox',
      description:
        'List inbox items — raw captures awaiting triage into quests. Use processed=false (the default) to get the pending-review queue.',
      inputSchema: {
        type: 'object',
        properties: {
          processed: { type: 'boolean', description: 'Filter by processed flag. Default false.' },
          limit: { type: 'integer', minimum: 1, maximum: 200 },
        },
      },
    },
    {
      name: 'get_character_summary',
      description:
        "Return the user's character profile: name, class, title, level (derived from total_xp), stats, current HP/MP, action points, and streak. Use this to ground in-character or bond-aware responses.",
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_categories',
      description:
        'Return the canonical quest categories (built-in + any user-defined). Use the keys exactly when classifying quests; categories must come from this list.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_todays_briefing',
      description:
        "Return today's daily briefing if a cloud routine has already written one. Returns null if no briefing exists for the date. Use date in YYYY-MM-DD to request a specific day.",
      inputSchema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: "ISO date (YYYY-MM-DD). Defaults to today (UTC).",
          },
        },
      },
    },
  ]
}

// ---------- tool dispatcher ----------

async function callTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  switch (name) {
    case 'list_quests':
      return textResult(await listQuests(userId, args))
    case 'list_inbox':
      return textResult(await listInbox(userId, args))
    case 'get_character_summary':
      return textResult(await getCharacterSummary(userId))
    case 'list_categories':
      return textResult(await listCategories(userId))
    case 'get_todays_briefing':
      return textResult(await getTodaysBriefing(userId, args))
    default:
      return {
        content: [{ type: 'text', text: `unknown tool: ${name}` }],
        isError: true,
      }
  }
}

function textResult(payload: unknown) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  }
}

// ---------- tool implementations ----------

async function listQuests(userId: string, args: Record<string, unknown>) {
  const status = typeof args.status === 'string' ? args.status : 'available'
  const limit = clampInt(args.limit, 1, 200, 100)

  let query = admin
    .from('quests')
    .select(
      'id, title, description, category, difficulty, status, due_date, reminder_at, recurrence, is_boss, parent_quest_id, created_at, completed_at, xp_value',
    )
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`list_quests failed: ${error.message}`)
  return { count: data?.length ?? 0, quests: data ?? [] }
}

async function listInbox(userId: string, args: Record<string, unknown>) {
  const processed = typeof args.processed === 'boolean' ? args.processed : false
  const limit = clampInt(args.limit, 1, 200, 100)

  const { data, error } = await admin
    .from('inbox_items')
    .select('id, content, type, processed, external_source, external_id, metadata, created_at')
    .eq('user_id', userId)
    .eq('processed', processed)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`list_inbox failed: ${error.message}`)
  return { count: data?.length ?? 0, items: data ?? [] }
}

async function getCharacterSummary(userId: string) {
  const [{ data: profile }, { data: stats }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    admin.from('character_stats').select('*').eq('user_id', userId).maybeSingle(),
  ])

  const totalXp = profile?.total_xp ?? 0
  const level = calculateLevel(totalXp)
  const v = stats?.vitality ?? 0
  const w = stats?.wisdom ?? 0
  const f = stats?.fortune ?? 0
  const hpMax = 50 + level * 10 + v * 3 + w * 1
  const mpMax = 30 + level * 5 + w * 3 + f * 2

  return {
    profile: {
      display_name: profile?.display_name ?? null,
      character_name: profile?.character_name ?? null,
      character_class: profile?.character_class ?? null,
      character_title: profile?.character_title ?? null,
      total_xp: totalXp,
      level,
      current_streak: profile?.current_streak ?? 0,
      best_streak: profile?.best_streak ?? 0,
    },
    stats: {
      vitality: v,
      wisdom: w,
      fortune: f,
      charisma: stats?.charisma ?? 0,
      current_hp: stats?.current_hp ?? null,
      hp_max: hpMax,
      current_mp: stats?.current_mp ?? null,
      mp_max: mpMax,
      action_points: stats?.action_points ?? 0,
      weekly_hp: stats?.weekly_hp ?? null,
      weekly_hp_max: stats?.weekly_hp_max ?? null,
    },
  }
}

async function listCategories(userId: string) {
  const builtIn = Object.entries(BUILT_IN_CATEGORIES).map(([key, def]) => ({
    key,
    label: def.label,
    stat: def.stat,
    source: 'built-in' as const,
  }))

  const { data: custom } = await admin
    .from('user_categories')
    .select('*')
    .eq('user_id', userId)

  const customList = (custom ?? []).map((row: Record<string, unknown>) => ({
    key: String(row.key ?? row.id ?? ''),
    label: String(row.label ?? row.key ?? ''),
    stat: typeof row.stat === 'string' ? row.stat : null,
    source: 'user' as const,
  }))

  return {
    categories: [...builtIn, ...customList],
    difficulties: DIFFICULTY_KEYS,
  }
}

async function getTodaysBriefing(userId: string, args: Record<string, unknown>) {
  const date = typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date)
    ? args.date
    : new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('daily_briefings')
    .select('id, briefing_date, content, generated_by, generated_at')
    .eq('user_id', userId)
    .eq('briefing_date', date)
    .maybeSingle()

  if (error) throw new Error(`get_todays_briefing failed: ${error.message}`)
  if (!data) return { date, briefing: null }
  return { date, briefing: data }
}

// ---------- helpers ----------

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

// Mirror of src/utils/rpg.js → calculateLevel / xpForLevel. Inlined here
// because the Edge Function runtime can't import from src/. If the formula
// in src/utils/rpg.js changes, mirror it here.
function calculateLevel(totalXP: number): number {
  let level = 1
  while (Math.floor(100 * Math.pow(level + 1, 1.5)) <= totalXP) level++
  return level
}
