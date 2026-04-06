import { STATS } from '../../config/constants'
import StatBlock from './StatBlock'
import styles from './StatsGrid.module.css'

export default function StatsGrid({ stats }) {
  return (
    <div className={styles.grid}>
      {Object.entries(STATS).map(([key, info]) => (
        <StatBlock
          key={key}
          label={info.label}
          abbr={info.abbr}
          value={stats?.[key] || 10}
          color={info.color}
        />
      ))}
    </div>
  )
}
