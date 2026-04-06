import { useState } from 'react'
import styles from './ImportModal.module.css'

export default function ImportModal({ onImport, onClose }) {
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const handleImport = async () => {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (lines.length === 0) return

    setImporting(true)
    const { data, error } = await onImport(lines)

    if (error) {
      setResult({ type: 'error', message: error.message })
    } else {
      setResult({ type: 'success', message: `Imported ${data?.length || lines.length} items` })
      setTimeout(onClose, 1500)
    }
    setImporting(false)
  }

  const lineCount = text.split('\n').filter(l => l.trim().length > 0).length

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Import from Apple Reminders</h3>
        <p className={styles.hint}>
          Paste your reminders below, one per line.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Buy groceries\nCall dentist\nFinish report\n..."}
          className={styles.textarea}
          rows={10}
          autoFocus
        />

        <div className={styles.footer}>
          <span className={styles.count}>
            {lineCount} item{lineCount !== 1 ? 's' : ''}
          </span>
          <div className={styles.buttons}>
            <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button
              onClick={handleImport}
              disabled={lineCount === 0 || importing}
              className={styles.importBtn}
            >
              {importing ? 'Importing...' : `Import ${lineCount} items`}
            </button>
          </div>
        </div>

        {result && (
          <p className={`${styles.result} ${styles[result.type]}`}>
            {result.message}
          </p>
        )}
      </div>
    </div>
  )
}
