import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  currentDailyPeriod,
  currentWeeklyPeriod,
  generateDailyChallenges,
  generateWeeklyChallenges,
  questMatchesChallenge,
} from '../utils/challenges'

export function useChallenges() {
  const { user } = useAuth()
  const id = useId()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchChallenges = useCallback(async () => {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_end', today)
      .order('scope', { ascending: true })
    if (data) setChallenges(data)
    setLoading(false)
  }, [user])

  const ensureForPeriod = useCallback(async () => {
    if (!user) return
    const daily = currentDailyPeriod()
    const weekly = currentWeeklyPeriod()

    const { data: existing } = await supabase
      .from('challenges')
      .select('kind, period_start')
      .eq('user_id', user.id)
      .in('period_start', [daily.start, weekly.start])

    const existingKeys = new Set((existing || []).map(c => `${c.kind}|${c.period_start}`))

    const candidates = [
      ...generateDailyChallenges(),
      ...generateWeeklyChallenges(),
    ].map(c => ({ ...c, user_id: user.id }))

    const toInsert = candidates.filter(c => !existingKeys.has(`${c.kind}|${c.period_start}`))
    if (toInsert.length === 0) return
    await supabase.from('challenges').insert(toInsert)
    await fetchChallenges()
  }, [user, fetchChallenges])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

  useEffect(() => {
    ensureForPeriod()
  }, [ensureForPeriod])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`challenge-changes-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenges',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchChallenges())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, id, fetchChallenges])

  const recordCompletion = useCallback(async (quest) => {
    if (!user) return { granted: 0 }
    const active = challenges.filter(c => !c.completed_at && questMatchesChallenge(quest, c))
    if (active.length === 0) return { granted: 0 }

    let bonusXp = 0
    for (const ch of active) {
      const newProgress = (ch.progress || 0) + 1
      const reachedTarget = newProgress >= ch.target_count
      const updates = { progress: newProgress }
      if (reachedTarget) {
        updates.completed_at = new Date().toISOString()
        bonusXp += ch.reward_xp
      }
      await supabase.from('challenges').update(updates).eq('id', ch.id)
    }

    if (bonusXp > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.id)
        .single()
      const newTotal = (profile?.total_xp || 0) + bonusXp
      await supabase.from('profiles').update({ total_xp: newTotal }).eq('id', user.id)
      await supabase.from('xp_events').insert({
        user_id: user.id,
        xp_earned: bonusXp,
        category: quest.category,
        earned_at: new Date().toISOString(),
      })
    }

    return { granted: bonusXp }
  }, [user, challenges])

  return { challenges, loading, recordCompletion, refresh: fetchChallenges }
}
