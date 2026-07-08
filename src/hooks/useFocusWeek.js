import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

// Week-scoped read for the Week board: only rows the Monday routine stamped
// into this focus week (rides the (user_id, focus_week) partial index).
// Deliberately separate from useQuests, which fetches everything and carries
// mutation logic the board doesn't need. Approval/parent filtering happens
// client-side in boardQuests() to stay null-tolerant like QuestsPage.
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
      .eq('focus_week', weekMonday)
      .in('status', ['available', 'in_progress', 'completed'])
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

  return { quests, loading, refresh: fetchWeek }
}
