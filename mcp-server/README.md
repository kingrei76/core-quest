# Core Quest MCP Server

A single-tenant [MCP](https://modelcontextprotocol.io) server that lets Claude act as Matt's
task-management hub for Core Quest. It **gathers** tasks (iOS Reminders inbox + existing Core Quest
tasks), lets Claude **propose** new tasks that Matt **approves via a push notification**, and surfaces
the **morning digest** (pending + overdue + due today). No game logic lives here — see the
"game parked" decision in `docs/design/claude-task-management.md`.

## Tools

| Tool | What it does |
|------|--------------|
| `list_tasks(view)` | List tasks by view: `today`, `overdue`, `upcoming`, `pending`, `active`, `all`. |
| `get_inbox` | Unprocessed inbox items (iOS Reminders etc.) awaiting triage. |
| `propose_task(...)` | Create a **proposed** task + fire an approval push. `inbox_source_id` promotes an inbox item. |
| `approve_task(task_id)` | Promote proposed → approved (official; enters the reminder loop). |
| `reject_task(task_id)` | Dismiss a proposed task. |
| `complete_task(task_id)` | Mark a task done. |
| `reschedule_task(task_id, due_date?, reminder_at?)` | Change due date / reminder time. |
| `dismiss_inbox(inbox_id)` | Clear a non-actionable inbox item. |
| `morning_briefing()` | Daily digest: awaiting-approval + overdue + due-today. |

## Approval model

Claude-created tasks are written `approval_status = 'proposed'` and are **not** official: they're
excluded from due-reminders and shown in a separate "Pending approval" section in the app. Matt
approves (tap the push → app, or "approve" in chat) → `approval_status = 'approved'` → the task
enters the normal reminder loop. Reject → `'rejected'` (kept for audit, hidden from the board).

## Run locally

```bash
cd mcp-server
cp .env.example .env   # fill in SUPABASE_SERVICE_ROLE_KEY, MCP_SHARED_SECRET, VAPID_*
npm install
npm start              # POST http://localhost:8080/mcp (Express; local-only)
```

Smoke test (initialize handshake):

```bash
curl -sS http://localhost:8080/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $MCP_SHARED_SECRET" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

## Deploy (Vercel)

The server runs as **stateless serverless functions** on Vercel — the same platform as the frontend,
so no third vendor and no free-tier cold-sleep. `src/index.js` (the Express `app.listen`) is local-only;
in production `api/mcp.js` and `api/health.js` call the shared handler in `src/handler.js`.

1. **New Project** in Vercel → import `kingrei76/core-quest` → set **Root Directory = `mcp-server`**.
   (Keep it as its own project, separate from the frontend at `core-quest.vercel.app`.)
2. Framework preset: **Other**. No build command needed — `api/*.js` are auto-detected as Node functions.
3. Set env vars (Project → Settings → Environment Variables):
   - `SUPABASE_URL` = `https://yatgxollnwplztbnrfjx.supabase.co`
   - `CORE_QUEST_USER_ID` = Matt's uid
   - `USER_TZ` = `America/New_York`, `APP_URL` = `https://core-quest.vercel.app`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret)
   - `MCP_SHARED_SECRET` (a long random string; reused in the connector URL)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (same triplet as the frontend /
     `dispatch-reminders` — mismatch silently breaks push)
4. Deploy. Verify `https://<project>.vercel.app/health` → `{"ok":true}`.

`vercel.json` rewrites `/mcp/:secret` → `/api/mcp/:secret`, `/mcp` → `/api/mcp`, and `/health` →
`/api/health`.

## Register as a Claude connector

In Claude (Settings → Connectors → Add custom connector) add — note the secret is in the **path**:

```
https://core-quest-at9i.vercel.app/mcp/<MCP_SHARED_SECRET>
```

**Why the path, not `?key=`:** Claude's desktop custom-connector UI strips query strings and can't set
custom headers, so it can only authenticate via what's in the URL path. The `/mcp/<secret>` route
(`api/mcp/[secret].js`) returns **404** (never 401) on a wrong/missing secret — a 401 is what makes the
connector try an OAuth discovery flow this server doesn't implement, which surfaces as "Couldn't
connect." Effectively the full URL *is* the credential (treat it like a private share link).

Header/query auth (`Authorization: Bearer <secret>`, `x-mcp-key`, or `?key=`) still works on the plain
`/mcp` route for curl and local dev — it just can't be used from the Claude connector UI.
