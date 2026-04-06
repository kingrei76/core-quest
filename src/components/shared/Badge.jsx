import styles from './Badge.module.css'

export default function Badge({ label, color }) {
  return (
    <span
      className={styles.badge}
      style={{ '--badge-color': color }}
    >
      {label}
    </span>
  )
}
