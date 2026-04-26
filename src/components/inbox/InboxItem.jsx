import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useNotes } from '../../hooks/useNotes'
import { DIFFICULTIES } from '../../config/constants'
import { categoryOptions, difficultyOptions } from '../../utils/categories'
import { recurrenceOptions } from '../../utils/recurrence'
import styles from './InboxItem.module.css'

export default function InboxItem({ item, onProcess, onDismiss }) {
  const { createQuest } = useQuests()
  const { createNote } = useNotes()
  const [category, setCategory] = useState('health')
  const [difficulty, setDifficulty] = useState('easy')
  const [recurrence, setRecurrence] = useState('none')
  const [dueDate, setDueDate] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleCreateQuest = async () => {
    setProcessing(true)
    const xpValue = DIFFICULTIES[difficulty].xp
    const questData = {
      title: item.content,
      category,
      difficulty,
      xp_value: xpValue,
      inbox_source_id: item.id,
      recurrence,
    }
    if (dueDate) questData.due_date = dueDate
    if (reminderDate && reminderTime) {
      questData.reminder_at = `${reminderDate}T${reminderTime}:00`
    }
    await createQuest(questData)
    await onProcess(item.id)
    setProcessing(false)
  }

  const handleSaveNote = async () => {
    setProcessing(true)
    await createNote({
      content: item.content,
      inbox_source_id: item.id,
    })
    await onProcess(item.id)
    setProcessing(false)
  }

  return (
    <div className={styles.item}>
      <p className={styles.content}>{item.content}</p>

      <div className={styles.controls}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.select}
        >
          {categoryOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
      </div>

      <div className={styles.dateControls}>
        <label className={styles.dateLabel}>
          <span>Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={styles.dateInput}
          />
        </label>

        <label className={styles.dateLabel}>
          <span>Remind me</span>
          <div className={styles.reminderRow}>
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

      <div className={styles.actions}>
        <button
          onClick={handleCreateQuest}
          disabled={processing}
          className={styles.questBtn}
        >
          Create Quest
        </button>
        <button
          onClick={handleSaveNote}
          disabled={processing}
          className={styles.noteBtn}
        >
          Save as Note
        </button>
        <button
          onClick={() => onDismiss(item.id)}
          disabled={processing}
          className={styles.dismissBtn}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
