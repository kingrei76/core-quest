// Group quests into Today / Tomorrow / This week / Later / No date / Overdue
// based on their due_date. Shared by InboxPage and QuestsPage so both surfaces
// use identical date semantics.

export const BUCKET_ORDER = ['overdue', 'today', 'tomorrow', 'thisWeek', 'later', 'noDate']

export const BUCKET_LABELS = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  thisWeek: 'This week',
  later: 'Later',
  noDate: 'No due date',
}

export const BUCKET_TONES = {
  overdue: 'danger',
  today: 'accent',
  tomorrow: 'default',
  thisWeek: 'default',
  later: 'default',
  noDate: 'muted',
}

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function bucketForQuest(quest, today = startOfToday()) {
  if (!quest.due_date) return 'noDate'
  const due = new Date(quest.due_date + 'T00:00:00')
  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 7) return 'thisWeek'
  return 'later'
}

// Group an array of quests into ordered, populated buckets.
// Returns: [{ key, label, tone, quests }, ...] in BUCKET_ORDER, only including
// buckets that contain at least one quest.
export function groupQuestsByBucket(quests, today = startOfToday()) {
  const buckets = {}
  for (const quest of quests) {
    const key = bucketForQuest(quest, today)
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(quest)
  }
  return BUCKET_ORDER
    .filter(key => buckets[key]?.length > 0)
    .map(key => ({
      key,
      label: BUCKET_LABELS[key],
      tone: BUCKET_TONES[key],
      quests: buckets[key],
    }))
}
