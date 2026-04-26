import { useXPHistory } from '../../hooks/useXPHistory'
import { CATEGORIES, DIFFICULTIES } from '../../config/constants'
import styles from './HistoryList.module.css'

function dayKey(iso) {
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function timeLabel(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function HistoryList() {
  const { events, loading, hasMore, loadMore } = useXPHistory()

  if (loading && events.length === 0) {
    return <div className={styles.empty}>Loading history…</div>
  }

  if (events.length === 0) {
    return <div className={styles.empty}>Complete a quest to start your history.</div>
  }

  const groups = {}
  for (const ev of events) {
    const key = dayKey(ev.earned_at)
    if (!groups[key]) groups[key] = []
    groups[key].push(ev)
  }

  return (
    <div className={styles.history}>
      <h3 className={styles.heading}>History</h3>
      {Object.entries(groups).map(([key, dayEvents]) => {
        const dayTotal = dayEvents.reduce((sum, e) => sum + (e.xp_earned || 0), 0)
        return (
          <div key={key} className={styles.day}>
            <div className={styles.dayHeader}>
              <span className={styles.dayLabel}>{dayLabel(key + 'T00:00:00')}</span>
              <span className={styles.dayTotal}>+{dayTotal} XP</span>
            </div>
            <ul className={styles.events}>
              {dayEvents.map(ev => {
                const cat = ev.category ? CATEGORIES[ev.category] : null
                const diff = ev.quests?.difficulty ? DIFFICULTIES[ev.quests.difficulty] : null
                return (
                  <li key={ev.id} className={styles.event}>
                    <div className={styles.eventMain}>
                      <span className={styles.eventTitle}>
                        {ev.quests?.title || 'Quest'}
                      </span>
                      <span className={styles.eventXp}>+{ev.xp_earned}</span>
                    </div>
                    <div className={styles.eventMeta}>
                      {cat && <span style={{ color: cat.color }}>{cat.label}</span>}
                      {diff && <span>{diff.label}</span>}
                      <span>{timeLabel(ev.earned_at)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {hasMore && (
        <button onClick={loadMore} className={styles.loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
