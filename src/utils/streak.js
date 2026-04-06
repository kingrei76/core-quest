/**
 * Calculate current and best streak from XP events.
 * A streak is consecutive calendar days (local timezone) with at least one event.
 */
export function calculateStreak(xpEvents) {
  if (!xpEvents || xpEvents.length === 0) {
    return { current: 0, best: 0 }
  }

  // Get unique dates (local timezone), sorted descending
  const dates = [...new Set(
    xpEvents.map(e => {
      const d = new Date(e.created_at)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
  )].sort().reverse()

  if (dates.length === 0) return { current: 0, best: 0 }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  // Current streak: start from today or yesterday
  let current = 0
  let startIdx = -1

  if (dates[0] === todayStr) {
    startIdx = 0
  } else if (dates[0] === yesterdayStr) {
    startIdx = 0
  }

  if (startIdx >= 0) {
    current = 1
    for (let i = startIdx + 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      const diffDays = Math.round((prev - curr) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        current++
      } else {
        break
      }
    }
  }

  // Best streak: find longest consecutive run
  let best = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = Math.round((prev - curr) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      run++
      if (run > best) best = run
    } else {
      run = 1
    }
  }

  return { current, best: Math.max(best, current) }
}
