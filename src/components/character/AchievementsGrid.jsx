import { useEffect } from 'react'
import { useAchievements } from '../../hooks/useAchievements'
import { ACHIEVEMENTS } from '../../config/achievements'
import styles from './AchievementsGrid.module.css'

export default function AchievementsGrid() {
  const { unlocked, evaluate, loading } = useAchievements()

  useEffect(() => {
    evaluate()
  }, [evaluate])

  if (loading) return null

  const unlockedKeys = new Set(unlocked.map(u => u.key))

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>
        Achievements <span className={styles.count}>{unlockedKeys.size}/{ACHIEVEMENTS.length}</span>
      </h3>
      <div className={styles.grid}>
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = unlockedKeys.has(a.key)
          return (
            <div key={a.key} className={`${styles.tile} ${isUnlocked ? styles.unlocked : styles.locked}`}>
              <div className={styles.icon}>{isUnlocked ? a.icon : '🔒'}</div>
              <div className={styles.label}>{a.label}</div>
              <div className={styles.desc}>{a.description}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
