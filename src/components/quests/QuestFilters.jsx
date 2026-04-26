import { useCategories } from '../../hooks/useCategories'
import styles from './QuestFilters.module.css'

export default function QuestFilters({ category, onCategoryChange, status, onStatusChange }) {
  const { visible: categoryOptions } = useCategories()
  return (
    <div className={styles.filters}>
      <div className={styles.chips}>
        <button
          className={`${styles.chip} ${category === 'all' ? styles.active : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          All
        </button>
        {categoryOptions.map(opt => (
          <button
            key={opt.key}
            className={`${styles.chip} ${category === opt.key ? styles.active : ''}`}
            style={{ '--chip-color': opt.color }}
            onClick={() => onCategoryChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.statusToggle}>
        {['active', 'completed', 'failed', 'abandoned', 'all'].map(s => (
          <button
            key={s}
            className={`${styles.statusBtn} ${status === s ? styles.statusActive : ''}`}
            onClick={() => onStatusChange(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}
