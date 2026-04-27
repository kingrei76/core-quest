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

  return { tokens, loading, createToken, revokeToken }
}
