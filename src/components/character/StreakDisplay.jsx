import styles from './StreakDisplay.module.css'

export default function StreakDisplay({ current, best }) {
  return (
    <div className={styles.container}>
      <div className={styles.current}>
        <span className={styles.flame}>{current > 0 ? '\u{1F525}' : '\u{1F9CA}'}</span>
        <span className={styles.count}>{current}</span>
        <span className={styles.label}>day streak</span>
      </div>
      <div className={styles.best}>
        Best: {best} days
      </div>
    </div>
  )
}
