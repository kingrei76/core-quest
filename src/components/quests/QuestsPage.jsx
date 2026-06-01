import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuests } from '../../hooks/useQuests'
import { useXP } from '../../hooks/useXP'
import { useStreak } from '../../hooks/useStreak'
import { useVitals } from '../../hooks/useVitals'
import { useChallenges } from '../../hooks/useChallenges'
import { useNotes } from '../../hooks/useNotes'
import QuestRow from './QuestRow'
import QuestSection from './QuestSection'
import QuestFilters from './QuestFilters'
import QuestEditor from './QuestEditor'
import SubQuestModal from './SubQuestModal'
import PendingApproval from './PendingApproval'
import EmptyState from '../shared/EmptyState'
import { groupQuestsByBucket, BUCKET_LABELS } from '../../utils/buckets'
import styles from './QuestsPage.module.css'

export default function QuestsPage() {
  const { quests, loading, updateQuestStatus, updateQuest, deleteQuest, createQuest } = useQuests()
  const { awardQuestXP } = useXP()
  const { refresh: refreshStreak } = useStreak()
  const { applyDailyMissPenalty } = useVitals()
  const { recordCompletion } = useChallenges()
  const { notes } = useNotes()
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

  // Build a parent_id → [children] map once per quests change so each row can
  // resolve its own children without re-scanning the array.
  const childMap = useMemo(() => {
    const map = {}
    for (const q of quests) {
      if (q.parent_quest_id) {
        if (!map[q.parent_quest_id]) map[q.parent_quest_id] = []
        map[q.parent_quest_id].push(q)
      }
    }
    return map
  }, [quests])

  const noteCountByQuest = useMemo(() => {
    return notes.reduce((acc, n) => {
      if (n.linked_quest_id) acc[n.linked_quest_id] = (acc[n.linked_quest_id] || 0) + 1
      return acc
    }, {})
  }, [notes])

  // Claude-proposed tasks awaiting approval. They're real quest rows
  // (approval_status='proposed') but must stay out of the normal board until
  // Matt approves them. This is the tap-target for the approval push.
  const pendingTasks = quests.filter(
    q => q.approval_status === 'proposed' && !q.parent_quest_id,
  )

  const topLevel = quests.filter(q => !q.parent_quest_id)

  const filteredQuests = topLevel.filter(q => {
    // Only official (approved) tasks appear in the standard views; proposed
    // tasks live in the pending section, rejected ones are hidden entirely.
    if (q.approval_status && q.approval_status !== 'approved') return false
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false
    if (statusFilter === 'active') return q.status === 'available' || q.status === 'in_progress'
    if (statusFilter === 'completed') return q.status === 'completed'
    if (statusFilter === 'failed') return q.status === 'failed'
    if (statusFilter === 'abandoned') return q.status === 'abandoned'
    return true
  })

  // Bucketing only applies to active quests where due-date urgency matters.
  // For other statuses, show a flat list — "Today" / "Overdue" don't make
  // sense for already-completed/failed/abandoned items.
  const sections = useMemo(() => {
    if (statusFilter !== 'active') {
      return [{ key: 'flat', label: null, tone: 'default', quests: filteredQuests }]
    }
    return groupQuestsByBucket(filteredQuests)
  }, [filteredQuests, statusFilter])

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

  // Approving a proposed task makes it official; rejecting hides it (kept for
  // audit). Both flip approval_status — no XP/game side-effects.
  const handleApprove = async (quest) => {
    await updateQuest(quest.id, { approval_status: 'approved' })
  }

  const handleReject = async (quest) => {
    await updateQuest(quest.id, { approval_status: 'rejected' })
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

      <PendingApproval
        tasks={pendingTasks}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {loading ? null : filteredQuests.length === 0 ? (
        pendingTasks.length > 0 ? null : (
        <EmptyState
          icon="⚔️"
          title="No quests found"
          description={statusFilter === 'active'
            ? 'Process inbox items to create quests'
            : 'Complete some quests to see them here'}
        />
        )
      ) : (
        <div className={styles.sections}>
          {sections.map(section => (
            section.label ? (
              <QuestSection
                key={section.key}
                label={section.label}
                tone={section.tone}
                count={section.quests.length}
              >
                {section.quests.map(quest => (
                  <QuestRow
                    key={quest.id}
                    quest={quest}
                    children={childMap[quest.id] || []}
                    noteCount={noteCountByQuest[quest.id] || 0}
                    onComplete={handleComplete}
                    onStart={handleStart}
                    onFail={handleFail}
                    onAbandon={handleAbandon}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                    onAddSubQuest={setAddingSubFor}
                    childMap={childMap}
                    noteCountByQuest={noteCountByQuest}
                  />
                ))}
              </QuestSection>
            ) : (
              <div key={section.key} className={styles.flatList}>
                {section.quests.map(quest => (
                  <QuestRow
                    key={quest.id}
                    quest={quest}
                    children={childMap[quest.id] || []}
                    noteCount={noteCountByQuest[quest.id] || 0}
                    onComplete={handleComplete}
                    onStart={handleStart}
                    onFail={handleFail}
                    onAbandon={handleAbandon}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                    onAddSubQuest={setAddingSubFor}
                    childMap={childMap}
                    noteCountByQuest={noteCountByQuest}
                  />
                ))}
              </div>
            )
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
