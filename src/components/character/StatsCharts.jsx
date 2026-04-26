import { useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useStatsTimeseries } from '../../hooks/useStatsTimeseries'
import { useCategories } from '../../hooks/useCategories'
import styles from './StatsCharts.module.css'

const RANGES = [
  { value: 14, label: '2W' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
]

function formatTick(date) {
  const d = new Date(date + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function StatsCharts() {
  const [range, setRange] = useState(30)
  const { series, byCategory, loading } = useStatsTimeseries(range)
  const { lookup } = useCategories()

  if (loading) return null

  const totalXp = series.reduce((sum, p) => sum + p.xp, 0)
  if (totalXp === 0) return null

  const categoryData = Object.entries(byCategory).map(([key, value]) => ({
    name: lookup[key]?.label || key,
    value,
    color: lookup[key]?.color || 'var(--color-text-muted)',
  })).sort((a, b) => b.value - a.value)

  return (
    <div className={styles.section}>
      <div className={styles.heading}>
        <h3>XP over time</h3>
        <div className={styles.rangeToggle}>
          {RANGES.map(r => (
            <button
              key={r.value}
              className={`${styles.rangeBtn} ${range === r.value ? styles.rangeActive : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-xp)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--color-xp)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tickFormatter={formatTick} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
              labelStyle={{ color: 'var(--color-text-primary)' }}
              formatter={(value) => [`${value} XP`, 'Earned']}
            />
            <Area type="monotone" dataKey="xp" stroke="var(--color-xp)" fill="url(#xpFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {categoryData.length > 0 && (
        <>
          <div className={styles.subheading}>By category</div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={Math.max(120, categoryData.length * 28)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  formatter={(value) => [`${value} XP`, 'Earned']}
                />
                <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
