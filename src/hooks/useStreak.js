import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { calculateStreak } from '../utils/streak'

export function useStreak() {
  const { user } = useAuth()
  const [streak, setStreak] = useState({ current: 0, best: 0 })
  const [loading, setLoading] = useState(true)

  const fetchStreak = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('xp_events')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const result = calculateStreak(data)
      setStreak(result)

      // Update profile with current streak
      await supabase
        .from('profiles')
        .update({
          current_streak: result.current,
          best_streak: Math.max(result.best, result.current),
        })
        .eq('id', user.id)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchStreak()
  }, [fetchStreak])

  return { ...streak, loading, refresh: fetchStreak }
}
