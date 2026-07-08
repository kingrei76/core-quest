// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFocusWeek } from './useFocusWeek'

// These guard the Week board's data contract:
//   - the query is server-filtered to ONE focus week (rides the partial index)
//   - completed rows are included (the board shows them checked off)
//   - the realtime channel subscribes once, namespaced (repo convention 1f49491)

// ---- Supabase mock (thenable chain, same style as useQuests.test.jsx) ----

let _queryData = []
const _eqCalls = []
const _inCalls = []
let _subscribeCount = 0

function makeChain() {
  const chain = {
    then: (resolve, reject) =>
      Promise.resolve({ data: _queryData, error: null }).then(resolve, reject),
    select: vi.fn(() => chain),
    eq: vi.fn((col, val) => { _eqCalls.push([col, val]); return chain }),
    in: vi.fn((col, vals) => { _inCalls.push([col, vals]); return chain }),
    order: vi.fn(() => chain),
  }
  return chain
}

let _chain = makeChain()

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => _chain,
    channel: () => ({
      on: function () { return this },
      subscribe: function () { _subscribeCount += 1; return this },
    }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

beforeEach(() => {
  _queryData = []
  _eqCalls.length = 0
  _inCalls.length = 0
  _subscribeCount = 0
  _chain = makeChain()
})

describe('useFocusWeek', () => {
  it('filters server-side to the given focus week and the board statuses', async () => {
    _queryData = [{ id: 'q1' }]
    const { result } = renderHook(() => useFocusWeek('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(_eqCalls).toContainEqual(['user_id', 'user-1'])
    expect(_eqCalls).toContainEqual(['focus_week', '2026-07-06'])
    // completed must be included — the whiteboard keeps done items visible
    expect(_inCalls).toContainEqual(['status', ['available', 'in_progress', 'completed']])
    expect(result.current.quests).toEqual([{ id: 'q1' }])
  })

  it('does not query without a week, and subscribes to realtime exactly once', async () => {
    const { unmount } = renderHook(() => useFocusWeek(null))
    // No fetch → no eq() recorded for focus_week
    expect(_eqCalls.find(([col]) => col === 'focus_week')).toBeUndefined()
    expect(_subscribeCount).toBe(1)
    unmount()
  })
})
