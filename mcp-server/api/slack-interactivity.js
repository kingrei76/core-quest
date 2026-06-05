// Vercel serverless function: POST /slack/interactivity (via vercel.json), the
// Request URL configured in the Slack app's Interactivity settings. Slack POSTs
// here when Matt taps Approve/Reject on a propose_task card. We:
//   1. read the RAW body (signature verification needs the exact bytes), then
//   2. verify the Slack signature, then
//   3. flip quests.approval_status via the same updateTask path the app uses,
//   4. log to claude_actions, and replace the Slack message with the outcome.
//
// bodyParser is disabled so we can hash the unparsed body. Slack sends
// application/x-www-form-urlencoded with a single `payload=<JSON>` field.

import { verifySlackSignature, updateSlackMessage } from '../src/slack.js'
import { updateTask, logAction } from '../src/supabase.js'

export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawBody = await readRawBody(req)

  if (!verifySlackSignature(rawBody, req.headers)) {
    return res.status(401).json({ error: 'Invalid Slack signature' })
  }

  // Parse the urlencoded `payload` field → the interaction JSON.
  let payload
  try {
    const params = new URLSearchParams(rawBody)
    payload = JSON.parse(params.get('payload'))
  } catch {
    return res.status(400).json({ error: 'Bad payload' })
  }

  const action = payload?.actions?.[0]
  const taskId = action?.value
  const actionId = action?.action_id // 'approve_task' | 'reject_task'
  const responseUrl = payload?.response_url

  if (!taskId || !actionId) {
    // Not a button we recognize — ack so Slack doesn't retry.
    return res.status(200).end()
  }

  try {
    if (actionId === 'approve_task') {
      const task = await updateTask(taskId, { approval_status: 'approved' })
      if (!task) {
        await updateSlackMessage(responseUrl, '⚠️ That task no longer exists.')
      } else {
        await logAction('approve', { questId: taskId, summary: task.title, payload: { via: 'slack' } })
        await updateSlackMessage(responseUrl, `✅ *Approved:* ${task.title}`)
      }
    } else if (actionId === 'reject_task') {
      const task = await updateTask(taskId, { approval_status: 'rejected' })
      if (!task) {
        await updateSlackMessage(responseUrl, '⚠️ That task no longer exists.')
      } else {
        await logAction('reject', { questId: taskId, summary: task.title, payload: { via: 'slack' } })
        await updateSlackMessage(responseUrl, `❌ *Rejected:* ${task.title}`)
      }
    }
  } catch (e) {
    console.error('[slack-interactivity] action failed', e?.message)
    await updateSlackMessage(responseUrl, '⚠️ Something went wrong handling that. Try again from the app.')
  }

  // Always ack 200 so Slack marks the interaction handled.
  return res.status(200).end()
}
