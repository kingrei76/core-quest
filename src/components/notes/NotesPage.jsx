import { useMemo, useState } from 'react'
import { useNotes } from '../../hooks/useNotes'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'
import EmptyState from '../shared/EmptyState'
import styles from './NotesPage.module.css'

export default function NotesPage() {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes()
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)

  const allTags = useMemo(() => {
    const set = new Set()
    for (const note of notes) {
      for (const tag of note.tags || []) set.add(tag)
    }
    return Array.from(set).sort()
  }, [notes])

  const visibleNotes = useMemo(() => {
    if (!tagFilter) return notes
    return notes.filter(n => (n.tags || []).includes(tagFilter))
  }, [notes, tagFilter])

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

      {allTags.length > 0 && (
        <div className={styles.tagFilters}>
          <button
            className={`${styles.tagChip} ${!tagFilter ? styles.tagActive : ''}`}
            onClick={() => setTagFilter(null)}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`${styles.tagChip} ${tagFilter === tag ? styles.tagActive : ''}`}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {showEditor && (
        <NoteEditor
          note={editingNote}
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditingNote(null) }}
        />
      )}

      {loading ? null : visibleNotes.length === 0 ? (
        <EmptyState
          icon={"\u{1F4DC}"}
          title={tagFilter ? `No notes tagged #${tagFilter}` : 'No notes yet'}
          description={tagFilter ? 'Try another tag or clear the filter' : 'Create a note or process inbox items as notes'}
        />
      ) : (
        <div className={styles.list}>
          {visibleNotes.map(note => (
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
