// Slack interactive approvals. propose_task posts an Approve/Reject card to a
// Slack channel/DM; tapping a button calls /slack/interactivity. This mirrors
// the in-app "Pending approval" flow — both ultimately flip quests.approval_status
// via the same updateTask path. If Slack isn't configured (no bot token), every
// function here is a safe no-op so propose_task still succeeds.

import crypto from 'crypto'
import { config } from './config.js'

const SLACK_API = 'https://slack.com/api'

export function slackConfigured() {
  return Boolean(config.slackBotToken && config.slackApprovalChannel)
}

// Build the Block Kit message for a proposed task. block_id carries the task id
// as a fallback; each button's `value` is the canonical task id we act on.
function approvalBlocks(task) {
  const bits = []
  if (task.due_date) bits.push(`*Due:* ${task.due_date}`)
  if (task.category) bits.push(`*Category:* ${task.category}`)
  if (task.difficulty) bits.push(`*Difficulty:* ${task.difficulty}`)
  const reasoning = task.metadata?.reasoning ? `\n_${task.metadata.reasoning}_` : ''
  const detail = bits.length ? `\n${bits.join('  ·  ')}` : ''

  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*✨ Claude proposed a task:*\n*${task.title}*${detail}${reasoning}` },
    },
    {
      type: 'actions',
      block_id: `task_${task.id}`,
      elements: [
        {
          type: 'button',
          action_id: 'approve_task',
          text: { type: 'plain_text', text: '✅ Approve', emoji: true },
          style: 'primary',
          value: task.id,
        },
        {
          type: 'button',
          action_id: 'reject_task',
          text: { type: 'plain_text', text: '❌ Reject', emoji: true },
          style: 'danger',
          value: task.id,
        },
      ],
    },
  ]
}

// Post the approval card. Returns a small status object (mirrors push.js shape)
// and never throws — Slack failures must not break propose_task.
export async function postApprovalCard(task) {
  if (!slackConfigured()) return { posted: false, skipped: true }
  try {
    const res = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${config.slackBotToken}`,
      },
      body: JSON.stringify({
        channel: config.slackApprovalChannel,
        text: `Approve task? ${task.title}`, // notification/fallback text
        blocks: approvalBlocks(task),
      }),
    })
    const json = await res.json()
    if (!json.ok) {
      console.error('[slack] chat.postMessage failed:', json.error)
      return { posted: false, error: json.error }
    }
    return { posted: true, ts: json.ts, channel: json.channel }
  } catch (e) {
    console.error('[slack] postApprovalCard error:', e?.message)
    return { posted: false, error: e?.message }
  }
}

// Verify a Slack request signature (https://api.slack.com/authentication/verifying-requests-from-slack).
// basestring = `v0:${timestamp}:${rawBody}`; signature = `v0=` + HMAC-SHA256(signingSecret, basestring).
// Rejects requests older than 5 minutes (replay protection) and uses a
// constant-time comparison.
export function verifySlackSignature(rawBody, headers) {
  if (!config.slackSigningSecret) {
    console.error('[slack] SLACK_SIGNING_SECRET not set — refusing to verify')
    return false
  }
  const timestamp = headers['x-slack-request-timestamp']
  const signature = headers['x-slack-signature']
  if (!timestamp || !signature) return false

  // Replay guard: reject stale timestamps.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 60 * 5) return false

  const base = `v0:${timestamp}:${rawBody}`
  const expected =
    'v0=' + crypto.createHmac('sha256', config.slackSigningSecret).update(base).digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Replace the original message after a button press, via the payload's
// response_url. Best-effort.
export async function updateSlackMessage(responseUrl, text) {
  if (!responseUrl) return
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replace_original: true,
        text,
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
      }),
    })
  } catch (e) {
    console.error('[slack] updateSlackMessage error:', e?.message)
  }
}
