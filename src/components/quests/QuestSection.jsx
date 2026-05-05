import styles from './QuestSection.module.css'

export default function QuestSection({ label, tone = 'default', count, children }) {
  return (
    <section className={styles.section}>
      <header className={`${styles.header} ${styles[tone] || ''}`}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{count}</span>
      </header>
      <div className={styles.list}>{children}</div>
    </section>
  )
}
