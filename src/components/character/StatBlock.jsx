import styles from './StatBlock.module.css'

export default function StatBlock({ label, abbr, value, color }) {
  return (
    <div className={styles.block} style={{ '--stat-color': color }}>
      <span className={styles.abbr}>{abbr}</span>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
