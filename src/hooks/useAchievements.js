import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCharacter } from '../contexts/CharacterContext'
import { ACHIEVEMENTS } from '../config/achievements'

export function useAchievements() {
  const { user } = useAuth()
  const { profile, stats, level } = useCharacter()
  const id = useId()
  const [unlocked, setUnlocked] = useState([])
  const [recentlyUnlocked, setRecentlyUnlocked] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchUnlocked = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', user.id)
    if (data) setUnlocked(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchUnlocked()
  }, [fetchUnlocked])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`achievement-changes-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'achievements',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setUnlocked(prev => [...prev, payload.new])
        setRecentlyUnlocked(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, id])

  const evaluate = useCallback(async () => {
    if (!user || !profile || !stats) return
    const { data: events } = await supabase
      .from('xp_events')
      .select('category, quest_id')
      .eq('user_id', user.id)
      .not('quest_id', 'is', null)
    const completedCount = events?.length || 0
    const completionsByCategory = {}
    for (const ev of events || []) {
      if (!ev.category) continue
      completionsByCategory[ev.category] = (completionsByCategory[ev.category] || 0) + 1
    }
    const ctx = {
      profile,
      stats,
      level,
      completedCount,
      currentStreak: profile.current_streak || 0,
      bestStreak: profile.best_streak || 0,
      completionsByCategory,
    }

    const unlockedKeys = new Set(unlocked.map(u => u.key))
    const newlyUnlocked = ACHIEVEMENTS.filter(a => !unlockedKeys.has(a.key) && a.criterion(ctx))
    if (newlyUnlocked.length === 0) return

    const rows = newlyUnlocked.map(a => ({ user_id: user.id, key: a.key }))
    await supabase.from('achievements').insert(rows)
  }, [user, profile, stats, level, unlocked])

  const dismissRecent = useCallback((key) => {
    setRecentlyUnlocked(prev => prev.filter(r => r.key !== key))
  }, [])

  return { unlocked, recentlyUnlocked, dismissRecent, evaluate, loading }
}
