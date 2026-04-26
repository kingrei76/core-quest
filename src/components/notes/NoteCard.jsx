import styles from './NoteCard.module.css'

export default function NoteCard({ note, onEdit, onDelete }) {
  const linkedQuest = note.quests?.title
  const tags = note.tags || []

  return (
    <div className={styles.card} onClick={() => onEdit(note)}>
      <div className={styles.content}>
        {note.content}
      </div>

      {tags.length > 0 && (
        <div className={styles.tagRow}>
          {tags.map(tag => (
            <span key={tag} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        {linkedQuest && (
          <span className={styles.linked}>{'⚔'} {linkedQuest}</span>
        )}
        <span className={styles.date}>
          {new Date(note.created_at).toLocaleDateString()}
        </span>
        <button
          className={styles.deleteBtn}
          onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
