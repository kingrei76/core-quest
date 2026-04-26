import { useEffect, useState } from 'react'
import { DIFFICULTIES } from '../../config/constants'
import { categoryOptions, difficultyOptions } from '../../utils/categories'
import styles from './QuestEditor.module.css'

export default function SubQuestModal({ parent, onCreate, onClose }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(parent.category || 'health')
  const [difficulty, setDifficulty] = useState('easy')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    await onCreate({
      title: title.trim(),
      category,
      difficulty,
      xp_value: DIFFICULTIES[difficulty].xp,
      parent_quest_id: parent.id,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Add sub-quest</h2>
        <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Under: {parent.title}
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sub-quest title"
            className={styles.input}
            autoFocus
          />
          <div className={styles.row}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.select}>
              {categoryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={styles.select}>
              {difficultyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} ({opt.xp} XP)</option>
              ))}
            </select>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving || !title.trim()}>
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
