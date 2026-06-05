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
| `propose_task(...)` | Create a **proposed** task + fire an approval push (and a Slack Approve/Reject card if Slack is configured). `inbox_source_id` promotes an inbox item. |
| `approve_task(task_id)` | Promote proposed → approved (official; enters the reminder loop). |
| `reject_task(task_id)` | Dismiss a proposed task. |
| `complete_task(task_id)` | Mark a task done. |
| `reschedule_task(task_id, due_date?, reminder_at?)` | Change due date / reminder time. |
| `dismiss_inbox(inbox_id)` | Clear a non-actionable inbox item. |
| `morning_briefing()` | Daily digest: awaiting-approval + overdue + due-today. |

## Approval model

Claude-created tasks are written `approval_status = 'proposed'` and are **not** official: they're
excluded from due-reminders and shown in a separate "Pending approval" section in the app. Matt
approves (tap the push → app, **tap Approve in Slack**, or "approve" in chat) → `approval_status =
'approved'` → the task enters the normal reminder loop. Reject → `'rejected'` (kept for audit, hidden
from the board). All three surfaces flip the same column via `updateTask`.

## Slack interactive approvals (optional)

When `SLACK_BOT_TOKEN` + `SLACK_APPROVAL_CHANNEL` are set, `propose_task` also posts an Approve/Reject
card to Slack. Tapping a button calls **`POST /slack/interactivity`** (`api/slack-interactivity.js`),
which verifies the request with `SLACK_SIGNING_SECRET` (HMAC-SHA256 over `v0:${ts}:${rawBody}`, 5-min
replay window), flips `approval_status`, logs to `claude_actions` (`payload.via = 'slack'`), and
replaces the Slack message with the outcome. If Slack env is absent the whole feature is a no-op.

**One-time Slack app setup:**
1. <https://api.slack.com/apps> → **Create New App** → *From scratch* → pick Matt's workspace.
2. **OAuth & Permissions** → Bot Token Scopes → add **`chat:write`** → *Install to Workspace* → copy
   the **Bot User OAuth Token** (`xoxb-…`) → `SLACK_BOT_TOKEN`.
3. **Basic Information** → copy the **Signing Secret** → `SLACK_SIGNING_SECRET`.
4. **Interactivity & Shortcuts** → toggle **On** → Request URL =
   `https://core-quest-at9i.vercel.app/slack/interactivity` → Save.
5. Invite the bot to the target channel (`/invite @YourApp`) and set `SLACK_APPROVAL_CHANNEL` to that
   channel id (`C0…`), or a user id for a DM.
6. Add the three env vars to the **mcp-server** Vercel project and redeploy.

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
   - *(optional)* `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APPROVAL_CHANNEL` (see Slack section)
4. Deploy. Verify `https://<project>.vercel.app/health` → `{"ok":true}`.

`vercel.json` rewrites `/mcp/:secret` → `/api/mcp?pathsecret=:secret`, `/mcp` → `/api/mcp`,
`/slack/interactivity` → `/api/slack-interactivity`, and `/health` → `/api/health`.

## Register as a Claude connector (OAuth)

In Claude (Settings → Connectors → Add custom connector) add the **plain** URL:

```
https://core-quest-at9i.vercel.app/mcp
```

Claude's connector UI **requires OAuth** — it can't send a custom header or use a path secret, and a
no-auth/path-secret server makes it fail with *"Couldn't register with the sign-in service."* So the
server speaks a minimal, stateless OAuth 2.1 layer (`src/oauth.js` + `api/oauth.js`):

1. `POST /mcp` with no token → **401 + `WWW-Authenticate: Bearer resource_metadata="…"`** (handler.js).
2. `GET /.well-known/oauth-protected-resource` (RFC 9728) → points at this server as the auth server.
3. `GET /.well-known/oauth-authorization-server` (RFC 8414) → authorize/token/register endpoints.
4. `POST /register` (Dynamic Client Registration) → an opaque `client_id`.
5. `GET /authorize` → a **password gate** (the password **is** `MCP_SHARED_SECRET`) → 302 back with `?code=`.
6. `POST /token` → verifies the code + PKCE (S256) → returns a Bearer access token.
7. `POST /mcp` with that Bearer token → connected.

Codes and access tokens are HMAC-signed blobs keyed by `MCP_SHARED_SECRET` (no store needed between
stateless calls). The password gate exists because this server can **write** to Matt's tasks, so we
never auto-approve anonymously — when Claude opens the sign-in page, paste `MCP_SHARED_SECRET` once.

**Other auth paths still work** for curl / local dev / Claude Code CLI: `Authorization: Bearer
<MCP_SHARED_SECRET>`, the `x-mcp-key` header, `?key=`, or the path form `/mcp/<MCP_SHARED_SECRET>`
(which returns 404, not 401, on a bad secret).
