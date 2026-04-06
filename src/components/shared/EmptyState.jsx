import styles from './EmptyState.module.css'

export default function EmptyState({ icon, title, description }) {
  return (
    <div className={styles.container}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}
