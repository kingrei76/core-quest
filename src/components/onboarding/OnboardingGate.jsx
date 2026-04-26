import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCharacter } from '../../contexts/CharacterContext'

export default function OnboardingGate({ children }) {
  const { user } = useAuth()
  const { profile, loading } = useCharacter()
  const navigate = useNavigate()
  const location = useLocation()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (loading || !user || !profile) return
      if (location.pathname === '/onboarding') {
        setChecked(true)
        return
      }
      const isDefault = (profile.character_name === 'Adventurer' || !profile.character_name)
      if (!isDefault) {
        setChecked(true)
        return
      }
      const [{ count: questCount }, { count: noteCount }, { count: inboxCount }] = await Promise.all([
        supabase.from('quests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('inbox_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      if (cancelled) return
      const empty = (questCount || 0) === 0 && (noteCount || 0) === 0 && (inboxCount || 0) === 0
      if (empty) {
        navigate('/onboarding', { replace: true })
      } else {
        setChecked(true)
      }
    }
    check()
    return () => { cancelled = true }
  }, [user, profile, loading, location.pathname, navigate])

  if (!checked && location.pathname !== '/onboarding') return null
  return children
}
