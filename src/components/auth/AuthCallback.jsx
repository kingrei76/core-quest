import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase reads the token from the URL hash automatically
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          setError(error.message)
          return
        }

        if (session) {
          navigate('/inbox', { replace: true })
          return
        }

        // If no session yet, listen for the auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') {
            subscription.unsubscribe()
            navigate('/inbox', { replace: true })
          }
        })

        // Timeout fallback — redirect to login after 10 seconds
        setTimeout(() => {
          subscription.unsubscribe()
          setError('Sign in timed out. Please try again.')
        }, 10000)
      } catch (err) {
        setError(err.message)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100svh',
      color: 'var(--color-text-secondary)',
      fontFamily: 'var(--font-display)',
      gap: '1rem',
    }}>
      {error ? (
        <>
          <span style={{ color: 'var(--color-accent)' }}>{error}</span>
          <a href="/login" style={{ color: 'var(--color-xp)', textDecoration: 'underline' }}>
            Back to login
          </a>
        </>
      ) : (
        'Completing sign in...'
      )}
    </div>
  )
}
