import { useState, useMemo, useRef, useEffect } from 'react'
import { useFocusWeek } from '../../hooks/useFocusWeek'
import { useWeekReview } from '../../hooks/useWeekReview'
import { useProjectPulse } from '../../hooks/useProjectPulse'
import {
  focusMonday,
  addDays,
  groupFocusWeek,
  groupByArea,
  splitBoard,
  localDateStr,
} from '../../utils/focusWeek'
import DayColumn from './DayColumn'
import WeekCard from './WeekCard'
import MoveSheet from './MoveSheet'
import AreaView from './AreaView'
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
  const [view, setView] = useState(null) // 'day' | 'area'; null until review state known
  const baseMonday = useMemo(() => focusMonday(), [])
  const monday = addDays(baseMonday, offset * 7)

  const { quests, loading, moveQuest } = useFocusWeek(monday)
  const { review, loading: reviewLoading, confirmWeek } = useWeekReview(monday)
  const { projects } = useProjectPulse()

  const { week, backlog } = useMemo(() => splitBoard(quests, monday), [quests, monday])
  const { days, unslotted, offWeek } = useMemo(
    () => groupFocusWeek(week, monday),
    [week, monday]
  )
  const areas = useMemo(() => groupByArea(week, backlog), [week, backlog])
  const pulseBySlug = useMemo(
    () => Object.fromEntries(projects.map(p => [p.slug, p])),
    [projects]
  )

  const isDraft = review?.status === 'draft'

  // A drafted, unconfirmed week opens in review (by-area) mode: see all of it
  // per area before switching to working mode. Otherwise default to days.
  useEffect(() => {
    if (!reviewLoading && view === null) {
      setView(isDraft ? 'area' : 'day')
    }
  }, [reviewLoading, isDraft, view])

  const today = localDateStr()
  const todayRef = useRef(null)

  // On the current week in day view, start the track on today's column
  useEffect(() => {
    if (!loading && offset === 0 && view === 'day' && todayRef.current) {
      todayRef.current.scrollIntoView({ inline: 'start', block: 'nearest' })
    }
  }, [loading, offset, monday, view])

  const rail = [...unslotted, ...offWeek]
  const weekIsEmpty = week.length === 0
  const activeView = view ?? 'day'

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
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${activeView === 'day' ? styles.toggleOn : ''}`}
              onClick={() => setView('day')}
            >
              By day
            </button>
            <button
              className={`${styles.toggleBtn} ${activeView === 'area' ? styles.toggleOn : ''}`}
              onClick={() => setView('area')}
            >
              By area
            </button>
          </div>
        </div>
      </header>

      {isDraft && (
        <div className={styles.reviewBanner}>
          <p className={styles.reviewText}>
            📋 Claude drafted this week — walk through each area below, move
            anything that's wrong, then start the week.
          </p>
          <button
            className={styles.confirmBtn}
            onClick={confirmWeek}
          >
            I've seen it all — start the week
          </button>
        </div>
      )}
      {review?.status === 'confirmed' && offset === 0 && (
        <p className={styles.confirmedNote}>✓ Week reviewed and started</p>
      )}

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

      {activeView === 'area' ? (
        <AreaView areas={areas} pulseBySlug={pulseBySlug} onCardClick={setMoveTarget} />
      ) : (
        <>
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
        </>
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
