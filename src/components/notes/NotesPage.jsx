import { useState } from 'react'
import { useNotes } from '../../hooks/useNotes'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'
import EmptyState from '../shared/EmptyState'
import styles from './NotesPage.module.css'

export default function NotesPage() {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes()
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState(null)

  const handleSave = async (noteData) => {
    if (editingNote) {
      await updateNote(editingNote.id, noteData)
    } else {
      await createNote(noteData)
    }
    setShowEditor(false)
    setEditingNote(null)
  }

  const handleEdit = (note) => {
    setEditingNote(note)
    setShowEditor(true)
  }

  const handleDelete = async (noteId) => {
    await deleteNote(noteId)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Notes</h2>
        <button
          className={styles.newBtn}
          onClick={() => { setEditingNote(null); setShowEditor(true) }}
        >
          + New Note
        </button>
      </div>

      {showEditor && (
        <NoteEditor
          note={editingNote}
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditingNote(null) }}
        />
      )}

      {loading ? null : notes.length === 0 ? (
        <EmptyState
          icon={"\u{1F4DC}"}
          title="No notes yet"
          description="Create a note or process inbox items as notes"
        />
      ) : (
        <div className={styles.list}>
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
