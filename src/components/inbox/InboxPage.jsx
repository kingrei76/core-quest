import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import InboxInput from './InboxInput'
import InboxItem from './InboxItem'
import ImportModal from './ImportModal'
import { useInbox } from '../../hooks/useInbox'
import EmptyState from '../shared/EmptyState'
import styles from './InboxPage.module.css'

const DIFFICULTY_RANK = { trivial: 0, easy: 1, medium: 2, hard: 3, epic: 4, legendary: 5 }

const BUCKET_ORDER = ['overdue', 'today', 'tomorrow', 'thisWeek', 'later', 'noDate']
const BUCKET_LABELS = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  thisWeek: 'This week',
  later: 'Later',
  noDate: 'No due date',
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function bucketForQuest(quest, today) {
  if (!quest.due_date) return 'noDate'
  const due = new Date(quest.due_date + 'T00:00:00')
  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 7) return 'thisWeek'
  return 'later'
}

export default function InboxPage() {
  const { quests } = useQuests()
  const { pendingItems, bulkAddItems, processItem, dismissItem } = useInbox()
  const [showImport, setShowImport] = useState(false)

  const today = startOfToday()
  const active = quests.filter(q =>
    !q.parent_quest_id && (q.status === 'available' || q.status === 'in_progress')
  )

  const buckets = {}
  for (const quest of active) {
    const key = bucketForQuest(quest, today)
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(quest)
  }

  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => {
      const dr = (DIFFICULTY_RANK[b.difficulty] ?? 0) - (DIFFICULTY_RANK[a.difficulty] ?? 0)
      if (dr !== 0) return dr
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }

  const populatedBuckets = BUCKET_ORDER.filter(k => buckets[k]?.length > 0)
  const totalCount = active.length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Inbox</h2>
        <button
          className={styles.importBtn}
          onClick={() => setShowImport(true)}
        >
          Import
        </button>
      </div>

      <InboxInput />

      {pendingItems.length > 0 && (
        <div className={styles.sections}>
          <div className={styles.bucket}>
            <h3 className={styles.bucketHeading}>
              <span>Pending review</span>
              <span className={styles.bucketCount}>{pendingItems.length}</span>
            </h3>
            <div className={styles.pendingList}>
              {pendingItems.map(item => (
                <InboxItem
                  key={item.id}
                  item={item}
                  onProcess={processItem}
                  onDismiss={dismissItem}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.sections}>
        {totalCount === 0 ? (
          <EmptyState
            icon={"\u{1F4DD}"}
            title="Nothing here yet"
            description="Add your first quest above"
          />
        ) : (
          populatedBuckets.map(key => (
            <div key={key} className={styles.bucket}>
              <h3 className={styles.bucketHeading}>
                <span>{BUCKET_LABELS[key]}</span>
                <span className={styles.bucketCount}>{buckets[key].length}</span>
              </h3>
              <ul className={styles.recentList}>
                {buckets[key].map(quest => {
                  const diff = quest.difficulty
                  return (
                    <li key={quest.id} className={styles.recentItem}>
                      <span className={styles.recentText}>{quest.title}</span>
                      <span className={`${styles.recentBadge} ${styles[`diff_${diff}`] || ''}`}>
                        {diff}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {showImport && (
        <ImportModal
          onImport={bulkAddItems}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
