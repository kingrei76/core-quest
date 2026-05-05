import { useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { DIFFICULTIES, RECURRENCES } from '../../config/constants'
import { isRecurring } from '../../utils/recurrence'
import { useCategories } from '../../hooks/useCategories'
import { startOfToday } from '../../utils/buckets'
import styles from './QuestRow.module.css'

const SWIPE_THRESHOLD = 100

function formatDueDate(quest, today = startOfToday()) {
  if (!quest.due_date) return null
  const due = new Date(quest.due_date + 'T00:00:00')
  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return due.toLocaleDateString(undefined, { weekday: 'short' })
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function QuestRow({
  quest,
  children = [],
  noteCount = 0,
  depth = 0,
  onComplete,
  onStart,
  onFail,
  onAbandon,
  onEdit,
  onDelete,
  onAddSubQuest,
  // recursion plumbing (passed down so child rows still have all behavior)
  childMap,
  noteCountByQuest,
}) {
  const [completing, setCompleting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const x = useMotionValue(0)
  const completeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const abandonOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])
  const { lookup: categoryLookup } = useCategories()

  const category = categoryLookup[quest.category]
  const difficulty = DIFFICULTIES[quest.difficulty]
  const isActive = quest.status === 'available' || quest.status === 'in_progress'
  const isCompleted = quest.status === 'completed'
  const isFailed = quest.status === 'failed'
  const isAbandoned = quest.status === 'abandoned'
  const isInactive = isCompleted || isFailed || isAbandoned
  const hasChildren = children.length > 0
  const completedChildren = children.filter(c => c.status === 'completed').length
  const dueLabel = formatDueDate(quest)
  const isOverdue = quest.due_date && new Date(quest.due_date + 'T00:00:00') < startOfToday() && isActive

  const handleComplete = async (e) => {
    e?.stopPropagation()
    if (!isActive) return
    setCompleting(true)
    await onComplete(quest)
    setCompleting(false)
  }

  const handleDelete = (e) => {
    e?.stopPropagation()
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

  const toggleExpand = () => setExpanded(e => !e)

  const statusClass = isCompleted
    ? styles.statusCompleted
    : isFailed
      ? styles.statusFailed
      : isAbandoned
        ? styles.statusAbandoned
        : quest.status === 'in_progress'
          ? styles.statusInProgress
          : styles.statusAvailable

  return (
    <div className={styles.wrap} style={{ paddingLeft: depth ? `${depth * 20}px` : 0 }}>
      <div className={styles.swipeWrap}>
        <motion.div className={`${styles.swipeBg} ${styles.swipeBgRight}`} style={{ opacity: completeOpacity }}>
          Complete →
        </motion.div>
        <motion.div className={`${styles.swipeBg} ${styles.swipeBgLeft}`} style={{ opacity: abandonOpacity }}>
          ← Abandon
        </motion.div>

        <motion.div
          className={`${styles.row} ${isInactive ? styles.inactive : ''} ${quest.is_boss ? styles.boss : ''} ${expanded ? styles.expanded : ''}`}
          drag={isActive ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          style={{ x }}
          onDragEnd={handleDragEnd}
          onClick={toggleExpand}
        >
          <div className={styles.rowMain}>
            <button
              type="button"
              className={`${styles.statusCircle} ${statusClass}`}
              onClick={handleComplete}
              disabled={!isActive || completing || hasChildren}
              aria-label={isActive ? 'Mark complete' : `Status: ${quest.status}`}
              title={hasChildren ? 'Complete children to finish parent' : 'Mark complete'}
            >
              {isCompleted ? '✓' : isFailed ? '✕' : isAbandoned ? '–' : quest.status === 'in_progress' ? '◐' : ''}
            </button>

            <div className={styles.titleCol}>
              <div className={styles.titleLine}>
                {hasChildren && (
                  <span className={styles.chevron} aria-hidden>
                    {expanded ? '▾' : '▸'}
                  </span>
                )}
                {quest.is_boss && <span className={styles.bossMark}>★</span>}
                <span className={styles.title}>{quest.title}</span>
              </div>

              <div className={styles.metaLine}>
                {dueLabel && (
                  <span className={`${styles.due} ${isOverdue ? styles.dueOverdue : ''}`}>
                    {dueLabel}
                  </span>
                )}
                {category && (
                  <span className={styles.chip} style={{ '--chip-color': category.color }}>
                    {category.label}
                  </span>
                )}
                {difficulty && (
                  <span className={styles.chip} style={{ '--chip-color': difficulty.color }}>
                    {difficulty.label}
                  </span>
                )}
                {isRecurring(quest) && (
                  <span className={styles.tag}>↻ {RECURRENCES[quest.recurrence].label}</span>
                )}
                {hasChildren && (
                  <span className={styles.tag}>
                    {completedChildren}/{children.length} subtasks
                  </span>
                )}
                {noteCount > 0 && (
                  <span className={styles.tag}>{noteCount} note{noteCount === 1 ? '' : 's'}</span>
                )}
              </div>
            </div>

            <div className={styles.xp}>+{quest.xp_value} XP</div>
          </div>

          {expanded && (
            <div className={styles.detail} onClick={(e) => e.stopPropagation()}>
              {quest.description && (
                <p className={styles.description}>{quest.description}</p>
              )}

              <div className={styles.actions}>
                {isActive && quest.status === 'available' && !hasChildren && (
                  <button onClick={() => onStart(quest)} className={styles.btnSecondary}>
                    Begin Quest
                  </button>
                )}
                {isActive && !hasChildren && (
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    className={styles.btnPrimary}
                  >
                    {completing ? 'Completing…' : 'Complete'}
                  </button>
                )}
                {isActive && onAddSubQuest && (
                  <button onClick={() => onAddSubQuest(quest)} className={styles.btnSecondary}>
                    + Subtask
                  </button>
                )}
                <button onClick={() => onEdit(quest)} className={styles.btnGhost}>Edit</button>
                {isActive && (
                  <>
                    <button onClick={() => onFail(quest)} className={styles.btnGhost}>Fail</button>
                    <button onClick={() => onAbandon(quest)} className={styles.btnGhost}>Abandon</button>
                  </>
                )}
                <button onClick={handleDelete} className={`${styles.btnGhost} ${styles.btnDanger}`}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {expanded && hasChildren && (
        <div className={styles.children}>
          {children.map(child => (
            <QuestRow
              key={child.id}
              quest={child}
              children={childMap?.[child.id] || []}
              noteCount={noteCountByQuest?.[child.id] || 0}
              depth={depth + 1}
              onComplete={onComplete}
              onStart={onStart}
              onFail={onFail}
              onAbandon={onAbandon}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubQuest={onAddSubQuest}
              childMap={childMap}
              noteCountByQuest={noteCountByQuest}
            />
          ))}
        </div>
      )}
    </div>
  )
}
