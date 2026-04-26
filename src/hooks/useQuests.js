import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { isRecurring, nextDueDate, nextReminderAt } from '../utils/recurrence'

export function useQuests() {
  const { user } = useAuth()
  const id = useId()
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
      .channel(`quest-changes-${id}`)
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

  const createQuest = async ({ title, description, category, difficulty, xp_value, inbox_source_id, due_date, reminder_at, recurrence }) => {
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
    if (recurrence && recurrence !== 'none') row.recurrence = recurrence
    const { data, error } = await supabase
      .from('quests')
      .insert(row)
      .select()
      .single()
    return { data, error }
  }

  const spawnNextRecurrence = async (quest) => {
    if (!user || !isRecurring(quest)) return { data: null }
    const row = {
      user_id: user.id,
      title: quest.title,
      description: quest.description,
      category: quest.category,
      difficulty: quest.difficulty,
      xp_value: quest.xp_value,
      status: 'available',
      recurrence: quest.recurrence,
    }
    const due = nextDueDate(quest)
    const remind = nextReminderAt(quest)
    if (due) row.due_date = due
    if (remind) row.reminder_at = remind
    const { data, error } = await supabase
      .from('quests')
      .insert(row)
      .select()
      .single()
    return { data, error }
  }

  const updateQuest = async (questId, updates) => {
    const { data, error } = await supabase
      .from('quests')
      .update(updates)
      .eq('id', questId)
      .select()
      .single()
    return { data, error }
  }

  const deleteQuest = async (questId) => {
    const { error } = await supabase
      .from('quests')
      .delete()
      .eq('id', questId)
    return { error }
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

    if (!error && status === 'completed' && isRecurring(data)) {
      await spawnNextRecurrence(data)
    }

    return { data, error }
  }

  return {
    quests,
    loading,
    createQuest,
    updateQuestStatus,
    spawnNextRecurrence,
    refresh: fetchQuests,
  }
}
