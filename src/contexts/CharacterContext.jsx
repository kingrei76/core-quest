import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './AuthContext'
import { calculateLevel, levelProgress, getTitle, getClass, maxHP, maxMP } from '../utils/rpg'

const CharacterContext = createContext(null)

export function CharacterProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchCharacter = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setStats(null)
      setLoading(false)
      return
    }

    const [profileRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('character_stats').select('*').eq('user_id', user.id).single(),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (statsRes.data) setStats(statsRes.data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchCharacter()
  }, [fetchCharacter])

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return

    const profileSub = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        setProfile(payload.new)
      })
      .subscribe()

    const statsSub = supabase
      .channel('stats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'character_stats',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setStats(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(profileSub)
      supabase.removeChannel(statsSub)
    }
  }, [user])

  // Derived values
  const totalXP = profile?.total_xp || 0
  const level = calculateLevel(totalXP)
  const progress = levelProgress(totalXP)
  const title = getTitle(level)
  const characterClass = stats ? getClass(stats) : 'Adventurer'
  const hpMax = stats ? maxHP(level, stats.vitality, stats.wisdom) : 60
  const mpMax = stats ? maxMP(level, stats.wisdom, stats.fortune) : 35
  const currentHp = stats ? Math.max(0, Math.min(stats.current_hp ?? hpMax, hpMax)) : hpMax
  const currentMp = stats ? Math.max(0, Math.min(stats.current_mp ?? mpMax, mpMax)) : mpMax

  const value = {
    profile,
    stats,
    loading,
    level,
    totalXP,
    progress,
    title,
    characterClass,
    hp: currentHp,
    mp: currentMp,
    hpMax,
    mpMax,
    currentHp,
    currentMp,
    refresh: fetchCharacter,
  }

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacter() {
  const context = useContext(CharacterContext)
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider')
  }
  return context
}
