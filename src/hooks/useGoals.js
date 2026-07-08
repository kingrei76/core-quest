import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

// Larger goals + bottlenecks Matt writes on the HQ tab. The Monday planning
// routine reads the active ones (service role) to steer the week, so edits
// here directly shape next Monday's plan.
export function useGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('kind', { ascending: false }) // bottlenecks (b… sorts) — see below
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    // 'bottleneck' < 'goal' alphabetically, so ascending:false puts goals
    // first; we want bottlenecks first — flip client-side to be explicit.
    if (data) {
      setGoals([...data].sort((a, b) =>
        a.kind === b.kind ? 0 : a.kind === 'bottleneck' ? -1 : 1
      ))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const addGoal = async ({ title, kind = 'goal', project_slug = null, note = null }) => {
    if (!user || !title.trim()) return { error: new Error('No title') }
    const { data, error } = await supabase
      .from('goals')
      .insert({ user_id: user.id, title: title.trim(), kind, project_slug, note })
      .select()
      .single()
    if (!error) fetchGoals()
    return { data, error }
  }

  const updateGoal = async (id, updates) => {
    const { data, error } = await supabase
      .from('goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error) fetchGoals()
    return { data, error }
  }

  const setStatus = (id, status) => updateGoal(id, { status })

  return { goals, loading, addGoal, updateGoal, setStatus, refresh: fetchGoals }
}
