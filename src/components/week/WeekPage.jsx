import { useState, useMemo, useRef, useEffect } from 'react'
import { useFocusWeek } from '../../hooks/useFocusWeek'
import {
  focusMonday,
  addDays,
  groupFocusWeek,
  splitBoard,
  localDateStr,
} from '../../utils/focusWeek'
import DayColumn from './DayColumn'
import WeekCard from './WeekCard'
import MoveSheet from './MoveSheet'
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
  const [moveTarget, setMoveTarget] = useState(null)
  const baseMonday = useMemo(() => focusMonday(), [])
  const monday = addDays(baseMonday, offset * 7)

  const { quests, loading, moveQuest } = useFocusWeek(monday)
  const { week, backlog } = useMemo(() => splitBoard(quests, monday), [quests, monday])
  const { days, unslotted, offWeek } = useMemo(
    () => groupFocusWeek(week, monday),
    [week, monday]
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
  const weekIsEmpty = week.length === 0

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

      {!loading && weekIsEmpty && (
        <EmptyState
          icon="🗓️"
          title="Nothing on this week's board yet"
          description={
            offset > 0
              ? 'Next week fills in after Monday-morning planning — or tap a backlog task below to slot it early.'
              : 'The Monday routine builds this board — or tap a backlog task below to slot it yourself.'
          }
        />
      )}

      {!weekIsEmpty && (
        <div className={styles.track}>
          {days.map(day => (
            <DayColumn
              key={day.date}
              date={day.date}
              blocks={day.blocks}
              isToday={day.date === today}
              columnRef={day.date === today ? todayRef : undefined}
              onCardClick={setMoveTarget}
            />
          ))}
        </div>
      )}

      {rail.length > 0 && (
        <div className={styles.rail}>
          <QuestSection label="Unslotted this week" tone="muted" count={rail.length}>
            {unslotted.map(q => (
              <WeekCard key={q.id} quest={q} onClick={() => setMoveTarget(q)} />
            ))}
            {offWeek.map(q => (
              <WeekCard key={q.id} quest={q} showDate onClick={() => setMoveTarget(q)} />
            ))}
          </QuestSection>
        </div>
      )}

      {backlog.length > 0 && (
        <div className={styles.rail}>
          <QuestSection label="Backlog — not in this week" tone="muted" count={backlog.length}>
            {backlog.map(q => (
              <WeekCard key={q.id} quest={q} onClick={() => setMoveTarget(q)} />
            ))}
          </QuestSection>
        </div>
      )}

      {moveTarget && (
        <MoveSheet
          quest={moveTarget}
          monday={monday}
          onMove={moveQuest}
          onClose={() => setMoveTarget(null)}
        />
      )}
    </div>
  )
}
