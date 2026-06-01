// Builds the Core Quest MCP server and registers the task-management tools.
// No game logic here — this server gathers, proposes, approves, and reminds.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DIFFICULTY_XP, VALID_CATEGORIES, config } from './config.js'
import {
  listTasks,
  getInbox,
  getTask,
  insertProposed,
  updateTask,
  markInboxProcessed,
  logAction,
  todayStr,
} from './supabase.js'
import { sendPushToUser } from './push.js'

const short = (id) => (id ? String(id).slice(0, 8) : '?')

function fmtTask(q) {
  const bits = []
  if (q.due_date) bits.push(`due ${q.due_date}`)
  if (q.category) bits.push(q.category)
  if (q.difficulty) bits.push(q.difficulty)
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
        '"pending" (proposed, awaiting his approval), "active" (all approved & open), ' +
        'or "all". Use this to see what is on his plate.',
      inputSchema: {
        view: z.enum(['today', 'overdue', 'upcoming', 'pending', 'active', 'all']).default('active'),
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
      title: 'Propose a task',
      description:
        'Create a task for Matt to approve. It is saved as PROPOSED (not official) ' +
        'and immediately pushes an approval notification to his phone. He approves ' +
        'or rejects it. Pass inbox_source_id when promoting an inbox item (it will ' +
        'be marked processed). Dates: due_date is YYYY-MM-DD; reminder_at is full ' +
        'ISO-8601 with offset, e.g. 2026-06-01T14:30:00-04:00.',
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(VALID_CATEGORIES).default('household'),
        difficulty: z.enum(['trivial', 'easy', 'medium', 'hard', 'epic', 'legendary']).default('medium'),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        reminder_at: z.string().optional(),
        inbox_source_id: z.string().uuid().optional(),
        source: z.string().default('chat'),
        reasoning: z.string().optional(),
      },
    },
    async (args) => {
      const row = {
        title: args.title,
        description: args.description ?? null,
        category: args.category,
        difficulty: args.difficulty,
        xp_value: DIFFICULTY_XP[args.difficulty] ?? 25,
        status: 'available',
        approval_status: 'proposed',
        external_source: args.source,
        metadata: {
          created_by: 'claude',
          source: args.source,
          ...(args.reasoning ? { reasoning: args.reasoning } : {}),
        },
      }
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

      const push = await sendPushToUser({
        title: 'Approve task?',
        body: task.title,
        url: '/quests',
        tag: `approve-${task.id}`,
      })

      await logAction('propose', {
        questId: task.id,
        summary: task.title,
        payload: { ...row, push },
      })

      const pushNote = push.skipped
        ? ' (push disabled)'
        : push.noDevices
          ? ' (no registered devices)'
          : ` (pushed to ${push.sent} device${push.sent === 1 ? '' : 's'})`
      return text(`Proposed "${task.title}" (${short(task.id)}) — awaiting approval${pushNote}.`)
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

  return server
}
