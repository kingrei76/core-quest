import { useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCharacter } from '../contexts/CharacterContext'

const PENALTY_PCT = 0.05
const HEAL_PCT = 0.10
const RESTORE_MP_PCT = 0.05

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max))
}

function isOverdue(quest, now) {
  if (!quest.due_date) return false
  if (quest.status !== 'available' && quest.status !== 'in_progress') return false
  const due = new Date(quest.due_date + 'T23:59:59')
  return due < now
}

export function useVitals() {
  const { user } = useAuth()
  const { stats, hpMax, mpMax, refresh } = useCharacter()

  const writeVitals = useCallback(async ({ hp, mp, lastPenaltyAt }) => {
    if (!user || !stats) return
    const updates = { updated_at: new Date().toISOString() }
    if (hp !== undefined) updates.current_hp = clamp(Math.round(hp), 0, hpMax)
    if (mp !== undefined) updates.current_mp = clamp(Math.round(mp), 0, mpMax)
    if (lastPenaltyAt !== undefined) updates.last_penalty_at = lastPenaltyAt
    const { error } = await supabase
      .from('character_stats')
      .update(updates)
      .eq('user_id', user.id)
    if (!error) await refresh()
    return { error }
  }, [user, stats, hpMax, mpMax, refresh])

  const damage = useCallback((amount) => {
    return writeVitals({ hp: (stats?.current_hp ?? hpMax) - amount })
  }, [stats, hpMax, writeVitals])

  const heal = useCallback((amount) => {
    return writeVitals({ hp: (stats?.current_hp ?? hpMax) + amount })
  }, [stats, hpMax, writeVitals])

  const spendMP = useCallback((amount) => {
    return writeVitals({ mp: (stats?.current_mp ?? mpMax) - amount })
  }, [stats, mpMax, writeVitals])

  const restoreMP = useCallback((amount) => {
    return writeVitals({ mp: (stats?.current_mp ?? mpMax) + amount })
  }, [stats, mpMax, writeVitals])

  const rewardForCompletion = useCallback(() => {
    return writeVitals({
      hp: (stats?.current_hp ?? hpMax) + Math.floor(hpMax * HEAL_PCT),
      mp: (stats?.current_mp ?? mpMax) + Math.floor(mpMax * RESTORE_MP_PCT),
    })
  }, [stats, hpMax, mpMax, writeVitals])

  const applyDailyMissPenalty = useCallback(async (quests) => {
    if (!user || !stats) return { applied: false }
    const now = new Date()
    const last = stats.last_penalty_at ? new Date(stats.last_penalty_at) : null
    if (last) {
      const sameDay =
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate()
      if (sameDay) return { applied: false }
    }
    const overdueCount = (quests || []).filter(q => isOverdue(q, now)).length
    if (overdueCount === 0) {
      await writeVitals({ lastPenaltyAt: now.toISOString() })
      return { applied: false, overdueCount: 0 }
    }
    const penalty = Math.floor(hpMax * PENALTY_PCT) * overdueCount
    await writeVitals({
      hp: (stats.current_hp ?? hpMax) - penalty,
      lastPenaltyAt: now.toISOString(),
    })
    return { applied: true, overdueCount, penalty }
  }, [user, stats, hpMax, writeVitals])

  return { damage, heal, spendMP, restoreMP, rewardForCompletion, applyDailyMissPenalty }
}
