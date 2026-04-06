import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || sending) return

    setSending(true)
    setStatus(null)

    const { error } = await signIn(email.trim())

    if (error) {
      setStatus({ type: 'error', message: error.message })
    } else {
      setStatus({ type: 'success', message: 'Check your email for the magic link!' })
    }
    setSending(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>CORE Quest</h1>
        <p className={styles.subtitle}>Your adventure awaits</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className={styles.input}
            autoComplete="email"
            autoFocus
          />
          <button
            type="submit"
            className={styles.button}
            disabled={sending || !email.trim()}
          >
            {sending ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {status && (
          <p className={`${styles.status} ${styles[status.type]}`}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  )
}
