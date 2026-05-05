import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

function generateToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `cq_${b64}`
}

export function useDeviceTokens() {
  const { user } = useAuth()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTokens = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('device_import_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setTokens(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const createToken = async (label) => {
    if (!user) return { error: new Error('Not authenticated') }
    const token = generateToken()
    const { data, error } = await supabase
      .from('device_import_tokens')
      .insert({ token, user_id: user.id, label: label || 'iPhone' })
      .select()
      .single()
    if (!error) await fetchTokens()
    return { data, error }
  }

  const revokeToken = async (token) => {
    const { error } = await supabase
      .from('device_import_tokens')
      .delete()
      .eq('token', token)
    if (!error) await fetchTokens()
    return { error }
  }

  const testToken = async (token) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-from-device`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: [] }),
      })
      let body
      try { body = await res.json() } catch { body = null }
      if (!res.ok) return { ok: false, status: res.status, error: body?.error || `HTTP ${res.status}` }
      // Successful empty-batch call updates last_used_at server-side.
      await fetchTokens()
      return { ok: true, body }
    } catch (err) {
      return { ok: false, error: err.message || 'network error' }
    }
  }

  return { tokens, loading, createToken, revokeToken, testToken }
}
