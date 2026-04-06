import { useState } from 'react'
import { CATEGORIES, DIFFICULTIES } from '../../config/constants'
import Badge from '../shared/Badge'
import styles from './QuestCard.module.css'

export default function QuestCard({ quest, onComplete, onStart }) {
  const [completing, setCompleting] = useState(false)
  const category = CATEGORIES[quest.category]
  const difficulty = DIFFICULTIES[quest.difficulty]
  const isActive = quest.status === 'available' || quest.status === 'in_progress'
  const isCompleted = quest.status === 'completed'

  const handleComplete = async () => {
    setCompleting(true)
    await onComplete(quest)
    setCompleting(false)
  }

  return (
    <div className={`${styles.card} ${isCompleted ? styles.completed : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{quest.title}</h3>
        <span className={styles.xp}>+{quest.xp_value} XP</span>
      </div>

      <div className={styles.badges}>
        {category && <Badge label={category.label} color={category.color} />}
        {difficulty && <Badge label={difficulty.label} color={difficulty.color} />}
        {isCompleted && <Badge label="Completed" color="var(--color-xp)" />}
      </div>

      {quest.description && (
        <p className={styles.description}>{quest.description}</p>
      )}

      {isActive && (
        <div className={styles.actions}>
          {quest.status === 'available' && (
            <button onClick={() => onStart(quest)} className={styles.startBtn}>
              Begin Quest
            </button>
          )}
          <button
            onClick={handleComplete}
            disabled={completing}
            className={styles.completeBtn}
          >
            {completing ? 'Completing...' : 'Complete Quest'}
          </button>
        </div>
      )}
    </div>
  )
}
