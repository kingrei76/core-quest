import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { signIn, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email') // 'email' or 'code'
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email.trim() || sending) return

    setSending(true)
    setStatus(null)

    const { error } = await signIn(email.trim())

    if (error) {
      setStatus({ type: 'error', message: error.message })
    } else {
      setStep('code')
      setStatus({ type: 'success', message: 'Check your email for the 6-digit code' })
    }
    setSending(false)
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    if (!code.trim() || sending) return

    setSending(true)
    setStatus(null)

    const { error } = await verifyOtp(email.trim(), code.trim())

    if (error) {
      setStatus({ type: 'error', message: error.message })
    } else {
      navigate('/inbox', { replace: true })
    }
    setSending(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>CORE Quest</h1>
        <p className={styles.subtitle}>Your adventure awaits</p>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className={styles.form}>
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
              {sending ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className={styles.form}>
            <p className={styles.codeSent}>
              Code sent to <strong>{email}</strong>
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className={styles.input}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={sending || !code.trim()}
            >
              {sending ? 'Verifying...' : 'Sign In'}
            </button>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => { setStep('email'); setCode(''); setStatus(null) }}
            >
              Use a different email
            </button>
          </form>
        )}

        {status && (
          <p className={`${styles.status} ${styles[status.type]}`}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  )
}
