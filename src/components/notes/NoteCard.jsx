import styles from './NoteCard.module.css'

export default function NoteCard({ note, onEdit, onDelete }) {
  const linkedQuest = note.quests?.title

  return (
    <div className={styles.card} onClick={() => onEdit(note)}>
      <div className={styles.content}>
        {note.content}
      </div>

      <div className={styles.footer}>
        {linkedQuest && (
          <span className={styles.linked}>{'\u2694'} {linkedQuest}</span>
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
