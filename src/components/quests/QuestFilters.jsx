import { categoryOptions } from '../../utils/categories'
import styles from './QuestFilters.module.css'

export default function QuestFilters({ category, onCategoryChange, status, onStatusChange }) {
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
            key={opt.value}
            className={`${styles.chip} ${category === opt.value ? styles.active : ''}`}
            style={{ '--chip-color': opt.color }}
            onClick={() => onCategoryChange(opt.value)}
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
