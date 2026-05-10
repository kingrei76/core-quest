import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCharacter } from '../contexts/CharacterContext'
import { useVitals } from './useVitals'
import { getQuestXP, getStatGain, getCategoryStat, getQuestAP } from '../utils/rpg'

export function useXP() {
  const { user } = useAuth()
  const { profile, stats, refresh } = useCharacter()
  const { rewardForCompletion } = useVitals()

  const awardQuestXP = async (quest) => {
    if (!user || !profile || !stats) return { error: new Error('Not ready') }

    const streakDays = profile.current_streak || 0
    const xpEarned = getQuestXP(quest.difficulty, streakDays)
    const statGain = getStatGain(quest.difficulty)
    const targetStat = getCategoryStat(quest.category)
    const { ap: apEarned, isCrit: apIsCrit } = getQuestAP(quest.difficulty)

    // Insert XP event
    const { error: xpError } = await supabase
      .from('xp_events')
      .insert({
        user_id: user.id,
        quest_id: quest.id,
        xp_earned: xpEarned,
        category: quest.category,
        earned_at: new Date().toISOString(),
      })

    if (xpError) return { error: xpError }

    // Update profile total XP
    const newTotalXP = (profile.total_xp || 0) + xpEarned
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ total_xp: newTotalXP })
      .eq('id', user.id)

    if (profileError) return { error: profileError }

    // Update character stat + bank AP
    const newStatVal = (stats[targetStat] || 10) + statGain
    const newAP = (stats.action_points || 0) + apEarned
    const { error: statsError } = await supabase
      .from('character_stats')
      .update({
        [targetStat]: newStatVal,
        action_points: newAP,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (statsError) return { error: statsError }

    // Refresh character context, then top up vitals
    await refresh()
    await rewardForCompletion()

    return { xpEarned, statGain, targetStat, apEarned, apIsCrit }
  }

  return { awardQuestXP }
}
