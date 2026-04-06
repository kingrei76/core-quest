import { useState } from 'react'
import styles from './InboxInput.module.css'

export default function InboxInput({ onAdd }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const content = text.trim()
    if (!content || saving) return

    setSaving(true)
    await onAdd(content)
    setText('')
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Capture a task or note..."
        className={styles.input}
        autoComplete="off"
      />
      <button
        type="submit"
        className={styles.button}
        disabled={!text.trim() || saving}
      >
        {saving ? '...' : '+'}
      </button>
    </form>
  )
}
