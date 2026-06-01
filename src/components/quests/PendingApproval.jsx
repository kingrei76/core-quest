import { useState } from 'react'
import { useCategories } from '../../hooks/useCategories'
import { DIFFICULTIES } from '../../config/constants'
import styles from './PendingApproval.module.css'

// Tasks Claude proposed, awaiting Matt's approval. This is the tap-target for
// the "Approve task?" push notification (which deep-links to /quests).
export default function PendingApproval({ tasks, onApprove, onReject }) {
  const { lookup: categoryLookup } = useCategories()
  const [busy, setBusy] = useState({})

  if (!tasks || tasks.length === 0) return null

  const act = async (task, fn) => {
    setBusy(b => ({ ...b, [task.id]: true }))
    await fn(task)
    // Row disappears on realtime refresh; clearing busy is just for safety.
    setBusy(b => ({ ...b, [task.id]: false }))
  }

  return (
    <section className={styles.wrap} id="pending-approval">
      <div className={styles.header}>
        <span aria-hidden>✨</span>
        Proposed by Claude — approve to make official
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <div className={styles.list}>
        {tasks.map(task => {
          const category = categoryLookup[task.category]
          const difficulty = DIFFICULTIES[task.difficulty]
          const isBusy = busy[task.id]
          return (
            <div key={task.id} className={styles.item}>
              <div className={styles.body}>
                <div className={styles.itemTitle}>{task.title}</div>
                <div className={styles.meta}>
                  {task.due_date && <span>due {task.due_date}</span>}
                  {category && <span>{category.label}</span>}
                  {difficulty && <span>{difficulty.label}</span>}
                  {task.metadata?.source && <span>via {task.metadata.source}</span>}
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.approve}
                  disabled={isBusy}
                  onClick={() => act(task, onApprove)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className={styles.reject}
                  disabled={isBusy}
                  onClick={() => act(task, onReject)}
                >
                  Reject
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
