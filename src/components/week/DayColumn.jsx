import QuestSection from '../quests/QuestSection'
import WeekCard from './WeekCard'
import { BLOCK_ORDER, BLOCK_LABELS } from '../../utils/focusWeek'
import styles from './DayColumn.module.css'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DayColumn({ date, blocks, isToday, columnRef }) {
  const d = new Date(date + 'T00:00:00Z')
  const dayName = DAY_NAMES[d.getUTCDay()]
  const dayNum = d.getUTCDate()
  const total = BLOCK_ORDER.reduce((n, key) => n + blocks[key].length, 0)

  return (
    <div
      ref={columnRef}
      className={`${styles.column} ${isToday ? styles.today : ''}`}
      data-day={date}
    >
      <header className={styles.header}>
        <span className={styles.dayName}>{dayName}</span>
        <span className={styles.dayNum}>{dayNum}</span>
        {isToday && <span className={styles.todayTag}>Today</span>}
      </header>

      {total === 0 ? (
        <p className={styles.empty}>Nothing planned</p>
      ) : (
        BLOCK_ORDER.map(key =>
          blocks[key].length > 0 && (
            // data-day/data-block exist so a later drag-to-reschedule has drop
            // targets without markup changes
            <div key={key} data-block={key}>
              <QuestSection
                label={BLOCK_LABELS[key]}
                tone={key === 'anytime' ? 'muted' : 'default'}
                count={blocks[key].length}
              >
                {blocks[key].map(q => <WeekCard key={q.id} quest={q} />)}
              </QuestSection>
            </div>
          )
        )
      )}
    </div>
  )
}
