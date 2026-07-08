import { useState } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { useProjectPulse } from '../../hooks/useProjectPulse'
import { useCategories } from '../../hooks/useCategories'
import EmptyState from '../shared/EmptyState'
import styles from './HQPage.module.css'

function relativeDay(ts) {
  if (!ts) return ''
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

// HQ: the big picture. Goals + bottlenecks Matt writes here steer the Monday
// planning routine; the project pulse below is the aggregated working memory
// every Claude session maintains per project (read-only here — sessions
// update it as work happens).
export default function HQPage() {
  const { goals, loading: goalsLoading, addGoal, setStatus } = useGoals()
  const { projects, loading: pulseLoading } = useProjectPulse()
  const { lookup } = useCategories()

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('goal')

  const active = goals.filter(g => g.status === 'active')

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addGoal({ title, kind })
    setTitle('')
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>HQ</h1>
      <p className={styles.sub}>
        The big picture — what you're aiming at, what's in the way, and where
        every project stands.
      </p>

      <section>
        <h2 className={styles.sectionLabel}>Bottlenecks & big goals</h2>
        <p className={styles.hint}>
          Monday's planner reads these and builds your week around them.
        </p>

        <form className={styles.addRow} onSubmit={submit}>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'bottleneck' ? 'What is blocking progress?' : 'What are you aiming at?'}
          />
          <div className={styles.kindToggle}>
            <button
              type="button"
              className={`${styles.kindBtn} ${kind === 'goal' ? styles.kindOn : ''}`}
              onClick={() => setKind('goal')}
            >
              🎯 Goal
            </button>
            <button
              type="button"
              className={`${styles.kindBtn} ${kind === 'bottleneck' ? styles.kindOnRed : ''}`}
              onClick={() => setKind('bottleneck')}
            >
              🧱 Bottleneck
            </button>
          </div>
          <button type="submit" className={styles.addBtn} disabled={!title.trim()}>
            Add
          </button>
        </form>

        {!goalsLoading && active.length === 0 && (
          <p className={styles.empty}>
            Nothing here yet — add the big things you're steering toward.
          </p>
        )}

        <ul className={styles.goalList}>
          {active.map(g => (
            <li key={g.id} className={styles.goalRow}>
              <span className={g.kind === 'bottleneck' ? styles.goalKindRed : styles.goalKind}>
                {g.kind === 'bottleneck' ? '🧱' : '🎯'}
              </span>
              <span className={styles.goalTitle}>{g.title}</span>
              <span className={styles.goalActions}>
                <button
                  className={styles.doneBtn}
                  title="Mark done"
                  onClick={() => setStatus(g.id, 'done')}
                >
                  ✓
                </button>
                <button
                  className={styles.dropBtn}
                  title="Drop"
                  onClick={() => setStatus(g.id, 'dropped')}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={styles.sectionLabel}>All your work — project pulse</h2>
        <p className={styles.hint}>
          Live from project memory. Updated by your Claude work sessions; read-only here.
        </p>

        {!pulseLoading && projects.length === 0 && (
          <EmptyState
            icon="📡"
            title="No project pulse yet"
            description="If this stays empty after the database update is applied, tell Claude."
          />
        )}

        <div className={styles.pulseGrid}>
          {projects.map(p => {
            const cat = lookup[p.slug]
            return (
              <article
                key={p.slug}
                className={styles.card}
                style={cat ? { '--area-color': cat.color } : undefined}
              >
                <header className={styles.cardHeader}>
                  <span className={styles.cardName}>{p.name || p.slug}</span>
                  <span className={styles.cardWhen}>{relativeDay(p.updated_at)}</span>
                </header>
                {p.status_summary && <p className={styles.cardStatus}>{p.status_summary}</p>}
                {p.blockers && <p className={styles.cardBlockers}>⛔ {p.blockers}</p>}
                {p.next_steps && <p className={styles.cardNext}>→ {p.next_steps}</p>}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
