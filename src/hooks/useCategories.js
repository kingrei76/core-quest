import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../config/constants'

const DEFAULT_LIST = Object.entries(CATEGORIES).map(([key, val]) => ({
  key,
  label: val.label,
  stat: val.stat,
  color: val.color,
  archived: false,
  isDefault: true,
}))

export function useCategories() {
  const { user } = useAuth()
  const id = useId()
  const [customRows, setCustomRows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCustom = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setCustomRows(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchCustom()
  }, [fetchCustom])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`user-categories-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_categories',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchCustom())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, id, fetchCustom])

  const customMap = new Map(customRows.map(c => [c.key, c]))

  // Merge defaults with custom: custom rows can override (e.g. archive a default)
  const merged = [
    ...DEFAULT_LIST.map(d => {
      const override = customMap.get(d.key)
      return override ? { ...d, ...override, isDefault: true } : d
    }),
    ...customRows.filter(c => !DEFAULT_LIST.find(d => d.key === c.key)),
  ]

  const visible = merged.filter(c => !c.archived)
  const lookup = Object.fromEntries(merged.map(c => [c.key, { label: c.label, stat: c.stat, color: c.color }]))

  const createCategory = async ({ key, label, stat, color }) => {
    if (!user) return { error: new Error('Not authenticated') }
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const { data, error } = await supabase
      .from('user_categories')
      .insert({ user_id: user.id, key: cleanKey, label, stat, color })
      .select()
      .single()
    return { data, error }
  }

  const updateCategory = async (id, updates) => {
    const { data, error } = await supabase
      .from('user_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  }

  const archiveCategory = (id) => updateCategory(id, { archived: true })
  const unarchiveCategory = (id) => updateCategory(id, { archived: false })

  return {
    visible,
    all: merged,
    lookup,
    loading,
    createCategory,
    updateCategory,
    archiveCategory,
    unarchiveCategory,
  }
}
