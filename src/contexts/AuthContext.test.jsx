// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// These tests verify that AuthContext correctly proxies Supabase auth calls,
// manages session state, and cleans up listeners on unmount.

// ---- Mock supabase before anything imports it ----

const mockUnsubscribe = vi.fn()

// Auth mock functions — mutated per-test via mockImplementation/mockResolvedValue
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignInWithOtp = vi.fn()
const mockVerifyOtp = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...a) => mockGetSession(...a),
      onAuthStateChange: (...a) => mockOnAuthStateChange(...a),
      signInWithPassword: (...a) => mockSignInWithPassword(...a),
      signInWithOtp: (...a) => mockSignInWithOtp(...a),
      verifyOtp: (...a) => mockVerifyOtp(...a),
      signOut: (...a) => mockSignOut(...a),
    },
  },
}))

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

function setupDefaultMocks() {
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } })
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('starts in loading state, then resolves to no session when unauthenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    // synchronously loading=true before getSession resolves
    expect(result.current.loading).toBe(true)
    expect(result.current.session).toBe(null)
    await act(async () => {})
    expect(result.current.loading).toBe(false)
    expect(result.current.session).toBe(null)
    expect(result.current.user).toBe(null)
  })

  it('exposes session and user once getSession resolves with an active session', async () => {
    const fakeSession = { user: { id: 'u1', email: 'matt@example.com' } }
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})

    expect(result.current.session).toBe(fakeSession)
    expect(result.current.user).toBe(fakeSession.user)
    expect(result.current.loading).toBe(false)
  })

  it('updates session when onAuthStateChange fires a SIGNED_IN event', async () => {
    let authChangeCallback
    mockOnAuthStateChange.mockImplementation((cb) => {
      authChangeCallback = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    expect(result.current.session).toBe(null)

    const newSession = { user: { id: 'u2', email: 'new@example.com' } }
    await act(async () => { authChangeCallback('SIGNED_IN', newSession) })
    expect(result.current.session).toBe(newSession)
    expect(result.current.user).toBe(newSession.user)
  })

  it('clears session when onAuthStateChange fires a SIGNED_OUT event', async () => {
    const fakeSession = { user: { id: 'u3' } }
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } })

    let authChangeCallback
    mockOnAuthStateChange.mockImplementation((cb) => {
      authChangeCallback = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    expect(result.current.session).toBe(fakeSession)

    await act(async () => { authChangeCallback('SIGNED_OUT', null) })
    expect(result.current.session).toBe(null)
    expect(result.current.user).toBe(null)
  })

  it('signInWithPassword forwards credentials to supabase and returns the result', async () => {
    const fakeResult = { data: { user: { id: 'u1' }, session: {} }, error: null }
    mockSignInWithPassword.mockResolvedValue(fakeResult)

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})

    let res
    await act(async () => {
      res = await result.current.signInWithPassword('a@b.com', 'hunter2')
    })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'hunter2' })
    expect(res).toEqual(fakeResult)
  })

  it('verifyOtp forwards email + token to supabase', async () => {
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})

    await act(async () => { await result.current.verifyOtp('a@b.com', '123456') })
    expect(mockVerifyOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', token: '123456', type: 'email' })
    )
  })

  it('signOut delegates to supabase.auth.signOut and surfaces any error', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})

    let res
    await act(async () => { res = await result.current.signOut() })
    expect(mockSignOut).toHaveBeenCalledOnce()
    expect(res.error).toBe(null)
  })

  it('unsubscribes from the auth listener when the component unmounts', async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {})
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledOnce()
  })

  it('useAuth throws when used outside an AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
    consoleSpy.mockRestore()
  })
})
