import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

// Monday review state for a focus week. The Monday routine inserts a 'draft'
// row when it lays out the week; the Week tab shows the review banner until
// Matt has walked every area and taps "start the week" (→ 'confirmed').
// No row (weeks predating this flow) means no banner.
export function useWeekReview(weekMonday) {
  const { user } = useAuth()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchReview = useCallback(async () => {
    if (!user || !weekMonday) return
    const { data } = await supabase
      .from('week_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('focus_week', weekMonday)
      .maybeSingle()
    setReview(data ?? null)
    setLoading(false)
  }, [user, weekMonday])

  useEffect(() => {
    fetchReview()
  }, [fetchReview])

  const confirmWeek = async () => {
    if (!user || !weekMonday) return { error: new Error('No week') }
    const { data, error } = await supabase
      .from('week_reviews')
      .upsert({
        user_id: user.id,
        focus_week: weekMonday,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (!error) setReview(data)
    return { data, error }
  }

  return { review, loading, confirmWeek, refresh: fetchReview }
}
