import { useChallenges } from '../../hooks/useChallenges'
import styles from './ChallengePanel.module.css'

function ChallengeCard({ challenge }) {
  const pct = Math.min(100, Math.round((challenge.progress / challenge.target_count) * 100))
  const done = !!challenge.completed_at
  return (
    <div className={`${styles.card} ${done ? styles.done : ''}`}>
      <div className={styles.row}>
        <span className={styles.label}>{challenge.label}</span>
        <span className={styles.reward}>+{challenge.reward_xp} XP</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.row}>
        <span className={styles.scope}>{challenge.scope === 'daily' ? 'Daily' : 'Weekly'}</span>
        <span className={styles.progress}>
          {done ? 'Completed' : `${challenge.progress} / ${challenge.target_count}`}
        </span>
      </div>
    </div>
  )
}

export default function ChallengePanel() {
  const { challenges, loading } = useChallenges()

  if (loading) return null
  if (!challenges || challenges.length === 0) return null

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Challenges</h3>
      <div className={styles.grid}>
        {challenges.map(ch => (
          <ChallengeCard key={ch.id} challenge={ch} />
        ))}
      </div>
    </div>
  )
}
