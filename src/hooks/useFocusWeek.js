import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

// Data for the Week board: this focus week's rows (including completed, shown
// checked-off) PLUS the active backlog, so tasks can be slotted from the board.
// Deliberately separate from useQuests, which carries quest-lifecycle mutation
// logic the board doesn't need. Approval/parent filtering happens client-side
// in boardQuests()/splitBoard() to stay null-tolerant like QuestsPage.
export function useFocusWeek(weekMonday) {
  const { user } = useAuth()
  const id = useId()
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWeek = useCallback(async () => {
    if (!user || !weekMonday) return
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['available', 'in_progress', 'completed'])
      // this week's rows (any board status) OR still-open rows from any week —
      // completed history outside this week stays excluded
      .or(`focus_week.eq.${weekMonday},status.in.(available,in_progress)`)
      .order('planned_day', { ascending: true, nullsFirst: false })
      .order('reminder_at', { ascending: true, nullsFirst: false })
    if (data) setQuests(data)
    setLoading(false)
  }, [user, weekMonday])

  useEffect(() => {
    fetchWeek()
  }, [fetchWeek])

  // Realtime: refetch on any of the user's quest changes. Channel is
  // useId()-namespaced per the repo convention (see 1f49491) so multiple
  // mounts don't collide on postgres_changes.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`focus-week-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quests',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchWeek()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, id, fetchWeek])

  // Board edits: move a task between days/blocks or in/out of the focus week.
  // Writes scheduling fields only (focus_week / planned_day / reminder_at) —
  // the same fields slot_task touches. The routines reconcile the matching
  // [core-quest] calendar event on their next run.
  const moveQuest = async (questId, updates) => {
    const { data, error } = await supabase
      .from('quests')
      .update(updates)
      .eq('id', questId)
      .select()
      .single()
    if (!error) fetchWeek()
    return { data, error }
  }

  return { quests, loading, moveQuest, refresh: fetchWeek }
}
