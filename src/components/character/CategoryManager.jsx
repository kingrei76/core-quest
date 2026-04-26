import { useState } from 'react'
import { useCategories } from '../../hooks/useCategories'
import { STATS } from '../../config/constants'
import styles from './CategoryManager.module.css'

const PRESET_COLORS = [
  '#7dd3fc', '#a5b4fc', '#fda4af', '#fcd34d',
  '#86efac', '#c4b5fd', '#f9a8d4', '#fb923c',
]

export default function CategoryManager() {
  const { all, createCategory, archiveCategory, unarchiveCategory } = useCategories()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [stat, setStat] = useState('vitality')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!label.trim() || busy) return
    setBusy(true)
    const key = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!key) {
      setBusy(false)
      return
    }
    await createCategory({ key, label: label.trim(), stat, color })
    setLabel('')
    setStat('vitality')
    setColor(PRESET_COLORS[0])
    setAdding(false)
    setBusy(false)
  }

  return (
    <div className={styles.section}>
      <div className={styles.heading}>
        <h3>Categories</h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className={styles.addBtn}>+ Add</button>
        )}
      </div>

      {adding && (
        <form onSubmit={submit} className={styles.form}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Category name (e.g. Creative)"
            className={styles.input}
            autoFocus
          />
          <select value={stat} onChange={(e) => setStat(e.target.value)} className={styles.select}>
            {Object.entries(STATS).map(([k, v]) => (
              <option key={k} value={k}>Boosts {v.label}</option>
            ))}
          </select>
          <div className={styles.colorRow}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`${styles.swatch} ${color === c ? styles.swatchActive : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Choose color ${c}`}
              />
            ))}
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setAdding(false)} className={styles.cancelBtn} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={busy || !label.trim()}>
              {busy ? '…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <ul className={styles.list}>
        {all.map(cat => (
          <li key={cat.key} className={`${styles.row} ${cat.archived ? styles.archived : ''}`}>
            <span className={styles.swatchSmall} style={{ background: cat.color || 'var(--color-text-muted)' }} />
            <span className={styles.label}>{cat.label}</span>
            <span className={styles.stat}>{cat.stat}</span>
            {cat.id ? (
              cat.archived ? (
                <button onClick={() => unarchiveCategory(cat.id)} className={styles.actionBtn}>Restore</button>
              ) : (
                <button onClick={() => archiveCategory(cat.id)} className={styles.actionBtn}>Archive</button>
              )
            ) : (
              <span className={styles.builtin}>Built-in</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
