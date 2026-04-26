import { useState, useEffect } from 'react'
import { DIFFICULTIES } from '../../config/constants'
import { difficultyOptions } from '../../utils/categories'
import { useCategories } from '../../hooks/useCategories'
import { recurrenceOptions } from '../../utils/recurrence'
import styles from './QuestEditor.module.css'

function splitReminder(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export default function QuestEditor({ quest, onSave, onClose }) {
  const { visible: categoryOptions } = useCategories()
  const [title, setTitle] = useState(quest.title || '')
  const [description, setDescription] = useState(quest.description || '')
  const [category, setCategory] = useState(quest.category || 'health')
  const [difficulty, setDifficulty] = useState(quest.difficulty || 'easy')
  const [recurrence, setRecurrence] = useState(quest.recurrence || 'none')
  const [dueDate, setDueDate] = useState(quest.due_date || '')
  const initialReminder = splitReminder(quest.reminder_at)
  const [reminderDate, setReminderDate] = useState(initialReminder.date)
  const [reminderTime, setReminderTime] = useState(initialReminder.time)
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
    const updates = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      difficulty,
      xp_value: DIFFICULTIES[difficulty].xp,
      recurrence,
      due_date: dueDate || null,
      reminder_at: reminderDate && reminderTime ? `${reminderDate}T${reminderTime}:00` : null,
    }
    await onSave(quest.id, updates)
    setSaving(false)
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Edit Quest</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quest title"
            className={styles.input}
            autoFocus
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className={styles.textarea}
            rows={3}
          />
          <div className={styles.row}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.select}>
              {categoryOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={styles.select}>
              {difficultyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} ({opt.xp} XP)</option>
              ))}
            </select>
          </div>
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className={styles.select}>
            {recurrenceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.value === 'none' ? opt.label : `Repeats ${opt.label.toLowerCase()}`}
              </option>
            ))}
          </select>
          <label className={styles.dateLabel}>
            <span>Due</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={styles.dateInput}
            />
          </label>
          <label className={styles.dateLabel}>
            <span>Remind</span>
            <div className={styles.reminderInputs}>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className={styles.dateInput}
              />
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </label>
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
