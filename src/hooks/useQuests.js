import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useQuests() {
  const { user } = useAuth()
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQuests = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setQuests(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchQuests()
  }, [fetchQuests])

  // Real-time subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('quest-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quests',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchQuests()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, fetchQuests])

  const createQuest = async ({ title, description, category, difficulty, xp_value, inbox_source_id, due_date, reminder_at }) => {
    if (!user) return { error: new Error('Not authenticated') }
    const row = {
      user_id: user.id,
      title,
      description,
      category,
      difficulty,
      xp_value,
      status: 'available',
      inbox_source_id,
    }
    if (due_date) row.due_date = due_date
    if (reminder_at) row.reminder_at = reminder_at
    const { data, error } = await supabase
      .from('quests')
      .insert(row)
      .select()
      .single()
    return { data, error }
  }

  const updateQuestStatus = async (questId, status) => {
    const updates = { status }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('quests')
      .update(updates)
      .eq('id', questId)
      .select()
      .single()
    return { data, error }
  }

  return {
    quests,
    loading,
    createQuest,
    updateQuestStatus,
    refresh: fetchQuests,
  }
}
