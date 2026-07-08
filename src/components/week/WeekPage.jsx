import { useState, useMemo, useRef, useEffect } from 'react'
import { useFocusWeek } from '../../hooks/useFocusWeek'
import {
  focusMonday,
  addDays,
  groupFocusWeek,
  localDateStr,
} from '../../utils/focusWeek'
import DayColumn from './DayColumn'
import WeekCard from './WeekCard'
import QuestSection from '../quests/QuestSection'
import EmptyState from '../shared/EmptyState'
import styles from './WeekPage.module.css'

function weekLabel(monday) {
  return new Date(monday + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function WeekPage() {
  // offset in weeks from the current focus week (◂ ▸ chevrons)
  const [offset, setOffset] = useState(0)
  const baseMonday = useMemo(() => focusMonday(), [])
  const monday = addDays(baseMonday, offset * 7)

  const { quests, loading } = useFocusWeek(monday)
  const { days, unslotted, offWeek } = useMemo(
    () => groupFocusWeek(quests, monday),
    [quests, monday]
  )

  const today = localDateStr()
  const todayRef = useRef(null)

  // On the current week, start the day track on today's column (mobile)
  useEffect(() => {
    if (!loading && offset === 0 && todayRef.current) {
      todayRef.current.scrollIntoView({ inline: 'start', block: 'nearest' })
    }
  }, [loading, offset, monday])

  const rail = [...unslotted, ...offWeek]
  const totalOnBoard =
    days.reduce(
      (n, d) => n + d.blocks.morning.length + d.blocks.afternoon.length + d.blocks.anytime.length,
      0
    ) + rail.length

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Week</h1>
        <div className={styles.weekNav}>
          <button
            className={styles.chevron}
            onClick={() => setOffset(o => o - 1)}
            aria-label="Previous week"
          >
            ◂
          </button>
          <span className={styles.weekLabel}>
            Week of {weekLabel(monday)}
            {offset === 0 && <span className={styles.thisWeek}> · this week</span>}
          </span>
          <button
            className={styles.chevron}
            onClick={() => setOffset(o => o + 1)}
            aria-label="Next week"
          >
            ▸
          </button>
        </div>
      </header>

      {!loading && totalOnBoard === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Nothing on this week's board"
          description={
            offset > 0
              ? 'Next week fills in after Monday-morning planning runs.'
              : 'The Monday-morning routine builds this board — or ask Claude to slot tasks into your week.'
          }
        />
      ) : (
        <>
          <div className={styles.track}>
            {days.map(day => (
              <DayColumn
                key={day.date}
                date={day.date}
                blocks={day.blocks}
                isToday={day.date === today}
                columnRef={day.date === today ? todayRef : undefined}
              />
            ))}
          </div>

          {rail.length > 0 && (
            <div className={styles.rail}>
              <QuestSection label="Unslotted this week" tone="muted" count={rail.length}>
                {unslotted.map(q => <WeekCard key={q.id} quest={q} />)}
                {offWeek.map(q => <WeekCard key={q.id} quest={q} showDate />)}
              </QuestSection>
            </div>
          )}
        </>
      )}
    </div>
  )
}
