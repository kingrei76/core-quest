import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import styles from './NoteEditor.module.css'

function parseTagInput(input) {
  return input
    .split(',')
    .map(t => t.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean)
}

export default function NoteEditor({ note, onSave, onCancel }) {
  const { quests } = useQuests()
  const [content, setContent] = useState(note?.content || '')
  const [tags, setTags] = useState(note?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [linkedQuestId, setLinkedQuestId] = useState(note?.linked_quest_id || '')
  const [saving, setSaving] = useState(false)

  const activeQuests = quests.filter(q => q.status !== 'completed' && q.status !== 'abandoned')

  const addTagsFromInput = () => {
    const next = parseTagInput(tagInput)
    if (next.length === 0) return
    setTags(prev => Array.from(new Set([...prev, ...next])))
    setTagInput('')
  }

  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTagsFromInput()
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      e.preventDefault()
      setTags(prev => prev.slice(0, -1))
    }
  }

  const handleSave = async () => {
    if (!content.trim() || saving) return
    setSaving(true)
    // capture any pending tag input that wasn't committed
    const pending = parseTagInput(tagInput)
    const finalTags = pending.length > 0 ? Array.from(new Set([...tags, ...pending])) : tags
    await onSave({
      content: content.trim(),
      tags: finalTags,
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

      <div className={styles.tags}>
        {tags.map(tag => (
          <span key={tag} className={styles.tagChip}>
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} className={styles.tagRemove} aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKey}
          onBlur={addTagsFromInput}
          placeholder={tags.length === 0 ? 'Add tags (comma or enter)' : 'Add more…'}
          className={styles.tagInput}
        />
      </div>

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
