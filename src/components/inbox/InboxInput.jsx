import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useNotes } from '../../hooks/useNotes'
import { DIFFICULTIES } from '../../config/constants'
import { difficultyOptions } from '../../utils/categories'
import { useCategories } from '../../hooks/useCategories'
import { recurrenceOptions } from '../../utils/recurrence'
import styles from './InboxInput.module.css'

export default function InboxInput({ onAdd }) {
  const { createQuest } = useQuests()
  const { createNote } = useNotes()
  const { visible: categoryOptions } = useCategories()
  const [text, setText] = useState('')
  const [type, setType] = useState('task')
  const [category, setCategory] = useState('health')
  const [difficulty, setDifficulty] = useState('easy')
  const [recurrence, setRecurrence] = useState('none')
  const [isBoss, setIsBoss] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const content = text.trim()
    if (!content || saving) return

    setSaving(true)

    if (type === 'task') {
      const questData = {
        title: content,
        category,
        difficulty,
        xp_value: DIFFICULTIES[difficulty].xp,
        recurrence,
        is_boss: isBoss,
      }
      if (dueDate) questData.due_date = dueDate
      if (reminderDate && reminderTime) {
        questData.reminder_at = `${reminderDate}T${reminderTime}:00`
      }
      await createQuest(questData)
    } else {
      await createNote({ content })
    }

    // Reset form
    setText('')
    setDueDate('')
    setReminderDate('')
    setReminderTime('')
    setRecurrence('none')
    setIsBoss(false)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.topRow}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={type === 'task' ? 'New quest...' : 'New note...'}
          className={styles.input}
          autoComplete="off"
        />
        <button
          type="submit"
          className={styles.addBtn}
          disabled={!text.trim() || saving}
        >
          {saving ? '...' : '+'}
        </button>
      </div>

      <div className={styles.typeToggle}>
        <button
          type="button"
          className={`${styles.typeBtn} ${type === 'task' ? styles.active : ''}`}
          onClick={() => setType('task')}
        >
          Quest
        </button>
        <button
          type="button"
          className={`${styles.typeBtn} ${type === 'note' ? styles.active : ''}`}
          onClick={() => setType('note')}
        >
          Note
        </button>
      </div>

      {type === 'task' && (
        <div className={styles.questFields}>
          <div className={styles.selectRow}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.select}
            >
              {categoryOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={styles.select}
            >
              {difficultyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.xp} XP)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.selectRow}>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className={styles.select}
            >
              {recurrenceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === 'none' ? opt.label : `Repeats ${opt.label.toLowerCase()}`}
                </option>
              ))}
            </select>
            <label className={styles.bossToggle}>
              <input
                type="checkbox"
                checked={isBoss}
                onChange={(e) => setIsBoss(e.target.checked)}
              />
              <span>Boss quest (2× XP)</span>
            </label>
          </div>

          <div className={styles.dateRow}>
            <label className={styles.dateLabel}>
              <span>Due</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={styles.dateInput}
              />
            </label>
          </div>

          <div className={styles.dateRow}>
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
          </div>
        </div>
      )}
    </form>
  )
}
