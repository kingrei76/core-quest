import styles from './HPMPBar.module.css'

export default function HPMPBar({ label, current, max, color }) {
  const pct = max > 0 ? (current / max) * 100 : 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.values}>{current} / {max}</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
