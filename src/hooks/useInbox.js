import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useInbox() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setItems(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Real-time subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('inbox-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inbox_items',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchItems()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, fetchItems])

  const addItem = async (content, type = 'unsorted') => {
    if (!user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('inbox_items')
      .insert({ user_id: user.id, content, type })
      .select()
      .single()
    return { data, error }
  }

  const bulkAddItems = async (contents) => {
    if (!user) return { error: new Error('Not authenticated') }
    const rows = contents.map(content => ({
      user_id: user.id,
      content,
      type: 'unsorted',
    }))
    const { data, error } = await supabase
      .from('inbox_items')
      .insert(rows)
      .select()
    return { data, error }
  }

  const processItem = async (itemId) => {
    const { error } = await supabase
      .from('inbox_items')
      .update({ processed: true })
      .eq('id', itemId)
    return { error }
  }

  const dismissItem = async (itemId) => {
    const { error } = await supabase
      .from('inbox_items')
      .delete()
      .eq('id', itemId)
    return { error }
  }

  const pendingItems = items.filter(i => !i.processed)
  const recentItems = items.slice(0, 20)

  return {
    items,
    pendingItems,
    recentItems,
    loading,
    addItem,
    bulkAddItems,
    processItem,
    dismissItem,
    refresh: fetchItems,
  }
}
