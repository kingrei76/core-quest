import { xpForLevel } from '../../utils/rpg'
import styles from './XPBar.module.css'

export default function XPBar({ totalXP, level, progress }) {
  const currentThreshold = xpForLevel(level)
  const nextThreshold = xpForLevel(level + 1)
  const xpInLevel = totalXP - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Experience</span>
        <span className={styles.values}>
          {xpInLevel} / {xpNeeded} XP
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
      <div className={styles.footer}>
        <span className={styles.total}>{totalXP} total XP</span>
        <span className={styles.next}>Next: Lv.{level + 1}</span>
      </div>
    </div>
  )
}
