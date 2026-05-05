import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  pushSupported,
  permissionState,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  reconcileSubscription,
  syncRotatedSubscription,
  sendTestPush,
} from '../../utils/push'
import styles from './NotificationSettings.module.css'

function summarizeTest(result) {
  if (!result) return null
  if (result.note === 'no subscriptions on file') {
    return { ok: false, msg: 'No push subscriptions stored for your account. Toggle off and back on, then try again.' }
  }
  if (result.sent > 0 && result.failed === 0) {
    return { ok: true, msg: `Sent to ${result.sent} device${result.sent === 1 ? '' : 's'}. Check your home screen / lock screen.` }
  }
  if (result.sent > 0 && result.failed > 0) {
    return { ok: true, msg: `Sent to ${result.sent}, failed on ${result.failed}. Failed endpoints were cleaned up if expired.` }
  }
  // All failed
  const first = result.results?.find(r => !r.ok)
  const status = first?.status ? ` (HTTP ${first.status})` : ''
  return { ok: false, msg: `All ${result.failed} push attempt(s) failed${status}. ${first?.error || ''}`.trim() }
}

export default function NotificationSettings() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setSupported(pushSupported())
    if (!pushSupported()) return
    setPermission(permissionState())
    getCurrentSubscription().then(s => setSubscribed(!!s))
  }, [])

  // Listen for SW-triggered subscription rotation and persist the new sub.
  useEffect(() => {
    if (!user || !pushSupported()) return
    const handler = (event) => {
      if (event.data?.type !== 'PUSH_SUBSCRIPTION_CHANGED') return
      syncRotatedSubscription(user.id, event.data.oldEndpoint, event.data.subscription)
        .then(() => setSubscribed(true))
        .catch(() => {})
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [user])

  // Self-heal: on mount, reconcile the browser subscription against the DB row.
  useEffect(() => {
    if (!user) return
    reconcileSubscription(user.id).catch(() => {})
  }, [user])

  const handleEnable = async () => {
    setBusy(true)
    setError(null)
    setTestResult(null)
    try {
      await subscribeToPush(user.id)
      setSubscribed(true)
      setPermission('granted')
    } catch (err) {
      setError(err.message || 'Failed to enable notifications')
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    setError(null)
    setTestResult(null)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } catch (err) {
      setError(err.message || 'Failed to disable notifications')
    } finally {
      setBusy(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setError(null)
    try {
      const result = await sendTestPush()
      setTestResult(result)
    } catch (err) {
      setError(err.message || 'Test push failed')
    } finally {
      setTesting(false)
    }
  }

  if (!supported) {
    return (
      <div className={styles.card}>
        <div className={styles.row}>
          <div>
            <p className={styles.label}>Notifications</p>
            <p className={styles.hint}>Not supported on this device. Add the app to your home screen on iOS for push.</p>
          </div>
        </div>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className={styles.card}>
        <div className={styles.row}>
          <div>
            <p className={styles.label}>Notifications</p>
            <p className={styles.hint}>Permission denied. Re-enable in your browser/app settings.</p>
          </div>
        </div>
      </div>
    )
  }

  const summary = summarizeTest(testResult)

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div>
          <p className={styles.label}>Notifications</p>
          <p className={styles.hint}>
            {subscribed ? 'On — quest reminders will buzz this device.' : 'Off — turn on to receive quest reminders.'}
          </p>
        </div>
        {subscribed ? (
          <button onClick={handleDisable} className={styles.btnOff} disabled={busy}>
            {busy ? '…' : 'Turn off'}
          </button>
        ) : (
          <button onClick={handleEnable} className={styles.btnOn} disabled={busy}>
            {busy ? '…' : 'Turn on'}
          </button>
        )}
      </div>

      {subscribed && (
        <div className={styles.testRow}>
          <button onClick={handleTest} className={styles.btnTest} disabled={testing}>
            {testing ? 'Sending…' : 'Send test notification'}
          </button>
          {summary && (
            <p className={summary.ok ? styles.ok : styles.error}>{summary.msg}</p>
          )}
          {testResult?.results?.length > 0 && (
            <details className={styles.details}>
              <summary>Diagnostic detail</summary>
              <ul className={styles.diag}>
                {testResult.results.map((r, i) => (
                  <li key={i} className={r.ok ? styles.diagOk : styles.diagFail}>
                    <code>{r.endpoint}</code>
                    {r.ok ? ' ✓' : ` ✗ ${r.status || ''} ${r.error || ''}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
