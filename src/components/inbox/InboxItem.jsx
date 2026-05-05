import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useNotes } from '../../hooks/useNotes'
import { DIFFICULTIES } from '../../config/constants'
import { difficultyOptions } from '../../utils/categories'
import { useCategories } from '../../hooks/useCategories'
import { recurrenceOptions } from '../../utils/recurrence'
import styles from './InboxItem.module.css'

export default function InboxItem({ item, onProcess, onDismiss }) {
  const { createQuest } = useQuests()
  const { createNote } = useNotes()
  const { visible: categoryOptions } = useCategories()
  const meta = item.metadata || {}
  const [category, setCategory] = useState(meta.category || 'health')
  const [difficulty, setDifficulty] = useState(meta.difficulty || 'easy')
  const [recurrence, setRecurrence] = useState(meta.recurrence || 'none')
  const [dueDate, setDueDate] = useState(meta.due_date || item.due_date || '')
  const [reminderDate, setReminderDate] = useState(meta.reminder_date || '')
  const [reminderTime, setReminderTime] = useState(meta.reminder_time || '')
  const [processing, setProcessing] = useState(false)

  const handleCreateQuest = async () => {
    setProcessing(true)
    try {
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
        questData.reminder_at = new Date(`${reminderDate}T${reminderTime}`).toISOString()
      }
      const { error: createErr } = await createQuest(questData)
      if (createErr) throw createErr
      const { error: processErr } = await onProcess(item.id)
      if (processErr) throw processErr
    } catch (err) {
      alert(`Couldn't create quest: ${err.message || err}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveNote = async () => {
    setProcessing(true)
    try {
      const { error: createErr } = await createNote({
        content: item.content,
        inbox_source_id: item.id,
      })
      if (createErr) throw createErr
      const { error: processErr } = await onProcess(item.id)
      if (processErr) throw processErr
    } catch (err) {
      alert(`Couldn't save note: ${err.message || err}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleDismiss = async () => {
    setProcessing(true)
    try {
      const { error } = await onDismiss(item.id)
      if (error) throw error
    } catch (err) {
      alert(`Couldn't dismiss: ${err.message || err}`)
    } finally {
      setProcessing(false)
    }
  }

  const sourceLabel = {
    ios_reminders: 'iPhone Reminders',
    ios_notes: 'iPhone Notes',
  }[item.external_source]

  return (
    <div className={styles.item}>
      {sourceLabel && (
        <span className={styles.sourceBadge}>{sourceLabel}</span>
      )}
      <p className={styles.content}>{item.content}</p>

      <div className={styles.controls}>
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
          onClick={handleDismiss}
          disabled={processing}
          className={styles.dismissBtn}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
