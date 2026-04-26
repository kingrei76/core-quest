import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { CharacterProvider } from '../../contexts/CharacterContext'
import OnboardingFlow from './OnboardingFlow'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function OnboardingPage() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />
  return (
    <CharacterProvider>
      <OnboardingFlow />
    </CharacterProvider>
  )
}
