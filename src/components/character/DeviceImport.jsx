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
  const sec = Math.round(diff / 1000)
  if (sec < 60) return sec <= 5 ? 'just now' : `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}

function freshnessClass(iso) {
  if (!iso) return styles.freshnessStale
  const minutes = (Date.now() - new Date(iso).getTime()) / 60000
  if (minutes < 90) return styles.freshnessFresh   // ran within last hour & change
  if (minutes < 24 * 60) return styles.freshnessOk
  return styles.freshnessStale
}

export default function DeviceImport() {
  const { tokens, loading, createToken, revokeToken, testToken } = useDeviceTokens()
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [justCreated, setJustCreated] = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const [testing, setTesting] = useState(null)
  const [testResult, setTestResult] = useState(null)

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

  const handleTest = async (token) => {
    setTesting(token)
    setTestResult(null)
    const result = await testToken(token)
    setTestResult({ token, ...result })
    setTesting(null)
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
              const isTesting = testing === t.token
              const result = testResult?.token === t.token ? testResult : null
              return (
                <div key={t.token} className={styles.tokenRow}>
                  <div className={styles.tokenInfo}>
                    <div className={styles.tokenLabel}>{t.label || 'Untitled'}</div>
                    <code className={styles.tokenValue}>
                      {showFull ? t.token : maskToken(t.token)}
                    </code>
                    <div className={`${styles.tokenMeta} ${freshnessClass(t.last_used_at)}`}>
                      Last imported {relativeTime(t.last_used_at)}
                    </div>
                    {result && (
                      <div className={result.ok ? styles.testOk : styles.testFail}>
                        {result.ok
                          ? 'Connection works ✓'
                          : `Failed${result.status ? ` (HTTP ${result.status})` : ''}: ${result.error || ''}`}
                      </div>
                    )}
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
                      onClick={() => handleTest(t.token)}
                      className={styles.linkBtn}
                      disabled={isTesting}
                    >
                      {isTesting ? '…' : 'Test'}
                    </button>
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
        <summary>Set up the iOS Shortcut (one time)</summary>
        <ol className={styles.steps}>
          <li>Open <strong>Shortcuts</strong> on your iPhone → tap <strong>+</strong> to create a new shortcut. Name it <em>CORE Quest Sync</em>.</li>
          <li>Add <strong>Find Reminders where</strong> → <em>Is Completed</em> = <em>false</em>. Limit 50.</li>
          <li>Add <strong>Repeat with Each</strong> using the Found Reminders.</li>
          <li>Inside the Repeat, add a <strong>Dictionary</strong> with these four keys:
            <ul>
              <li><code>external_id</code> = Repeat Item → Identifier</li>
              <li><code>external_source</code> = <code>ios_reminders</code></li>
              <li><code>content</code> = Repeat Item → Title</li>
              <li><code>due_date</code> = Repeat Item → Due Date, formatted as <code>yyyy-MM-dd</code></li>
            </ul>
          </li>
          <li>After End Repeat, add another <strong>Dictionary</strong> with key <code>items</code> = <em>Repeat Results</em>.</li>
          <li>Add <strong>Get Contents of URL</strong>:
            <ul>
              <li>Method: <strong>POST</strong></li>
              <li>URL: paste your endpoint from above</li>
              <li>Headers: <code>Authorization: Bearer YOUR_TOKEN</code> and <code>Content-Type: application/json</code></li>
              <li>Request Body: <strong>JSON</strong> → File = the dictionary from the previous step</li>
            </ul>
          </li>
        </ol>
      </details>

      <details className={styles.details} open>
        <summary>Make it actually run automatically</summary>
        <p className={styles.note}>
          A Shortcut by itself doesn't run on a schedule — you need a <strong>Personal Automation</strong>
          to trigger it, and you have to allow it to run unattended.
        </p>
        <ol className={styles.steps}>
          <li>In <strong>Shortcuts</strong>, switch to the <strong>Automation</strong> tab → <strong>+</strong> → <strong>Create Personal Automation</strong>.</li>
          <li>Pick <strong>Time of Day</strong> → choose a time → repeat <strong>Hourly</strong> (or Daily).</li>
          <li>Action: <strong>Run Shortcut</strong> → pick <em>CORE Quest Sync</em>.</li>
          <li><strong>Critical:</strong> on the next screen, turn OFF <em>Ask Before Running</em>, then turn OFF <em>Notify When Run</em> if you don't want a banner each time.</li>
          <li>Tap <strong>Done</strong>. Verify the automation is <strong>Enabled</strong> in the list.</li>
        </ol>
        <p className={styles.note}>
          iOS sometimes requires the device to be unlocked at the trigger time for the first run. After
          that, automations fire while the phone is locked. Plug in & connect to Wi-Fi for best reliability.
        </p>
        <p className={styles.note}>
          Tip: also wire up a <strong>"When app is opened"</strong> automation pointed at <em>CORE Quest</em> so
          opening the PWA forces a fresh sync on top of the hourly schedule.
        </p>
      </details>

      <details className={styles.details}>
        <summary>Troubleshooting</summary>
        <ul className={styles.steps}>
          <li>Press <strong>Test</strong> next to your token. If the connection works, the token + endpoint are good — the issue is on the iPhone side.</li>
          <li>If <em>Last imported</em> stays "never" even after the Shortcut runs, check Shortcuts → Automation → tap your automation → make sure <em>Ask Before Running</em> is OFF.</li>
          <li>iOS occasionally suspends Personal Automations. If it goes silent, run the Shortcut once manually from the Shortcuts app — that usually wakes it up.</li>
          <li>If <em>Last imported</em> says "1d ago" or older, your Shortcut probably failed silently. Open Shortcuts → run it manually and read the output.</li>
        </ul>
      </details>
    </div>
  )
}
