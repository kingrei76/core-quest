import { useCharacter } from '../../contexts/CharacterContext'
import styles from './TopBar.module.css'

export default function TopBar() {
  const { level, title } = useCharacter()

  return (
    <header className={styles.topBar}>
      <h1 className={styles.title}>CORE Quest</h1>
      <div className={styles.info}>
        <span className={styles.level}>Lv.{level}</span>
        <span className={styles.charTitle}>{title}</span>
      </div>
    </header>
  )
}
