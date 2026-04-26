import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

function dayKey(date) {
  return date.toISOString().slice(0, 10)
}

function buildEmptyDays(days) {
  const out = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push({ date: dayKey(d), xp: 0 })
  }
  return out
}

export function useStatsTimeseries(days = 30) {
  const { user } = useAuth()
  const [series, setSeries] = useState([])
  const [byCategory, setByCategory] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchSeries = useCallback(async () => {
    if (!user) return
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('xp_events')
      .select('xp_earned, category, earned_at')
      .eq('user_id', user.id)
      .gte('earned_at', start.toISOString())

    const buckets = Object.fromEntries(buildEmptyDays(days).map(d => [d.date, { date: d.date, xp: 0 }]))
    const byCat = {}

    for (const ev of data || []) {
      const key = dayKey(new Date(ev.earned_at))
      if (!buckets[key]) continue
      buckets[key].xp += ev.xp_earned || 0
      const cat = ev.category || 'uncategorized'
      if (!byCat[cat]) byCat[cat] = 0
      byCat[cat] += ev.xp_earned || 0
    }

    let cumulative = 0
    const ordered = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date))
    for (const point of ordered) {
      cumulative += point.xp
      point.cumulative = cumulative
    }

    setSeries(ordered)
    setByCategory(byCat)
    setLoading(false)
  }, [user, days])

  useEffect(() => {
    fetchSeries()
  }, [fetchSeries])

  return { series, byCategory, loading, refresh: fetchSeries }
}
