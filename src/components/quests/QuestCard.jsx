import { useState } from 'react'
import { CATEGORIES, DIFFICULTIES, RECURRENCES } from '../../config/constants'
import { isRecurring } from '../../utils/recurrence'
import Badge from '../shared/Badge'
import styles from './QuestCard.module.css'

export default function QuestCard({ quest, onComplete, onStart, onEdit, onDelete }) {
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

  const handleDelete = () => {
    if (window.confirm(`Delete "${quest.title}"?`)) onDelete(quest)
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
        {isRecurring(quest) && (
          <Badge label={`↻ ${RECURRENCES[quest.recurrence].label}`} color="var(--color-accent)" />
        )}
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

      <div className={styles.metaActions}>
        <button onClick={() => onEdit(quest)} className={styles.metaBtn} aria-label="Edit quest">
          Edit
        </button>
        <button onClick={handleDelete} className={`${styles.metaBtn} ${styles.deleteBtn}`} aria-label="Delete quest">
          Delete
        </button>
      </div>
    </div>
  )
}
