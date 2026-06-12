// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuests } from './useQuests'

// These guard the quest lifecycle's core business rules:
//   - boss quests double their XP value at creation time
//   - completing a quest always stamps completed_at and only completed_at
//   - xp_value is never mutated by a status transition (XP lives on the row, forever)
//   - recurring quests spawn a successor on completion
//   - getChildren correctly scopes children by parent

// ---- Supabase mock ----
//
// We need a chainable query builder that:
//   a) is "thenable" so `await supabase.from(...).select().eq().order().order()` resolves
//   b) exposes .single() as a terminal resolver for insert/update paths
//   c) records what .insert() and .update() were called with

const _insertCalls = []
const _updateCalls = []
let _queryData = []
let _singleData = {}

function makeChain() {
  const chain = {
    // Thenable — resolves when the select chain is awaited directly (fetchQuests)
    then: (resolve, reject) =>
      Promise.resolve({ data: _queryData, error: null }).then(resolve, reject),
    catch: (fn) =>
      Promise.resolve({ data: _queryData, error: null }).catch(fn),
    // Terminal resolver for .insert().select().single() and .update()...single()
    single: vi.fn(() => Promise.resolve({ data: _singleData, error: null })),
    // Chainable methods — each returns the same chain object
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    in: vi.fn(() => chain),
    filter: vi.fn(() => chain),
    // Mutation trackers
    insert: vi.fn((row) => { _insertCalls.push(row); return chain }),
    update: vi.fn((fields) => { _updateCalls.push(fields); return chain }),
    delete: vi.fn(() => chain),
  }
  return chain
}

let _chain = makeChain()

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => _chain,
    channel: () => ({
      on: function () { return this },
      subscribe: function () { return this },
    }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}))

// ---- Helpers ----

async function renderQuests() {
  const hook = renderHook(() => useQuests())
  // Let mount effects (fetchQuests + channel subscription) run
  await act(async () => {})
  return hook
}

describe('useQuests — createQuest', () => {
  beforeEach(() => {
    _insertCalls.length = 0
    _updateCalls.length = 0
    _queryData = []
    _singleData = {}
    _chain = makeChain()
  })

  it('doubles xp_value when is_boss is true', async () => {
    _singleData = { id: 'q1', xp_value: 100, is_boss: true, status: 'available' }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.createQuest({
        title: 'Dragon Raid',
        xp_value: 50,
        is_boss: true,
        category: 'health',
        difficulty: 'epic',
      })
    })

    expect(_insertCalls).toHaveLength(1)
    expect(_insertCalls[0]).toMatchObject({ xp_value: 100, is_boss: true })
  })

  it('does NOT double xp_value for a regular quest', async () => {
    _singleData = { id: 'q2', xp_value: 25, status: 'available' }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.createQuest({
        title: 'Side Quest',
        xp_value: 25,
        is_boss: false,
        category: 'intelligence',
        difficulty: 'medium',
      })
    })

    expect(_insertCalls[0]).toMatchObject({ xp_value: 25 })
    expect(_insertCalls[0].is_boss).toBeFalsy()
  })

  it('omits recurrence from the row when recurrence is "none"', async () => {
    _singleData = { id: 'q3', status: 'available' }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.createQuest({
        title: 'One-off',
        xp_value: 10,
        recurrence: 'none',
        category: 'health',
        difficulty: 'easy',
      })
    })

    expect(_insertCalls[0]).not.toHaveProperty('recurrence')
  })

  it('includes recurrence in the row when a recurrence type is set', async () => {
    _singleData = { id: 'q4', status: 'available' }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.createQuest({
        title: 'Daily Run',
        xp_value: 10,
        recurrence: 'daily',
        category: 'health',
        difficulty: 'easy',
      })
    })

    expect(_insertCalls[0]).toMatchObject({ recurrence: 'daily' })
  })
})

describe('useQuests — updateQuestStatus', () => {
  beforeEach(() => {
    _insertCalls.length = 0
    _updateCalls.length = 0
    _queryData = []
    _singleData = {}
    _chain = makeChain()
  })

  it('stamps completed_at when transitioning to "completed"', async () => {
    _singleData = { id: 'q5', status: 'completed', xp_value: 50 }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.updateQuestStatus('q5', 'completed')
    })

    expect(_updateCalls[0]).toMatchObject({
      status: 'completed',
      completed_at: expect.any(String),
    })
  })

  it('does NOT add completed_at for non-completion transitions', async () => {
    _singleData = { id: 'q6', status: 'in_progress', xp_value: 50 }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.updateQuestStatus('q6', 'in_progress')
    })

    expect(_updateCalls[0]).not.toHaveProperty('completed_at')
  })

  it('never mutates xp_value during a status transition — XP is permanent', async () => {
    // xp_value lives on the quest row and must not be touched by status changes.
    // If it were modified here, rewards could be lost or double-counted.
    _singleData = { id: 'q7', status: 'completed', xp_value: 200 }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.updateQuestStatus('q7', 'completed')
    })

    // The update payload must only contain status + completed_at, never xp_value
    expect(_updateCalls[0]).not.toHaveProperty('xp_value')
  })

  it('spawns a new recurrence row when a recurring quest is completed', async () => {
    // After completing a recurring quest, spawnNextRecurrence does a second insert
    _singleData = {
      id: 'q8',
      status: 'completed',
      xp_value: 25,
      recurrence: 'daily',
      due_date: '2026-06-10',
      title: 'Daily Meditation',
      category: 'health',
      difficulty: 'easy',
    }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.updateQuestStatus('q8', 'completed')
    })

    // One insert from spawnNextRecurrence
    expect(_insertCalls).toHaveLength(1)
    expect(_insertCalls[0]).toMatchObject({
      title: 'Daily Meditation',
      recurrence: 'daily',
      status: 'available',
    })
  })

  it('does NOT spawn a recurrence for a non-recurring quest', async () => {
    _singleData = { id: 'q9', status: 'completed', xp_value: 25 }
    const { result } = await renderQuests()

    await act(async () => {
      await result.current.updateQuestStatus('q9', 'completed')
    })

    expect(_insertCalls).toHaveLength(0)
  })
})

describe('useQuests — getChildren', () => {
  beforeEach(() => {
    _insertCalls.length = 0
    _updateCalls.length = 0
    _chain = makeChain()
  })

  it('returns only quests with the specified parent_quest_id', async () => {
    _queryData = [
      { id: 'parent', parent_quest_id: null },
      { id: 'child-1', parent_quest_id: 'parent' },
      { id: 'child-2', parent_quest_id: 'parent' },
      { id: 'other', parent_quest_id: 'other-parent' },
    ]
    const { result } = await renderQuests()

    const children = result.current.getChildren('parent')
    expect(children).toHaveLength(2)
    expect(children.map((c) => c.id)).toEqual(['child-1', 'child-2'])
  })

  it('returns an empty array when a quest has no children', async () => {
    _queryData = [{ id: 'solo', parent_quest_id: null }]
    const { result } = await renderQuests()

    expect(result.current.getChildren('solo')).toEqual([])
  })
})
