import { Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { CharacterProvider } from './contexts/CharacterContext'
import AppShell from './components/layout/AppShell'
import LoadingSpinner from './components/shared/LoadingSpinner'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!session) return <Navigate to="/login" replace />

  return (
    <CharacterProvider>
      <AppShell />
    </CharacterProvider>
  )
}
