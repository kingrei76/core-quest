// Builds the Core Quest MCP server and registers the task-management tools.
// No game logic here — this server gathers, proposes, approves, and reminds.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DIFFICULTY_XP, config } from './config.js'
import {
  listTasks,
  getInbox,
  getTask,
  insertProposed,
  updateTask,
  markInboxProcessed,
  logAction,
  todayStr,
  mondayStr,
  getRankedNext,
} from './supabase.js'
import { sendPushToUser } from './push.js'
import { postApprovalCard } from './slack.js'

const short = (id) => (id ? String(id).slice(0, 8) : '?')

// HH:MM (user tz) for a reminder timestamp, used to show the time-slot.
function slotTime(reminderAt) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: config.userTz, hour: 'numeric', minute: '2-digit',
    }).format(new Date(reminderAt))
  } catch {
    return null
  }
}

function fmtTask(q) {
  const bits = []
  if (q.planned_day) bits.push(`slot ${q.planned_day}`)
  if (q.reminder_at) { const t = slotTime(q.reminder_at); if (t) bits.push(`@ ${t}`) }
  if (q.due_date) bits.push(`due ${q.due_date}`)
  if (q.category) bits.push(q.category)
  if (q.difficulty) bits.push(q.difficulty)
  if (q.priority) bits.push(`${q.priority} priority`)
  if (q.approval_status && q.approval_status !== 'approved') bits.push(`[${q.approval_status}]`)
  if (q.status && q.status !== 'available') bits.push(q.status)
  const src = q.external_source ? ` ⟨${q.external_source}⟩` : ''
  return `• ${q.title} (${short(q.id)})${bits.length ? ' — ' + bits.join(' · ') : ''}${src}`
}

function fmtInbox(i) {
  const due = i.metadata?.due_date ? ` — due ${i.metadata.due_date}` : ''
  const src = i.external_source ? ` ⟨${i.external_source}⟩` : ''
  return `• ${i.content} (${short(i.id)})${due}${src}`
}

const text = (s) => ({ content: [{ type: 'text', text: s }] })

export function buildServer() {
  const server = new McpServer({
    name: 'core-quest-tasks',
    version: '0.1.0',
  })

  // --- list_tasks ----------------------------------------------------------
  server.registerTool(
    'list_tasks',
    {
      title: 'List tasks',
      description:
        'List Matt\'s tasks by view: "today" (due today), "overdue", "upcoming", ' +
        '"planned_today" (day-slotted for today — the daily read), "focus" (this ' +
        'week\'s focus list), "pending" (proposed, awaiting his approval), "active" ' +
        '(all approved & open), or "all". Use this to see what is on his plate.',
      inputSchema: {
        view: z
          .enum(['today', 'overdue', 'upcoming', 'planned_today', 'focus', 'pending', 'active', 'all'])
          .default('active'),
        limit: z.number().int().min(1).max(200).default(50),
      },
    },
    async ({ view, limit }) => {
      const tasks = await listTasks(view, limit)
      if (tasks.length === 0) return text(`No tasks in view "${view}".`)
      return text(`${view} (${tasks.length}):\n` + tasks.map(fmtTask).join('\n'))
    },
  )

  // --- get_inbox -----------------------------------------------------------
  server.registerTool(
    'get_inbox',
    {
      title: 'Get inbox',
      description:
        'List unprocessed inbox items — raw captures from iOS Reminders and other ' +
        'sources awaiting triage. Turn good ones into tasks with propose_task ' +
        '(passing inbox_source_id), and clear non-tasks with dismiss_inbox.',
      inputSchema: { limit: z.number().int().min(1).max(200).default(50) },
    },
    async ({ limit }) => {
      const items = await getInbox(limit)
      if (items.length === 0) return text('Inbox is empty.')
      return text(`Inbox (${items.length} unprocessed):\n` + items.map(fmtInbox).join('\n'))
    },
  )

  // --- propose_task --------------------------------------------------------
  server.registerTool(
    'propose_task',
    {
      title: 'Create a task',
      description:
        'Create a task for Matt. By default it is added DIRECTLY (approved, no ' +
        'approval step) and pushes a "task added" notification to his phone — this ' +
        'is what Matt wants. Set auto_approve=false only if you want him to approve ' +
        'it first (saved PROPOSED, sends an Approve/Reject card). Pass inbox_source_id ' +
        'when promoting an inbox item (it will be marked processed). Dates: due_date ' +
        'is YYYY-MM-DD; reminder_at is full ISO-8601 with offset, e.g. ' +
        '2026-07-01T14:30:00-06:00 (a reminder_at makes the task ping him at that time).',
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
        // "Area" = a business/client (e.g. leavitt, tu-clean, mtk, ezcoupons,
        // saasless) OR a personal life category (health, money, relationships,
        // intelligence, household). Free-form so Claude can route to the right
        // business; unknown keys still render (the app falls back gracefully).
        category: z.string().default('household'),
        difficulty: z.enum(['trivial', 'easy', 'medium', 'hard', 'epic', 'legendary']).default('medium'),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        reminder_at: z.string().optional(),
        auto_approve: z.boolean().default(true),
        inbox_source_id: z.string().uuid().optional(),
        source: z.string().default('chat'),
        reasoning: z.string().optional(),
      },
    },
    async (args) => {
      const direct = args.auto_approve !== false
      const row = {
        title: args.title,
        description: args.description ?? null,
        category: args.category,
        difficulty: args.difficulty,
        xp_value: DIFFICULTY_XP[args.difficulty] ?? 25,
        status: 'available',
        approval_status: direct ? 'approved' : 'proposed',
        external_source: args.source,
        metadata: {
          created_by: 'claude',
          source: args.source,
          ...(args.reasoning ? { reasoning: args.reasoning } : {}),
        },
      }
      if (args.priority) row.priority = args.priority
      if (args.due_date) row.due_date = args.due_date
      if (args.reminder_at) row.reminder_at = args.reminder_at
      if (args.inbox_source_id) row.inbox_source_id = args.inbox_source_id

      let task
      try {
        task = await insertProposed(row)
      } catch (e) {
        if (e?.code === '23505') {
          return text(`A matching task already exists (dedupe). Not creating a duplicate.`)
        }
        throw new Error(e?.message || String(e))
      }

      if (args.inbox_source_id) {
        await markInboxProcessed(args.inbox_source_id)
      }

      // Direct-add: one "task added" FYI push, no approval card.
      // auto_approve=false: the legacy approve/reject flow (push + Slack card).
      const [push, slack] = await Promise.all([
        sendPushToUser({
          title: direct ? '✅ Task added' : 'Approve task?',
          body: task.title,
          url: '/quests',
          tag: direct ? `task-${task.id}` : `approve-${task.id}`,
        }),
        direct ? Promise.resolve({ posted: false }) : postApprovalCard(task),
      ])

      await logAction(direct ? 'create' : 'propose', {
        questId: task.id,
        summary: task.title,
        payload: { ...row, push, slack },
      })

      const pushNote = push.skipped
        ? ' (push disabled)'
        : push.noDevices
          ? ' (no registered devices)'
          : ` (pushed to ${push.sent} device${push.sent === 1 ? '' : 's'})`
      const slackNote = slack.posted ? ' + Slack card' : ''
      return text(
        direct
          ? `Added "${task.title}" (${short(task.id)})${pushNote}.`
          : `Proposed "${task.title}" (${short(task.id)}) — awaiting approval${pushNote}${slackNote}.`,
      )
    },
  )

  // --- approve_task --------------------------------------------------------
  server.registerTool(
    'approve_task',
    {
      title: 'Approve a task',
      description: 'Promote a proposed task to official (approved). Approved tasks with a reminder_at will ping Matt when due.',
      inputSchema: { task_id: z.string().uuid() },
    },
    async ({ task_id }) => {
      const before = await getTask(task_id)
      if (!before) return text(`No task ${short(task_id)} found.`)
      const task = await updateTask(task_id, { approval_status: 'approved' })
      await logAction('approve', { questId: task_id, summary: task?.title })
      return text(`Approved "${task?.title}" (${short(task_id)}). It is now official.`)
    },
  )

  // --- reject_task ---------------------------------------------------------
  server.registerTool(
    'reject_task',
    {
      title: 'Reject a task',
      description: 'Dismiss a proposed task (kept for audit, hidden from the board).',
      inputSchema: { task_id: z.string().uuid(), reason: z.string().optional() },
    },
    async ({ task_id, reason }) => {
      const task = await updateTask(task_id, { approval_status: 'rejected' })
      if (!task) return text(`No task ${short(task_id)} found.`)
      await logAction('reject', { questId: task_id, summary: task.title, payload: { reason } })
      return text(`Rejected "${task.title}" (${short(task_id)}).`)
    },
  )

  // --- complete_task -------------------------------------------------------
  server.registerTool(
    'complete_task',
    {
      title: 'Complete a task',
      description: 'Mark a task done.',
      inputSchema: { task_id: z.string().uuid() },
    },
    async ({ task_id }) => {
      const task = await updateTask(task_id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      if (!task) return text(`No task ${short(task_id)} found.`)
      await logAction('complete', { questId: task_id, summary: task.title })
      return text(`Completed "${task.title}" (${short(task_id)}).`)
    },
  )

  // --- reschedule_task -----------------------------------------------------
  server.registerTool(
    'reschedule_task',
    {
      title: 'Reschedule a task',
      description:
        'Change a task\'s due date and/or reminder time. due_date is YYYY-MM-DD; ' +
        'reminder_at is full ISO-8601 with offset. Pass at least one.',
      inputSchema: {
        task_id: z.string().uuid(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        reminder_at: z.string().nullable().optional(),
      },
    },
    async ({ task_id, due_date, reminder_at }) => {
      const updates = {}
      if (due_date !== undefined) updates.due_date = due_date
      if (reminder_at !== undefined) updates.reminder_at = reminder_at
      if (Object.keys(updates).length === 0) return text('Nothing to change — pass due_date or reminder_at.')
      const task = await updateTask(task_id, updates)
      if (!task) return text(`No task ${short(task_id)} found.`)
      await logAction('reschedule', { questId: task_id, summary: task.title, payload: updates })
      return text(`Rescheduled "${task.title}" (${short(task_id)}).`)
    },
  )

  // --- set_priority --------------------------------------------------------
  server.registerTool(
    'set_priority',
    {
      title: 'Set task priority',
      description:
        'Set or clear a task\'s priority — "high", "medium", "low", or null to ' +
        'clear it. Use this to surface what matters most; the board and briefing ' +
        'weight higher-priority tasks.',
      inputSchema: {
        task_id: z.string().uuid(),
        priority: z.enum(['low', 'medium', 'high']).nullable(),
      },
    },
    async ({ task_id, priority }) => {
      const task = await updateTask(task_id, { priority })
      if (!task) return text(`No task ${short(task_id)} found.`)
      await logAction('set_priority', { questId: task_id, summary: task.title, payload: { priority } })
      return text(
        priority
          ? `Set "${task.title}" (${short(task_id)}) to ${priority} priority.`
          : `Cleared priority on "${task.title}" (${short(task_id)}).`,
      )
    },
  )

  // --- dismiss_inbox -------------------------------------------------------
  server.registerTool(
    'dismiss_inbox',
    {
      title: 'Dismiss an inbox item',
      description: 'Mark an inbox item processed without creating a task (it was not actionable).',
      inputSchema: { inbox_id: z.string().uuid() },
    },
    async ({ inbox_id }) => {
      await markInboxProcessed(inbox_id)
      await logAction('dismiss_inbox', { payload: { inbox_id } })
      return text(`Dismissed inbox item ${short(inbox_id)}.`)
    },
  )

  // --- morning_briefing ----------------------------------------------------
  server.registerTool(
    'morning_briefing',
    {
      title: 'Morning briefing',
      description:
        'Get the daily digest: tasks awaiting approval, overdue tasks, and tasks ' +
        'due today. Use this to open the day.',
      inputSchema: {},
    },
    async () => {
      const [pending, overdue, today] = await Promise.all([
        listTasks('pending', 50),
        listTasks('overdue', 50),
        listTasks('today', 50),
      ])
      const sec = (label, arr) =>
        `${label} (${arr.length}):\n` + (arr.length ? arr.map(fmtTask).join('\n') : '  —none—')
      const body = [
        `Morning briefing for ${todayStr()} (${config.userTz})`,
        '',
        sec('⏳ Awaiting approval', pending),
        '',
        sec('⚠️ Overdue', overdue),
        '',
        sec('📅 Due today', today),
      ].join('\n')
      return text(body)
    },
  )

  // --- slot_task -----------------------------------------------------------
  server.registerTool(
    'slot_task',
    {
      title: 'Slot a task into the week',
      description:
        'Place a task into Matt\'s week during planning. Set planned_day (YYYY-MM-DD, ' +
        'the day he\'ll do it), reminder_at (ISO-8601 with offset — the time block, which ' +
        'makes his phone ping at that time), focus_week (the Monday YYYY-MM-DD to add it to ' +
        'this week\'s focus list; omit and pass focus_week="auto" to use the current week), ' +
        'and/or priority. Pass any subset; null clears a field. This is how the Monday PLAN ' +
        'builds the week and how tasks get their intraday reminders.',
      inputSchema: {
        task_id: z.string().uuid(),
        planned_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        reminder_at: z.string().nullable().optional(),
        focus_week: z.union([z.literal('auto'), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).nullable().optional(),
        priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
      },
    },
    async ({ task_id, planned_day, reminder_at, focus_week, priority }) => {
      const updates = {}
      if (planned_day !== undefined) updates.planned_day = planned_day
      if (reminder_at !== undefined) updates.reminder_at = reminder_at
      if (priority !== undefined) updates.priority = priority
      if (focus_week !== undefined) updates.focus_week = focus_week === 'auto' ? mondayStr() : focus_week
      if (Object.keys(updates).length === 0) {
        return text('Nothing to slot — pass planned_day, reminder_at, focus_week, or priority.')
      }
      const task = await updateTask(task_id, updates)
      if (!task) return text(`No task ${short(task_id)} found.`)
      await logAction('slot', { questId: task_id, summary: task.title, payload: updates })
      return text(`Slotted "${task.title}" (${short(task_id)}):\n` + fmtTask(task))
    },
  )

  // --- whats_next ----------------------------------------------------------
  server.registerTool(
    'whats_next',
    {
      title: 'What should I do next?',
      description:
        'Answer "what\'s next?" with the single best task to do right now, plus a ' +
        'couple of alternates. Ranks by where Matt is in the day: the time-slot he\'s ' +
        'in now > today\'s day-slots > overdue > this week\'s focus > due today. Use ' +
        'this whenever Matt asks what to work on.',
      inputSchema: {
        alternates: z.number().int().min(0).max(5).default(2),
      },
    },
    async ({ alternates }) => {
      const ranked = await getRankedNext()
      if (ranked.length === 0) return text('Nothing open right now — you\'re clear. 🎉')
      const top = ranked[0]
      const rest = ranked.slice(1, 1 + alternates)
      const lines = [
        `▶️ Next: ${top.title} (${short(top.id)}) — ${top.reason}`,
        `   ${fmtTask(top).replace(/^• /, '')}`,
      ]
      if (rest.length) {
        lines.push('', 'Then:')
        for (const t of rest) lines.push(`  • ${t.title} (${short(t.id)}) — ${t.reason}`)
      }
      return text(lines.join('\n'))
    },
  )

  return server
}
