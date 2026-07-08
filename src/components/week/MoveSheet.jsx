import { useState, useEffect } from 'react'
import modal from '../quests/QuestEditor.module.css'
import styles from './MoveSheet.module.css'
import { weekdayDates, blockFor, blockReminderISO, BLOCK_LABELS } from '../../utils/focusWeek'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Tap-to-move sheet: pick a day + block for a task (or pull it off the week).
// Writes the same scheduling fields slot_task uses; the cloud routines catch
// the matching calendar event up on their next run.
export default function MoveSheet({ quest, monday, onMove, onClose }) {
  const inWeek = quest.focus_week === monday
  const days = weekdayDates(monday)
  const [day, setDay] = useState(
    days.includes(quest.planned_day) ? quest.planned_day : null
  )
  const [block, setBlock] = useState(inWeek ? blockFor(quest) : 'morning')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    if (saving) return
    setSaving(true)
    await onMove(quest.id, {
      focus_week: monday,
      planned_day: day,
      reminder_at: day ? blockReminderISO(day, block) : null,
    })
    setSaving(false)
    onClose()
  }

  const removeFromWeek = async () => {
    if (saving) return
    setSaving(true)
    await onMove(quest.id, { focus_week: null, planned_day: null, reminder_at: null })
    setSaving(false)
    onClose()
  }

  return (
    <div className={modal.backdrop} onClick={onClose}>
      <div className={modal.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={modal.title}>Move task</h2>
        <p className={styles.questTitle}>{quest.title}</p>

        <p className={styles.groupLabel}>Day</p>
        <div className={styles.chips}>
          {days.map((date, i) => (
            <button
              key={date}
              className={`${styles.chip} ${day === date ? styles.chipOn : ''}`}
              onClick={() => setDay(date)}
            >
              {DAY_NAMES[i]} {Number(date.slice(8, 10))}
            </button>
          ))}
          <button
            className={`${styles.chip} ${day === null ? styles.chipOn : ''}`}
            onClick={() => setDay(null)}
          >
            No day
          </button>
        </div>

        {day && (
          <>
            <p className={styles.groupLabel}>Block</p>
            <div className={styles.chips}>
              {['morning', 'afternoon', 'anytime'].map(key => (
                <button
                  key={key}
                  className={`${styles.chip} ${block === key ? styles.chipOn : ''}`}
                  onClick={() => setBlock(key)}
                >
                  {BLOCK_LABELS[key]}
                </button>
              ))}
            </div>
            {block !== 'anytime' && (
              <p className={styles.hint}>
                Reminder pings at {block === 'morning' ? '9:00am' : '1:00pm'} · the 🔨 calendar
                block catches up at the next routine check-in
              </p>
            )}
          </>
        )}

        <div className={styles.actions}>
          <button className={styles.primary} onClick={save} disabled={saving}>
            {inWeek ? 'Move' : 'Add to this week'}
          </button>
          {inWeek && (
            <button className={styles.danger} onClick={removeFromWeek} disabled={saving}>
              Remove from week
            </button>
          )}
          <button className={styles.ghost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
