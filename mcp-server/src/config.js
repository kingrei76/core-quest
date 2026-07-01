// Central env/config for the Core Quest MCP server.
// Single-tenant: every query is pinned to CORE_QUEST_USER_ID (Matt's uid).

function required(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`[config] FATAL: missing required env var ${name}`)
    process.exit(1)
  }
  return v
}

export const config = {
  port: Number(process.env.PORT || 8080),

  supabaseUrl: required('SUPABASE_URL'),
  serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),

  // The one user this server serves. Locks every read/write to Matt's rows.
  userId: required('CORE_QUEST_USER_ID'),

  // Shared secret gating the /mcp endpoint. If unset, the endpoint is OPEN —
  // only acceptable for short-lived local testing. Always set in production.
  sharedSecret: process.env.MCP_SHARED_SECRET || null,

  // Web Push (VAPID) — same key triplet used by the frontend + dispatch-reminders.
  // If absent, propose_task still works but the approval push is skipped.
  vapidPublic: process.env.VAPID_PUBLIC_KEY || null,
  vapidPrivate: process.env.VAPID_PRIVATE_KEY || null,
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:hello@corequest.app',

  // Slack interactive approvals. When SLACK_BOT_TOKEN + SLACK_APPROVAL_CHANNEL
  // are set, propose_task also posts an Approve/Reject card to Slack; tapping a
  // button hits /slack/interactivity, which is verified with SLACK_SIGNING_SECRET.
  // All three absent → Slack is simply skipped (propose_task still works).
  slackBotToken: process.env.SLACK_BOT_TOKEN || null,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET || null,
  slackApprovalChannel: process.env.SLACK_APPROVAL_CHANNEL || null,

  // Timezone used to resolve "today" / "overdue" against date-only due_dates.
  // Matt is in Mountain time; the USER_TZ env var can still override.
  userTz: process.env.USER_TZ || 'America/Denver',

  // Deep-link base path the app opens when a push is tapped.
  appUrl: process.env.APP_URL || 'https://core-quest.vercel.app',
}

// Difficulty → XP, mirrored from src/config/constants.js. quests.xp_value is
// NOT NULL, so propose_task must always supply a value.
export const DIFFICULTY_XP = {
  trivial: 5,
  easy: 10,
  medium: 25,
  hard: 50,
  epic: 100,
  legendary: 200,
}

export const VALID_CATEGORIES = ['health', 'intelligence', 'money', 'relationships', 'household']
