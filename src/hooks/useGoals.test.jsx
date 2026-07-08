// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGoals } from './useGoals'

// Guards the HQ goals contract:
//   - bottlenecks sort before goals (the Monday planner treats them as the
//     ordering spine, so the UI must show them the same way)
//   - addGoal inserts with the user id and trimmed title

const _insertCalls = []
let _queryData = []

function makeChain() {
  const chain = {
    then: (resolve, reject) =>
      Promise.resolve({ data: _queryData, error: null }).then(resolve, reject),
    single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    insert: vi.fn((row) => { _insertCalls.push(row); return chain }),
    update: vi.fn(() => chain),
  }
  return chain
}

let _chain = makeChain()

vi.mock('../config/supabase', () => ({
  supabase: { from: () => _chain },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

beforeEach(() => {
  _queryData = []
  _insertCalls.length = 0
  _chain = makeChain()
})

describe('useGoals', () => {
  it('sorts bottlenecks before goals regardless of fetch order', async () => {
    _queryData = [
      { id: 'g1', kind: 'goal', status: 'active' },
      { id: 'b1', kind: 'bottleneck', status: 'active' },
      { id: 'g2', kind: 'goal', status: 'active' },
    ]
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.goals[0].id).toBe('b1')
  })

  it('addGoal inserts the trimmed title pinned to the user', async () => {
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await result.current.addGoal({ title: '  Ship MTK dashboard  ', kind: 'bottleneck' })
    expect(_insertCalls[0]).toMatchObject({
      user_id: 'user-1',
      title: 'Ship MTK dashboard',
      kind: 'bottleneck',
    })
  })
})
