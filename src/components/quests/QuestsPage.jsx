import { useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useXP } from '../../hooks/useXP'
import { useStreak } from '../../hooks/useStreak'
import QuestCard from './QuestCard'
import QuestFilters from './QuestFilters'
import QuestEditor from './QuestEditor'
import EmptyState from '../shared/EmptyState'
import styles from './QuestsPage.module.css'

export default function QuestsPage() {
  const { quests, loading, updateQuestStatus, updateQuest, deleteQuest } = useQuests()
  const { awardQuestXP } = useXP()
  const { refresh: refreshStreak } = useStreak()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editing, setEditing] = useState(null)

  const filteredQuests = quests.filter(q => {
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false
    if (statusFilter === 'active') return q.status === 'available' || q.status === 'in_progress'
    if (statusFilter === 'completed') return q.status === 'completed'
    return true
  })

  const handleComplete = async (quest) => {
    await updateQuestStatus(quest.id, 'completed')
    await awardQuestXP(quest)
    await refreshStreak()
  }

  const handleStart = async (quest) => {
    await updateQuestStatus(quest.id, 'in_progress')
  }

  const handleDelete = async (quest) => {
    await deleteQuest(quest.id)
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Quest Board</h2>

      <QuestFilters
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
        status={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {loading ? null : filteredQuests.length === 0 ? (
        <EmptyState
          icon="\u2694\uFE0F"
          title="No quests found"
          description={statusFilter === 'active'
            ? 'Process inbox items to create quests'
            : 'Complete some quests to see them here'}
        />
      ) : (
        <div className={styles.list}>
          {filteredQuests.map(quest => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onComplete={handleComplete}
              onStart={handleStart}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editing && (
        <QuestEditor
          quest={editing}
          onSave={updateQuest}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
