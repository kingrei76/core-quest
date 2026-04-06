import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import styles from './NoteEditor.module.css'

export default function NoteEditor({ note, onSave, onCancel }) {
  const { quests } = useQuests()
  const [content, setContent] = useState(note?.content || '')
  const [linkedQuestId, setLinkedQuestId] = useState(note?.linked_quest_id || '')
  const [saving, setSaving] = useState(false)

  const activeQuests = quests.filter(q => q.status !== 'completed' && q.status !== 'abandoned')

  const handleSave = async () => {
    if (!content.trim() || saving) return
    setSaving(true)
    await onSave({
      content: content.trim(),
      linked_quest_id: linkedQuestId || null,
    })
    setSaving(false)
  }

  return (
    <div className={styles.editor}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your note..."
        className={styles.textarea}
        rows={5}
        autoFocus
      />

      <div className={styles.options}>
        <select
          value={linkedQuestId}
          onChange={(e) => setLinkedQuestId(e.target.value)}
          className={styles.select}
        >
          <option value="">Link to quest (optional)</option>
          {activeQuests.map(q => (
            <option key={q.id} value={q.id}>{q.title}</option>
          ))}
        </select>
      </div>

      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className={styles.saveBtn}
        >
          {saving ? 'Saving...' : note ? 'Update Note' : 'Save Note'}
        </button>
      </div>
    </div>
  )
}
