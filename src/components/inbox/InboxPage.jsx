import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useNotes } from '../../hooks/useNotes'
import InboxInput from './InboxInput'
import ImportModal from './ImportModal'
import { useInbox } from '../../hooks/useInbox'
import EmptyState from '../shared/EmptyState'
import styles from './InboxPage.module.css'

export default function InboxPage() {
  const { quests } = useQuests()
  const { notes } = useNotes()
  const { bulkAddItems } = useInbox()
  const [showImport, setShowImport] = useState(false)

  // Show recent quests and notes combined, sorted by creation
  const recentItems = [
    ...quests.slice(0, 10).map(q => ({ ...q, _type: 'quest' })),
    ...notes.slice(0, 10).map(n => ({ ...n, _type: 'note', title: n.content })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 15)

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

      <div className={styles.sections}>
        <div className={styles.recentSection}>
          <h3 className={styles.sectionTitle}>Recent</h3>
          {recentItems.length === 0 ? (
            <EmptyState
              icon={"\u{1F4DD}"}
              title="Nothing here yet"
              description="Add your first quest or note above"
            />
          ) : (
            <ul className={styles.recentList}>
              {recentItems.map(item => (
                <li key={item.id} className={styles.recentItem}>
                  <span className={styles.recentText}>{item.title || item.content}</span>
                  <span className={`${styles.recentBadge} ${item._type === 'quest' ? styles.questBadge : styles.noteBadge}`}>
                    {item._type === 'quest' ? 'Quest' : 'Note'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
