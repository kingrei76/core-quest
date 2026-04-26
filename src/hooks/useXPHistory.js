import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

const PAGE_SIZE = 50

export function useXPHistory() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const fetchPage = useCallback(async (pageNum) => {
    if (!user) return
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('xp_events')
      .select('id, xp_earned, category, earned_at, quest_id, quests(title, difficulty)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .range(from, to)

    if (error) return
    if (pageNum === 0) {
      setEvents(data || [])
    } else {
      setEvents(prev => [...prev, ...(data || [])])
    }
    setHasMore((data?.length || 0) === PAGE_SIZE)
    setLoading(false)
  }, [user])

  useEffect(() => {
    setPage(0)
    fetchPage(0)
  }, [fetchPage])

  const loadMore = () => {
    if (!hasMore || loading) return
    const next = page + 1
    setPage(next)
    fetchPage(next)
  }

  return { events, loading, hasMore, loadMore }
}
