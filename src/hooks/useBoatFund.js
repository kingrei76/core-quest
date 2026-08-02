import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../config/supabase'

// "Bark to Boat Balance" — a shared, PUBLIC dog-sitting fund. Unlike the other
// hooks this one is intentionally NOT scoped to a user: the /bark-to-boat page is
// unauthenticated and everyone reads/writes the same two isolated tables
// (boat_fund_entries + a singleton boat_fund_settings row). See the
// 20260802164935_bark_to_boat_fund migration.
const DEFAULT_RATE = 30
const DEFAULT_GOAL = 1200

export function useBoatFund() {
  const id = useId()
  const [entries, setEntries] = useState([])
  const [dayRate, setDayRate] = useState(DEFAULT_RATE)
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [{ data: entryRows }, { data: settingsRow }] = await Promise.all([
      supabase
        .from('boat_fund_entries')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('boat_fund_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    if (entryRows) setEntries(entryRows)
    if (settingsRow) {
      setDayRate(Number(settingsRow.day_rate))
      setGoal(Number(settingsRow.goal_amount))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Realtime so two people with the page open see each other's additions live.
  // useId() namespaces the channel per the project convention (commit 1f49491).
  useEffect(() => {
    const channel = supabase
      .channel(`boat-fund-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boat_fund_entries' },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boat_fund_settings' },
        () => fetchAll()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id, fetchAll])

  const totalSaved = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const progress = goal > 0 ? Math.min(100, (totalSaved / goal) * 100) : 0

  // amount is frozen at time of entry (days * current rate) so changing the rate
  // later doesn't rewrite history.
  const addEntry = async ({ days, note = null, sat_on = null }) => {
    const d = Number(days)
    if (!d || d <= 0) return { error: new Error('Enter a number of days') }
    const row = { days: d, day_rate: dayRate, amount: d * dayRate, note }
    if (sat_on) row.sat_on = sat_on
    const { data, error } = await supabase
      .from('boat_fund_entries')
      .insert(row)
      .select()
      .single()
    if (!error) fetchAll()
    return { data, error }
  }

  const deleteEntry = async (entryId) => {
    const { error } = await supabase
      .from('boat_fund_entries')
      .delete()
      .eq('id', entryId)
    if (!error) fetchAll()
    return { error }
  }

  const updateSettings = async ({ day_rate, goal_amount }) => {
    const patch = { updated_at: new Date().toISOString() }
    if (day_rate != null && day_rate !== '') patch.day_rate = Number(day_rate)
    if (goal_amount != null && goal_amount !== '') patch.goal_amount = Number(goal_amount)
    const { data, error } = await supabase
      .from('boat_fund_settings')
      .update(patch)
      .eq('id', 1)
      .select()
      .single()
    if (!error) fetchAll()
    return { data, error }
  }

  return {
    entries,
    dayRate,
    goal,
    totalSaved,
    progress,
    loading,
    addEntry,
    deleteEntry,
    updateSettings,
    refresh: fetchAll,
  }
}
