import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  pushSupported,
  permissionState,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../utils/push'
import styles from './NotificationSettings.module.css'

export default function NotificationSettings() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setSupported(pushSupported())
    if (!pushSupported()) return
    setPermission(permissionState())
    getCurrentSubscription().then(s => setSubscribed(!!s))
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    setError(null)
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
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } catch (err) {
      setError(err.message || 'Failed to disable notifications')
    } finally {
      setBusy(false)
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
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
