import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './AuthContext'
import { calculateLevel, levelProgress, getTitle, getClass, calculateHP, calculateMP } from '../utils/rpg'

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
  const hp = stats ? calculateHP(level, stats.vitality, stats.wisdom) : 60
  const mp = stats ? calculateMP(level, stats.wisdom, stats.fortune) : 35

  const value = {
    profile,
    stats,
    loading,
    level,
    totalXP,
    progress,
    title,
    characterClass,
    hp,
    mp,
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
