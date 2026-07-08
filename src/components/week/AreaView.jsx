import { useCategories } from '../../hooks/useCategories'
import QuestSection from '../quests/QuestSection'
import WeekCard from './WeekCard'
import styles from './AreaView.module.css'

// Monday-review view: the whole board grouped by AREA — each of Matt's
// "babies" with everything it has this week (slotted + unslotted) plus its
// backlog and the one-line pulse from project memory. The point is to SEE all
// of it, per area, before confirming the week.
export default function AreaView({ areas, pulseBySlug, onCardClick }) {
  const { lookup } = useCategories()

  return (
    <div className={styles.list}>
      {areas.map(area => {
        const cat = lookup[area.key]
        const pulse = pulseBySlug[area.key]
        const weekCount = area.slotted.length + area.unslotted.length
        return (
          <section
            key={area.key}
            className={styles.area}
            style={cat ? { '--area-color': cat.color } : undefined}
          >
            <header className={styles.header}>
              <span className={styles.dot} />
              <span className={styles.name}>{cat?.label ?? area.key}</span>
              <span className={styles.counts}>
                {weekCount} this week · {area.backlog.length} backlog
              </span>
            </header>

            {pulse && (pulse.next_steps || pulse.blockers) && (
              <div className={styles.pulse}>
                {pulse.blockers && (
                  <p className={styles.blockers}>⛔ {pulse.blockers}</p>
                )}
                {pulse.next_steps && (
                  <p className={styles.nextSteps}>→ {pulse.next_steps}</p>
                )}
              </div>
            )}

            {area.slotted.length > 0 && (
              <QuestSection label="This week" tone="accent" count={area.slotted.length}>
                {area.slotted.map(q => (
                  <WeekCard key={q.id} quest={q} showDate onClick={() => onCardClick(q)} />
                ))}
              </QuestSection>
            )}

            {area.unslotted.length > 0 && (
              <QuestSection label="In the week, no day yet" tone="default" count={area.unslotted.length}>
                {area.unslotted.map(q => (
                  <WeekCard key={q.id} quest={q} onClick={() => onCardClick(q)} />
                ))}
              </QuestSection>
            )}

            {area.backlog.length > 0 && (
              <QuestSection label="Backlog" tone="muted" count={area.backlog.length}>
                {area.backlog.map(q => (
                  <WeekCard key={q.id} quest={q} onClick={() => onCardClick(q)} />
                ))}
              </QuestSection>
            )}
          </section>
        )
      })}
    </div>
  )
}
