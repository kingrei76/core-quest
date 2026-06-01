# Claude as Task-Management Hub

**Status:** Phase 1 shipped (gather → propose → approve → remind). 2026-06-01.

## The need

Matt wants Claude to be the **place his tasks live**: it gathers tasks from across his life,
surfaces them somewhere he can **see and interact with them while he's working**, and **pings him
when things are due**. Claude may auto-create tasks, but each one needs his **approval via a
real-time push notification** before it counts as official.

## Decisive scope call — game is parked

The Core Quest **game layer (XP / AP / combat / "ding") is parked** until the task-management side is
proven. This track is built and reasoned about as a **standalone task manager first**. It runs
parallel to — and must not touch — the Phase 6 game/combat/team/magic code. Existing in-app game
behavior is left untouched; it's simply not part of this build. The MCP server contains **no game
logic** (completing a task there awards nothing).

## Surfaces

- **Core Quest app** (`core-quest.vercel.app`, installed PWA) — the live "see / interact / get
  reminded" surface. The Quest Board shows approved tasks plus a **"Pending approval"** section for
  Claude's proposals; push notifications ping when tasks are due or need approval.
- **Claude (Project or chat)** — the conversational planning + approval side, via the Core Quest
  MCP connector. Either works; the app carries the guaranteed pings + visible list.

## Approval model

```
inbox_items(processed=false)         ← raw captures (iOS Reminders, future sources)
        │  Claude triage (get_inbox → propose_task)
        ▼
quests(approval_status='proposed')   ← NOT official; shown in "Pending approval"; no reminders
        │  approval push → Matt taps / says "approve"
        ▼
quests(approval_status='approved')   ← official; enters the due-reminder loop
        │  reject
        ▼
quests(approval_status='rejected')   ← hidden from board, kept for audit
```

- `quests.approval_status` (`proposed` | `approved` | `rejected`, default `approved`). User-created
  tasks default approved; Claude-created tasks start proposed.
- Provenance: `quests.external_source`, `quests.external_id` (+ partial unique index for cross-source
  dedupe, mirroring `inbox_items`), and `quests.metadata.created_by = 'claude'`.
- `public.claude_actions` — audit log of every task action Claude takes.
- **Reminders only fire for approved tasks** — `dispatch-reminders` filters
  `approval_status = 'approved'`. (This migration also added the missing `quests.last_reminded_at`
  column the dispatcher had silently been failing on.)

## Components

- **`mcp-server/`** — single-tenant MCP server (Node, Streamable-HTTP, on Render), pinned to Matt's
  uid. Tools: `list_tasks`, `get_inbox`, `propose_task`, `approve_task`, `reject_task`,
  `complete_task`, `reschedule_task`, `dismiss_inbox`, `morning_briefing`. Sends approval/ reminder
  pushes directly via `web-push` (same VAPID triplet as the frontend / `dispatch-reminders`).
- **App** — `PendingApproval` section + Approve/Reject on the Quest Board; `✨ Claude` provenance
  badge on `QuestRow`.
- **Migration** — `supabase/migrations/20260601000000_task_mgmt_approval_provenance.sql`.

## Sources (phased)

- **Now:** iOS Reminders (existing `inbox_items` pipe) + the Core Quest DB itself.
- **Next:** Obsidian vault (`memory.vault_index`).
- **Later ("eventually"):** Gmail action-item flagging, Google Calendar event reminders, iMessage.

## Deferred (fast-follow, not in Phase 1)

- **Morning digest cron** — scheduled job (~5am) that caches `morning_briefing` and sends one
  consolidated push. `morning_briefing` tool already returns the payload.
- **Obsidian source** in `get_inbox`/`list_tasks`.
- **Game re-integration** — resume only after task management is proven and Matt says go.
