import { useCharacter } from '../../contexts/CharacterContext'
import { useStreak } from '../../hooks/useStreak'
import { useAuth } from '../../contexts/AuthContext'
import XPBar from './XPBar'
import StatsGrid from './StatsGrid'
import HPMPBar from './HPMPBar'
import StreakDisplay from './StreakDisplay'
import HistoryList from './HistoryList'
import NotificationSettings from './NotificationSettings'
import ChallengePanel from './ChallengePanel'
import AchievementsGrid from './AchievementsGrid'
import CategoryManager from './CategoryManager'
import LoadingSpinner from '../shared/LoadingSpinner'
import styles from './CharacterPage.module.css'

export default function CharacterPage() {
  const { signOut } = useAuth()
  const { profile, stats, loading, level, totalXP, progress, title, characterClass, currentHp, currentMp, hpMax, mpMax } = useCharacter()
  const streak = useStreak()

  if (loading) return <LoadingSpinner />

  const characterName = profile?.character_name || profile?.display_name || 'Adventurer'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.name}>{characterName}</h2>
        <p className={styles.titleClass}>
          Level {level} {title} &middot; {characterClass}
        </p>
      </div>

      <XPBar totalXP={totalXP} level={level} progress={progress} />

      <div className={styles.bars}>
        <HPMPBar label="HP" current={currentHp} max={hpMax} color="var(--color-hp)" />
        <HPMPBar label="MP" current={currentMp} max={mpMax} color="var(--color-mp)" />
      </div>

      <StatsGrid stats={stats} />

      <StreakDisplay current={streak.current} best={streak.best} />

      <ChallengePanel />

      <AchievementsGrid />

      <CategoryManager />

      <NotificationSettings />

      <HistoryList />

      <button onClick={signOut} className={styles.signOut}>
        Sign Out
      </button>
    </div>
  )
}
