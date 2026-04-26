import { useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { CATEGORIES, DIFFICULTIES, RECURRENCES, QUEST_STATUSES } from '../../config/constants'
import { isRecurring } from '../../utils/recurrence'
import Badge from '../shared/Badge'
import styles from './QuestCard.module.css'

const SWIPE_THRESHOLD = 100

export default function QuestCard({ quest, onComplete, onStart, onFail, onAbandon, onEdit, onDelete }) {
  const [completing, setCompleting] = useState(false)
  const x = useMotionValue(0)
  const completeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const abandonOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const category = CATEGORIES[quest.category]
  const difficulty = DIFFICULTIES[quest.difficulty]
  const isActive = quest.status === 'available' || quest.status === 'in_progress'
  const isCompleted = quest.status === 'completed'
  const isFailed = quest.status === 'failed'
  const isAbandoned = quest.status === 'abandoned'
  const isInactive = isCompleted || isFailed || isAbandoned

  const handleComplete = async () => {
    setCompleting(true)
    await onComplete(quest)
    setCompleting(false)
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${quest.title}"?`)) onDelete(quest)
  }

  const handleDragEnd = (_, info) => {
    if (!isActive) return
    if (info.offset.x > SWIPE_THRESHOLD) {
      handleComplete()
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onAbandon(quest)
    }
  }

  const statusLabel = QUEST_STATUSES[quest.status]?.label

  return (
    <div className={styles.swipeWrap}>
      <motion.div className={`${styles.swipeBg} ${styles.swipeBgRight}`} style={{ opacity: completeOpacity }}>
        Complete →
      </motion.div>
      <motion.div className={`${styles.swipeBg} ${styles.swipeBgLeft}`} style={{ opacity: abandonOpacity }}>
        ← Abandon
      </motion.div>

      <motion.div
        className={`${styles.card} ${isInactive ? styles.completed : ''}`}
        drag={isActive ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        style={{ x }}
        onDragEnd={handleDragEnd}
      >
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
          {isInactive && statusLabel && (
            <Badge
              label={statusLabel}
              color={isCompleted ? 'var(--color-xp)' : 'var(--color-text-muted)'}
            />
          )}
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
          {isActive && (
            <>
              <button onClick={() => onFail(quest)} className={styles.metaBtn}>
                Fail
              </button>
              <button onClick={() => onAbandon(quest)} className={styles.metaBtn}>
                Abandon
              </button>
            </>
          )}
          <button onClick={() => onEdit(quest)} className={styles.metaBtn} aria-label="Edit quest">
            Edit
          </button>
          <button onClick={handleDelete} className={`${styles.metaBtn} ${styles.deleteBtn}`} aria-label="Delete quest">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}
