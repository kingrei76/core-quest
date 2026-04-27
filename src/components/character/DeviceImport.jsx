import { useState } from 'react'
import { useDeviceTokens } from '../../hooks/useDeviceTokens'
import styles from './DeviceImport.module.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const endpoint = supabaseUrl ? `${supabaseUrl}/functions/v1/import-from-device` : ''

function maskToken(t) {
  if (!t) return ''
  return `${t.slice(0, 6)}…${t.slice(-4)}`
}

function relativeTime(iso) {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}

export default function DeviceImport() {
  const { tokens, loading, createToken, revokeToken } = useDeviceTokens()
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [justCreated, setJustCreated] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await createToken(label.trim() || 'iPhone')
    if (!error && data) setJustCreated(data.token)
    setLabel('')
    setBusy(false)
  }

  const copy = async (field, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // ignore
    }
  }

  if (loading) return null

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Import from iPhone</h3>
      <p className={styles.hint}>
        Auto-import your iPhone Reminders into the Inbox via an Apple Shortcut.
        Items land as "Pending review" so you can approve or dismiss each one.
      </p>

      {tokens.length === 0 ? (
        <form onSubmit={handleCreate} className={styles.createForm}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Device label (e.g. iPhone)"
            className={styles.input}
          />
          <button type="submit" disabled={busy} className={styles.primary}>
            {busy ? 'Creating…' : 'Create import token'}
          </button>
        </form>
      ) : (
        <>
          <div className={styles.tokenList}>
            {tokens.map(t => {
              const showFull = justCreated === t.token
              return (
                <div key={t.token} className={styles.tokenRow}>
                  <div className={styles.tokenInfo}>
                    <div className={styles.tokenLabel}>{t.label || 'Untitled'}</div>
                    <code className={styles.tokenValue}>
                      {showFull ? t.token : maskToken(t.token)}
                    </code>
                    <div className={styles.tokenMeta}>
                      Last used {relativeTime(t.last_used_at)}
                    </div>
                  </div>
                  <div className={styles.tokenActions}>
                    {showFull && (
                      <button
                        type="button"
                        onClick={() => copy(`token-${t.token}`, t.token)}
                        className={styles.linkBtn}
                      >
                        {copiedField === `token-${t.token}` ? 'Copied' : 'Copy'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => revokeToken(t.token)}
                      className={styles.dangerBtn}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleCreate} className={styles.createForm}>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Add another device"
              className={styles.input}
            />
            <button type="submit" disabled={busy} className={styles.secondary}>
              {busy ? '…' : '+ Add'}
            </button>
          </form>

          {justCreated && (
            <div className={styles.callout}>
              <div className={styles.calloutTitle}>Your new token (copy it now)</div>
              <div className={styles.calloutHint}>
                For your safety we'll mask it after you leave this page.
              </div>
            </div>
          )}
        </>
      )}

      <details className={styles.details}>
        <summary>Endpoint URL</summary>
        <div className={styles.endpointRow}>
          <code className={styles.endpoint}>{endpoint || 'Set VITE_SUPABASE_URL'}</code>
          {endpoint && (
            <button
              type="button"
              onClick={() => copy('endpoint', endpoint)}
              className={styles.linkBtn}
            >
              {copiedField === 'endpoint' ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </details>

      <details className={styles.details}>
        <summary>Set up the iOS Shortcut</summary>
        <ol className={styles.steps}>
          <li>Open the <strong>Shortcuts</strong> app on your iPhone.</li>
          <li>New Shortcut → name it <em>CORE Quest Sync</em>.</li>
          <li>Add <strong>Find Reminders where</strong> → "Is Completed" is "false". Limit 50.</li>
          <li>Add <strong>Repeat with Each</strong> using the reminders.</li>
          <li>Inside the loop, add <strong>Dictionary</strong> with keys:
            <ul>
              <li><code>external_id</code> = Reminder Identifier</li>
              <li><code>external_source</code> = <code>ios_reminders</code></li>
              <li><code>content</code> = Reminder Title</li>
              <li><code>due_date</code> = Reminder Due Date formatted as <code>yyyy-MM-dd</code></li>
            </ul>
          </li>
          <li>After the loop, wrap the End Repeat output in <strong>Dictionary</strong>: <code>items</code> = Repeat Results.</li>
          <li>Add <strong>Get Contents of URL</strong> → POST to your endpoint above.
            Headers: <code>Authorization: Bearer YOUR_TOKEN</code>, <code>Content-Type: application/json</code>.
            Request Body: JSON, file = the dictionary.
          </li>
          <li>(Optional) <strong>Show Result</strong> with the response so you can confirm <code>inserted</code> count.</li>
          <li>Set up an <strong>Automation</strong> (Personal Automation → Time of Day → repeat hourly) that runs this Shortcut. Or run from the share sheet on demand.</li>
        </ol>
        <p className={styles.note}>
          Reminders are deduped server-side via the Reminder Identifier — you can run the Shortcut as often as you like without spamming your inbox.
        </p>
      </details>
    </div>
  )
}
