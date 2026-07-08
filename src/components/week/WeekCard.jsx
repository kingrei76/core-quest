import { useCategories } from '../../hooks/useCategories'
import { PRIORITIES } from '../../config/constants'
import { reminderLabel } from '../../utils/focusWeek'
import styles from './WeekCard.module.css'

// Short weekday+day label for rail items whose planned_day falls outside the
// Mon–Fri columns (e.g. slotted on a Saturday).
function dateChipLabel(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function WeekCard({ quest, showDate = false }) {
  const { lookup } = useCategories()
  const category = lookup[quest.category]
  const priority = quest.priority ? PRIORITIES[quest.priority] : null
  const done = quest.status === 'completed'
  const time = reminderLabel(quest)

  return (
    <div
      className={`${styles.card} ${done ? styles.done : ''}`}
      style={category ? { '--area-color': category.color } : undefined}
    >
      <span className={`${styles.check} ${done ? styles.checkDone : ''}`}>
        {done ? '✓' : ''}
      </span>
      <div className={styles.body}>
        <span className={styles.title}>{quest.title}</span>
        <span className={styles.meta}>
          {time && <span className={styles.time}>{time}</span>}
          {showDate && quest.planned_day && (
            <span className={styles.time}>{dateChipLabel(quest.planned_day)}</span>
          )}
          {category && (
            <span className={styles.chip} style={{ '--chip-color': category.color }}>
              {category.label}
            </span>
          )}
          {priority && quest.priority !== 'low' && (
            <span className={styles.chip} style={{ '--chip-color': priority.color }}>
              {quest.priority === 'high' ? '⏫' : '↑'} {priority.label}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
