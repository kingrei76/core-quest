import { useCallback, useEffect, useState, useId } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCharacter } from '../contexts/CharacterContext'

const DEFAULT_ENCOUNTER = {
  name: 'Forest Watcher',
  enemy_type: 'skeleton-warrior',
  enemy_hp: 500,
  enemy_hp_max: 500,
}

const STRIKES = {
  basic: { label: 'Basic Strike', ap: 1, baseDamage: 10, randomRange: 6, critChance: 0.1 },
  power: { label: 'Crashing Strike', ap: 5, baseDamage: 50, randomRange: 20, critChance: 0.15 },
}

export function useCombat() {
  const { user } = useAuth()
  const { stats, refresh: refreshCharacter } = useCharacter()
  const id = useId()
  const [encounter, setEncounter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastStrike, setLastStrike] = useState(null)

  const ensureActiveEncounter = useCallback(async () => {
    if (!user) return null
    const { data: existing } = await supabase
      .from('combat_encounters')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing) return existing
    const { data: created } = await supabase
      .from('combat_encounters')
      .insert({ user_id: user.id, ...DEFAULT_ENCOUNTER })
      .select()
      .single()
    return created
  }, [user])

  const fetchEncounter = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const active = await ensureActiveEncounter()
    setEncounter(active)
    setLoading(false)
  }, [user, ensureActiveEncounter])

  useEffect(() => {
    fetchEncounter()
  }, [fetchEncounter])

  useEffect(() => {
    if (!user) return undefined
    const channel = supabase
      .channel(`combat-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'combat_encounters', filter: `user_id=eq.${user.id}` },
        () => fetchEncounter(),
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, id, fetchEncounter])

  const strike = useCallback(
    async (attackType = 'basic') => {
      if (!user || !encounter || !stats) return { error: new Error('Not ready') }
      const config = STRIKES[attackType]
      if (!config) return { error: new Error(`Unknown attack: ${attackType}`) }
      if ((stats.action_points || 0) < config.ap) {
        return { error: new Error('Not enough AP') }
      }
      if (encounter.status !== 'active') {
        return { error: new Error('Encounter is not active') }
      }
      const roll = Math.floor(Math.random() * (config.randomRange + 1))
      const isCrit = Math.random() < config.critChance
      const damage = (config.baseDamage + roll) * (isCrit ? 2 : 1)
      const nextEnemyHp = Math.max(0, encounter.enemy_hp - damage)
      const willDefeat = nextEnemyHp <= 0

      const { error: encErr } = await supabase
        .from('combat_encounters')
        .update({
          enemy_hp: nextEnemyHp,
          status: willDefeat ? 'victory' : 'active',
          resolved_at: willDefeat ? new Date().toISOString() : null,
        })
        .eq('id', encounter.id)
      if (encErr) return { error: encErr }

      const newAP = (stats.action_points || 0) - config.ap
      const { error: statsErr } = await supabase
        .from('character_stats')
        .update({ action_points: newAP, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (statsErr) return { error: statsErr }

      await supabase.from('combat_strikes').insert({
        encounter_id: encounter.id,
        user_id: user.id,
        attack_type: attackType,
        ap_spent: config.ap,
        damage_dealt: damage,
        is_crit: isCrit,
      })

      const event = { attackType, damage, isCrit, defeated: willDefeat, at: Date.now() }
      setLastStrike(event)
      await refreshCharacter()
      await fetchEncounter()
      return event
    },
    [user, encounter, stats, refreshCharacter, fetchEncounter],
  )

  return {
    encounter,
    loading,
    strikes: STRIKES,
    strike,
    lastStrike,
    actionPoints: stats?.action_points || 0,
    canStrikeBasic: (stats?.action_points || 0) >= STRIKES.basic.ap,
    canStrikePower: (stats?.action_points || 0) >= STRIKES.power.ap,
  }
}
