import { useState } from 'react'
import { useInbox } from '../../hooks/useInbox'
import InboxInput from './InboxInput'
import InboxList from './InboxList'
import ImportModal from './ImportModal'
import EmptyState from '../shared/EmptyState'
import styles from './InboxPage.module.css'

export default function InboxPage() {
  const { pendingItems, recentItems, loading, addItem, bulkAddItems, processItem, dismissItem } = useInbox()
  const [showImport, setShowImport] = useState(false)

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

      <InboxInput onAdd={addItem} />

      <div className={styles.sections}>
        {/* Desktop: processing list */}
        <div className={styles.processingSection}>
          <h3 className={styles.sectionTitle}>
            Unprocessed ({pendingItems.length})
          </h3>
          {pendingItems.length === 0 && !loading ? (
            <EmptyState
              icon="\u2728"
              title="All clear!"
              description="Capture something new above"
            />
          ) : (
            <InboxList
              items={pendingItems}
              onProcess={processItem}
              onDismiss={dismissItem}
            />
          )}
        </div>

        {/* Mobile: recent captures */}
        <div className={styles.recentSection}>
          <h3 className={styles.sectionTitle}>Recent</h3>
          {recentItems.length === 0 ? (
            <EmptyState
              icon="\u{1F4DD}"
              title="Nothing here yet"
              description="Add your first task or note above"
            />
          ) : (
            <ul className={styles.recentList}>
              {recentItems.map(item => (
                <li key={item.id} className={styles.recentItem}>
                  <span className={styles.recentText}>{item.content}</span>
                  <span className={styles.recentStatus}>
                    {item.processed ? '\u2713' : '\u25CB'}
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
