import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useNotes } from '../../hooks/useNotes'
import { DIFFICULTIES } from '../../config/constants'
import { categoryOptions, difficultyOptions } from '../../utils/categories'
import styles from './InboxItem.module.css'

export default function InboxItem({ item, onProcess, onDismiss }) {
  const { createQuest } = useQuests()
  const { createNote } = useNotes()
  const [category, setCategory] = useState('health')
  const [difficulty, setDifficulty] = useState('easy')
  const [processing, setProcessing] = useState(false)

  const handleCreateQuest = async () => {
    setProcessing(true)
    const xpValue = DIFFICULTIES[difficulty].xp
    await createQuest({
      title: item.content,
      category,
      difficulty,
      xp_value: xpValue,
      inbox_source_id: item.id,
    })
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
