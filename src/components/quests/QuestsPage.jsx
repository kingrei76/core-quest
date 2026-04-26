import { useEffect, useRef, useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useXP } from '../../hooks/useXP'
import { useStreak } from '../../hooks/useStreak'
import { useVitals } from '../../hooks/useVitals'
import { useChallenges } from '../../hooks/useChallenges'
import QuestCard from './QuestCard'
import QuestFilters from './QuestFilters'
import QuestEditor from './QuestEditor'
import SubQuestModal from './SubQuestModal'
import EmptyState from '../shared/EmptyState'
import styles from './QuestsPage.module.css'

export default function QuestsPage() {
  const { quests, loading, updateQuestStatus, updateQuest, deleteQuest, createQuest, getChildren } = useQuests()
  const { awardQuestXP } = useXP()
  const { refresh: refreshStreak } = useStreak()
  const { applyDailyMissPenalty } = useVitals()
  const { recordCompletion } = useChallenges()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editing, setEditing] = useState(null)
  const [addingSubFor, setAddingSubFor] = useState(null)
  const penaltyChecked = useRef(false)

  useEffect(() => {
    if (penaltyChecked.current || loading || quests.length === 0) return
    penaltyChecked.current = true
    applyDailyMissPenalty(quests)
  }, [quests, loading, applyDailyMissPenalty])

  const topLevel = quests.filter(q => !q.parent_quest_id)

  const filteredQuests = topLevel.filter(q => {
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false
    if (statusFilter === 'active') return q.status === 'available' || q.status === 'in_progress'
    if (statusFilter === 'completed') return q.status === 'completed'
    if (statusFilter === 'failed') return q.status === 'failed'
    if (statusFilter === 'abandoned') return q.status === 'abandoned'
    return true
  })

  const handleComplete = async (quest) => {
    await updateQuestStatus(quest.id, 'completed')
    await awardQuestXP(quest)
    await recordCompletion(quest)
    await refreshStreak()
  }

  const handleStart = async (quest) => {
    await updateQuestStatus(quest.id, 'in_progress')
  }

  const handleFail = async (quest) => {
    await updateQuestStatus(quest.id, 'failed')
  }

  const handleAbandon = async (quest) => {
    await updateQuestStatus(quest.id, 'abandoned')
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
          icon="⚔️"
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
              children={getChildren(quest.id)}
              onComplete={handleComplete}
              onStart={handleStart}
              onFail={handleFail}
              onAbandon={handleAbandon}
              onEdit={setEditing}
              onDelete={handleDelete}
              onAddSubQuest={setAddingSubFor}
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

      {addingSubFor && (
        <SubQuestModal
          parent={addingSubFor}
          onCreate={createQuest}
          onClose={() => setAddingSubFor(null)}
        />
      )}
    </div>
  )
}
