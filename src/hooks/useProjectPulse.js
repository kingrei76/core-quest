import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

// Read-only window into memory.projects (via the project_pulse view): the
// aggregated status/next-steps/blockers that Claude work sessions maintain
// per project. The app never writes this — sessions do.
export function useProjectPulse() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPulse = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('project_pulse')
      .select('*')
      .order('updated_at', { ascending: false })
    if (data) setProjects(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchPulse()
  }, [fetchPulse])

  return { projects, loading, refresh: fetchPulse }
}
