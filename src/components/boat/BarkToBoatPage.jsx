import { useEffect, useState } from 'react'
import { useBoatFund } from '../../hooks/useBoatFund'
import styles from './BarkToBoatPage.module.css'

// Static, trusted SVG art (ported verbatim from the approved prototype). Injected
// via dangerouslySetInnerHTML so we don't have to hand-convert hyphenated SVG
// attributes to JSX. These are original renditions of the 1928 Steamboat Willie
// short, which is US public domain.
const BOAT_SVG = `
  <svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Steamboat Willie style steamboat">
    <g fill="#2b2b2b" opacity=".92">
      <circle cx="104" cy="16" r="9"/><circle cx="116" cy="8" r="6.5"/>
      <circle cx="158" cy="18" r="9"/><circle cx="170" cy="10" r="6.5"/>
    </g>
    <rect x="128" y="12" width="3" height="24" fill="#111"/>
    <path d="M131 14 L152 19 L131 24 Z" fill="#111"/>
    <g fill="#111">
      <rect x="98" y="40" width="16" height="62" rx="2"/><rect x="94" y="36" width="24" height="8" rx="3"/>
      <rect x="150" y="40" width="16" height="62" rx="2"/><rect x="146" y="36" width="24" height="8" rx="3"/>
    </g>
    <rect x="98" y="58" width="16" height="6" fill="#fff"/>
    <rect x="150" y="58" width="16" height="6" fill="#fff"/>
    <rect x="70" y="96" width="128" height="36" rx="6" fill="#fff" stroke="#111" stroke-width="3"/>
    <g fill="#111"><rect x="120" y="104" width="15" height="16" rx="2"/><rect x="144" y="104" width="15" height="16" rx="2"/><rect x="168" y="104" width="15" height="16" rx="2"/></g>
    <path d="M16 130 L244 130 L226 168 Q221 176 209 176 L51 176 Q39 176 34 168 Z" fill="#fdfdfd" stroke="#111" stroke-width="3.5"/>
    <rect x="16" y="130" width="228" height="8" rx="4" fill="#111"/>
    <g fill="#111"><circle cx="58" cy="152" r="5"/><circle cx="84" cy="152" r="5"/><circle cx="110" cy="152" r="5"/><circle cx="182" cy="152" r="5"/><circle cx="208" cy="152" r="5"/></g>
    <g transform="translate(228,152)">
      <circle r="21" fill="#fff" stroke="#111" stroke-width="3"/>
      <g stroke="#111" stroke-width="3">
        <line x1="-21" y1="0" x2="21" y2="0"/><line x1="0" y1="-21" x2="0" y2="21"/>
        <line x1="-15" y1="-15" x2="15" y2="15"/><line x1="-15" y1="15" x2="15" y2="-15"/>
      </g>
    </g>
    <g transform="translate(86,106)">
      <circle r="12" fill="none" stroke="#6b4a24" stroke-width="3"/>
      <circle r="3.5" fill="#6b4a24"/>
      <g stroke="#6b4a24" stroke-width="2.4">
        <line x1="0" y1="-16" x2="0" y2="16"/><line x1="-16" y1="0" x2="16" y2="0"/>
        <line x1="-11" y1="-11" x2="11" y2="11"/><line x1="-11" y1="11" x2="11" y2="-11"/>
      </g>
    </g>
  </svg>`

const GOAT_SVG = `
  <svg viewBox="0 0 74 62" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="36" rx="20" ry="13" fill="#fff" stroke="#111" stroke-width="2.5"/>
    <path d="M12 32 l-7 -4" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="54" cy="26" r="9.5" fill="#fff" stroke="#111" stroke-width="2.5"/>
    <path d="M50 18 Q47 9 52 7" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M57 18 Q57 9 62 8" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M53 35 l-1 9" stroke="#111" stroke-width="2" stroke-linecap="round"/>
    <circle cx="56" cy="24" r="1.6" fill="#111"/>
    <g stroke="#111" stroke-width="3" stroke-linecap="round"><line x1="22" y1="47" x2="22" y2="58"/><line x1="32" y1="48" x2="32" y2="58"/><line x1="42" y1="47" x2="42" y2="58"/></g>
    <rect x="60" y="24" width="10" height="8" rx="1" fill="#fff" stroke="#111" stroke-width="1.3"/>
    <g stroke="#111" stroke-width=".8"><line x1="61.5" y1="26" x2="68.5" y2="26"/><line x1="61.5" y1="28.5" x2="68.5" y2="28.5"/><line x1="61.5" y1="31" x2="68.5" y2="31"/></g>
  </svg>`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// sat_on is a 'YYYY-MM-DD' string; parse the parts directly so timezone never
// shifts the displayed day.
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).split('-').map(Number)
  if (!m || !day) return ''
  return `${MONTHS[m - 1]} ${day}`
}

function money(n) {
  return '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function BarkToBoatPage() {
  const {
    entries,
    dayRate,
    goal,
    totalSaved,
    progress,
    addEntry,
    deleteEntry,
    updateSettings,
  } = useBoatFund()

  const [days, setDays] = useState('1')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editingRate, setEditingRate] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [rateDraft, setRateDraft] = useState('')
  const [goalDraft, setGoalDraft] = useState('')

  // sail the boat in from empty on first paint
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300)
    return () => clearTimeout(t)
  }, [])

  const pct = ready ? progress : 0
  const pctLabel = Math.round(progress)
  const toGo = Math.max(0, goal - totalSaved)
  const previewDays = Math.max(0, Number(days) || 0)
  const previewAmount = previewDays * dayRate
  const reached = goal > 0 && totalSaved >= goal

  const handleAdd = async () => {
    if (saving || previewDays <= 0) return
    setSaving(true)
    const { error } = await addEntry({ days: previewDays })
    setSaving(false)
    if (!error) setDays('1')
  }

  const saveRate = async () => {
    await updateSettings({ day_rate: rateDraft })
    setEditingRate(false)
  }
  const saveGoal = async () => {
    await updateSettings({ goal_amount: goalDraft })
    setEditingGoal(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.kicker}>🐾 The fund</div>
          <h1 className={styles.title}>Bark to Boat Balance</h1>
          <p className={styles.sub}>Every day the neighbors watch the pup steams us closer to the cruise 🚢</p>
        </header>

        <section className={styles.hero}>
          <div className={styles.notes} aria-hidden="true">
            <span className={styles.note}>♪</span>
            <span className={styles.note}>♫</span>
            <span className={styles.note}>♩</span>
            <span className={styles.note}>♬</span>
          </div>

          <div className={styles.ship} style={{ left: `${pct}%` }}>
            <div className={styles.bob} dangerouslySetInnerHTML={{ __html: BOAT_SVG }} />
          </div>

          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${pct}%` }} />
            <span className={styles.goalFlag} title="Goal: the cruise">🏝️</span>
          </div>
          <span className={styles.foam} style={{ left: `${pct}%` }} aria-hidden="true">🌊</span>

          <div className={styles.goat} aria-hidden="true" dangerouslySetInnerHTML={{ __html: GOAT_SVG }} />

          <div className={styles.stats}>
            <div className={styles.saved}>
              {money(totalSaved)} <span className={styles.savedUnit}>saved</span>
            </div>
            <div className={styles.pct}>{pctLabel}%</div>
            <div className={styles.togo}>
              <span className={styles.togoAmt}>{money(toGo)}</span>
              <br />to go
            </div>
          </div>
          <p className={styles.goalline}>
            🎯 Goal: <span className={styles.goalVal}>{money(goal)}</span> &nbsp;·&nbsp; a Disney cruise
          </p>
          {reached && <p className={styles.done}>🎉 We made it — all aboard!</p>}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Log a dog-sitting</h2>
          <div className={styles.addRow}>
            <div className={styles.field}>
              <label htmlFor="days">Days watched</label>
              <input
                id="days"
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <span className={styles.eq}>× {money(dayRate)}/day =</span>
            <span className={styles.amt}>{money(previewAmount)}</span>
            <button className={styles.btn} onClick={handleAdd} disabled={saving || previewDays <= 0}>
              {saving ? 'Adding…' : 'Add to fund'}
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Settings</h2>
          <div className={styles.settings}>
            <div className={styles.setItem}>
              Day rate:{' '}
              {editingRate ? (
                <>
                  <input
                    className={styles.setInput}
                    type="number"
                    min="0"
                    autoFocus
                    value={rateDraft}
                    onChange={(e) => setRateDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveRate()}
                  />
                  <button className={styles.setSave} onClick={saveRate}>Save</button>
                  <button className={styles.setCancel} onClick={() => setEditingRate(false)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className={styles.setVal}>{money(dayRate)}</span>
                  <button
                    className={styles.edit}
                    onClick={() => { setRateDraft(String(dayRate)); setEditingRate(true) }}
                  >edit</button>
                </>
              )}
            </div>
            <div className={styles.setItem}>
              Goal:{' '}
              {editingGoal ? (
                <>
                  <input
                    className={styles.setInput}
                    type="number"
                    min="0"
                    autoFocus
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  />
                  <button className={styles.setSave} onClick={saveGoal}>Save</button>
                  <button className={styles.setCancel} onClick={() => setEditingGoal(false)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className={styles.setVal}>{money(goal)}</span>
                  <button
                    className={styles.edit}
                    onClick={() => { setGoalDraft(String(goal)); setEditingGoal(true) }}
                  >edit</button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Recent sittings</h2>
          {entries.length === 0 ? (
            <p className={styles.empty}>No dog-sittings logged yet — add the first one above! 🐶</p>
          ) : (
            <ul className={styles.log}>
              {entries.map((e) => (
                <li key={e.id}>
                  <span className={styles.when}>{fmtDate(e.sat_on)}</span>
                  <span className={styles.days}>
                    {Number(e.days)} day{Number(e.days) === 1 ? '' : 's'} × {money(e.day_rate)}
                  </span>
                  <span className={styles.plus}>+{money(e.amount)}</span>
                  <button
                    className={styles.del}
                    title="delete"
                    onClick={() => deleteEntry(e.id)}
                  >✕</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className={styles.foot}>
          <span className={styles.badge}>shared link</span> &nbsp;anyone with this URL can add days — no login needed.
        </p>
      </div>
    </div>
  )
}
