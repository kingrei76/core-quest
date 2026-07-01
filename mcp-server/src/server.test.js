// Tests for the Core Quest MCP server tool handlers.
// Each tool is exercised end-to-end through an in-memory MCP client/server
// pair — no real Supabase calls or push notifications.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must be mocked before any module that imports them is loaded.
// config.js calls process.exit(1) when required env vars are absent.
vi.mock('./config.js', () => ({
  config: {
    supabaseUrl: 'http://localhost:54321',
    serviceRoleKey: 'test-service-key',
    userId: 'test-user-id',
    vapidPublic: null,
    vapidPrivate: null,
    vapidSubject: 'mailto:test@test.com',
    slackBotToken: null,
    slackApprovalChannel: null,
    slackSigningSecret: null,
    userTz: 'America/New_York',
    appUrl: 'https://core-quest.vercel.app',
    sharedSecret: null,
  },
  DIFFICULTY_XP: { trivial: 5, easy: 10, medium: 25, hard: 50, epic: 100, legendary: 200 },
  VALID_CATEGORIES: ['health', 'intelligence', 'money', 'relationships', 'household'],
}))

vi.mock('./supabase.js', () => ({
  listTasks: vi.fn(),
  getInbox: vi.fn(),
  getTask: vi.fn(),
  insertProposed: vi.fn(),
  updateTask: vi.fn(),
  markInboxProcessed: vi.fn(),
  logAction: vi.fn(),
  todayStr: vi.fn(() => '2026-06-14'),
}))

vi.mock('./push.js', () => ({
  sendPushToUser: vi.fn(async () => ({ sent: 1 })),
}))

vi.mock('./slack.js', () => ({
  postApprovalCard: vi.fn(async () => ({ posted: false, skipped: true })),
}))

import { buildServer } from './server.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  listTasks,
  getTask,
  insertProposed,
  updateTask,
  logAction,
  markInboxProcessed,
  getInbox,
} from './supabase.js'

// Wire a fresh server + in-memory client pair, run fn(client), then close.
async function withClient(fn) {
  const server = buildServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'test-client', version: '0.0.1' })
  await client.connect(clientTransport)
  try {
    return await fn(client)
  } finally {
    await client.close()
  }
}

// Grab the text content string from a tool result.
function resultText(result) {
  return result?.content?.[0]?.text ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// list_tasks
// ---------------------------------------------------------------------------

describe('list_tasks', () => {
  it('lists tasks in the active view with title and id excerpt', async () => {
    listTasks.mockResolvedValue([
      { id: 'aaaaaaaa-0000-0000-0000-000000000001', title: 'Buy groceries', status: 'available', approval_status: 'approved' },
      { id: 'bbbbbbbb-0000-0000-0000-000000000002', title: 'Call dentist', status: 'in_progress', approval_status: 'approved' },
    ])

    const text = await withClient((c) => c.callTool({ name: 'list_tasks', arguments: { view: 'active' } }).then(resultText))

    expect(listTasks).toHaveBeenCalledWith('active', 50)
    expect(text).toContain('Buy groceries')
    expect(text).toContain('Call dentist')
    // IDs are truncated to the first 8 chars
    expect(text).toContain('aaaaaaaa')
    expect(text).toContain('bbbbbbbb')
  })

  it('returns an empty-state message when no tasks match the view', async () => {
    listTasks.mockResolvedValue([])

    const text = await withClient((c) =>
      c.callTool({ name: 'list_tasks', arguments: { view: 'today' } }).then(resultText),
    )

    expect(listTasks).toHaveBeenCalledWith('today', 50)
    expect(text).toContain('No tasks')
    expect(text).toContain('today')
  })

  it('forwards the limit argument to the data layer', async () => {
    listTasks.mockResolvedValue([])

    await withClient((c) => c.callTool({ name: 'list_tasks', arguments: { view: 'all', limit: 10 } }))

    expect(listTasks).toHaveBeenCalledWith('all', 10)
  })

  it('includes task metadata (due_date, category, difficulty) in the formatted output', async () => {
    listTasks.mockResolvedValue([
      {
        id: 'cccccccc-0000-0000-0000-000000000003',
        title: 'Write report',
        due_date: '2026-06-20',
        category: 'intelligence',
        difficulty: 'hard',
        status: 'available',
        approval_status: 'approved',
      },
    ])

    const text = await withClient((c) => c.callTool({ name: 'list_tasks', arguments: {} }).then(resultText))

    expect(text).toContain('2026-06-20')
    expect(text).toContain('intelligence')
    expect(text).toContain('hard')
  })
})

// ---------------------------------------------------------------------------
// propose_task
// ---------------------------------------------------------------------------

describe('propose_task', () => {
  const newTask = {
    id: 'dddddddd-0000-0000-0000-000000000004',
    title: 'Fix leaky faucet',
    category: 'household',
    difficulty: 'easy',
    approval_status: 'proposed',
    status: 'available',
  }

  beforeEach(() => {
    insertProposed.mockResolvedValue(newTask)
    logAction.mockResolvedValue(undefined)
  })

  it('creates a task directly (approved) by default and confirms it was added', async () => {
    insertProposed.mockResolvedValue({ ...newTask, approval_status: 'approved' })

    const text = await withClient((c) =>
      c
        .callTool({
          name: 'propose_task',
          arguments: { title: 'Fix leaky faucet', category: 'household', difficulty: 'easy' },
        })
        .then(resultText),
    )

    expect(insertProposed).toHaveBeenCalledOnce()
    const inserted = insertProposed.mock.calls[0][0]
    expect(inserted.title).toBe('Fix leaky faucet')
    // Default is direct-add: task is created approved, no approval step.
    expect(inserted.approval_status).toBe('approved')
    expect(inserted.xp_value).toBe(10) // easy = 10 XP per DIFFICULTY_XP
    expect(text).toContain('Fix leaky faucet')
    expect(text).toContain('Added')
  })

  it('creates a PROPOSED task awaiting approval when auto_approve is false', async () => {
    const text = await withClient((c) =>
      c
        .callTool({
          name: 'propose_task',
          arguments: { title: 'Fix leaky faucet', auto_approve: false },
        })
        .then(resultText),
    )

    const inserted = insertProposed.mock.calls[0][0]
    expect(inserted.approval_status).toBe('proposed')
    expect(text).toContain('awaiting approval')
  })

  it('sets xp_value based on the difficulty passed', async () => {
    insertProposed.mockResolvedValue({ ...newTask, title: 'Epic quest', difficulty: 'legendary' })

    await withClient((c) =>
      c.callTool({ name: 'propose_task', arguments: { title: 'Epic quest', difficulty: 'legendary' } }),
    )

    expect(insertProposed.mock.calls[0][0].xp_value).toBe(200)
  })

  it('marks the inbox source item processed when inbox_source_id is provided', async () => {
    const inboxId = 'eeeeeeee-0000-4000-8000-000000000005'
    markInboxProcessed.mockResolvedValue(undefined)

    await withClient((c) =>
      c.callTool({
        name: 'propose_task',
        arguments: { title: 'A task from inbox', inbox_source_id: inboxId },
      }),
    )

    expect(markInboxProcessed).toHaveBeenCalledWith(inboxId)
  })

  it('does not call markInboxProcessed when no inbox_source_id is given', async () => {
    await withClient((c) =>
      c.callTool({ name: 'propose_task', arguments: { title: 'A standalone task' } }),
    )

    expect(markInboxProcessed).not.toHaveBeenCalled()
  })

  it('logs the create action after adding the task directly', async () => {
    await withClient((c) =>
      c.callTool({ name: 'propose_task', arguments: { title: 'Log me' } }),
    )

    expect(logAction).toHaveBeenCalledWith('create', expect.objectContaining({ questId: newTask.id }))
  })

  it('logs the propose action when auto_approve is false', async () => {
    await withClient((c) =>
      c.callTool({ name: 'propose_task', arguments: { title: 'Log me', auto_approve: false } }),
    )

    expect(logAction).toHaveBeenCalledWith('propose', expect.objectContaining({ questId: newTask.id }))
  })

  it('returns a dedupe message instead of throwing on duplicate-key error', async () => {
    insertProposed.mockRejectedValue({ code: '23505', message: 'duplicate key' })

    const text = await withClient((c) =>
      c
        .callTool({ name: 'propose_task', arguments: { title: 'Duplicate task' } })
        .then(resultText),
    )

    expect(text).toContain('already exists')
    expect(text).toContain('dedupe')
  })
})

// ---------------------------------------------------------------------------
// approve_task
// ---------------------------------------------------------------------------

describe('approve_task', () => {
  const taskId = 'ffffffff-0000-4000-8000-000000000006'

  it('sets approval_status to approved and returns a confirmation', async () => {
    getTask.mockResolvedValue({ id: taskId, title: 'Pay electricity bill' })
    updateTask.mockResolvedValue({ id: taskId, title: 'Pay electricity bill', approval_status: 'approved' })

    const text = await withClient((c) =>
      c.callTool({ name: 'approve_task', arguments: { task_id: taskId } }).then(resultText),
    )

    expect(updateTask).toHaveBeenCalledWith(taskId, { approval_status: 'approved' })
    expect(text).toContain('Approved')
    expect(text).toContain('Pay electricity bill')
  })

  it('returns a not-found message when the task does not exist', async () => {
    getTask.mockResolvedValue(null)

    const text = await withClient((c) =>
      c.callTool({ name: 'approve_task', arguments: { task_id: taskId } }).then(resultText),
    )

    expect(updateTask).not.toHaveBeenCalled()
    expect(text).toContain('No task')
  })

  it('logs the approve action', async () => {
    getTask.mockResolvedValue({ id: taskId, title: 'Some task' })
    updateTask.mockResolvedValue({ id: taskId, title: 'Some task' })

    await withClient((c) => c.callTool({ name: 'approve_task', arguments: { task_id: taskId } }))

    expect(logAction).toHaveBeenCalledWith('approve', expect.objectContaining({ questId: taskId }))
  })
})

// ---------------------------------------------------------------------------
// complete_task
// ---------------------------------------------------------------------------

describe('complete_task', () => {
  const taskId = '11111111-0000-4000-8000-000000000007'

  it('marks the task completed and returns a confirmation', async () => {
    updateTask.mockResolvedValue({ id: taskId, title: 'Mow the lawn' })

    const text = await withClient((c) =>
      c.callTool({ name: 'complete_task', arguments: { task_id: taskId } }).then(resultText),
    )

    expect(updateTask).toHaveBeenCalledWith(
      taskId,
      expect.objectContaining({ status: 'completed', completed_at: expect.any(String) }),
    )
    expect(text).toContain('Completed')
    expect(text).toContain('Mow the lawn')
  })

  it('stamps completed_at as a valid ISO string', async () => {
    updateTask.mockResolvedValue({ id: taskId, title: 'Anything' })

    await withClient((c) => c.callTool({ name: 'complete_task', arguments: { task_id: taskId } }))

    const completedAt = updateTask.mock.calls[0][1].completed_at
    expect(new Date(completedAt).toISOString()).toBe(completedAt)
  })

  it('returns a not-found message when the task does not exist', async () => {
    updateTask.mockResolvedValue(null)

    const text = await withClient((c) =>
      c.callTool({ name: 'complete_task', arguments: { task_id: taskId } }).then(resultText),
    )

    expect(text).toContain('No task')
  })

  it('logs the complete action', async () => {
    updateTask.mockResolvedValue({ id: taskId, title: 'Done task' })

    await withClient((c) => c.callTool({ name: 'complete_task', arguments: { task_id: taskId } }))

    expect(logAction).toHaveBeenCalledWith('complete', expect.objectContaining({ questId: taskId }))
  })
})

// ---------------------------------------------------------------------------
// get_inbox
// ---------------------------------------------------------------------------

describe('get_inbox', () => {
  it('lists unprocessed inbox items', async () => {
    getInbox.mockResolvedValue([
      { id: '22222222-0000-0000-0000-000000000008', content: 'Buy milk', external_source: 'ios-reminders' },
    ])

    const text = await withClient((c) => c.callTool({ name: 'get_inbox', arguments: {} }).then(resultText))

    expect(getInbox).toHaveBeenCalledWith(50)
    expect(text).toContain('Buy milk')
  })

  it('returns an empty-state message when inbox is clear', async () => {
    getInbox.mockResolvedValue([])

    const text = await withClient((c) => c.callTool({ name: 'get_inbox', arguments: {} }).then(resultText))

    expect(text).toContain('empty')
  })
})
