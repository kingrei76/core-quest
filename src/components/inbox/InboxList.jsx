import InboxItem from './InboxItem'
import styles from './InboxList.module.css'

export default function InboxList({ items, onProcess, onDismiss }) {
  return (
    <div className={styles.list}>
      {items.map(item => (
        <InboxItem
          key={item.id}
          item={item}
          onProcess={onProcess}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
