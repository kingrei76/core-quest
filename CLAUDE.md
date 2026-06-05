# CORE Quest

RPG-themed task PWA. React 19 + Vite + Supabase (Postgres + Auth + Realtime + Edge Functions) + vite-plugin-pwa, deployed on Vercel.

## When to update this file

Add an entry whenever you discover a non-obvious convention, gotcha, or invariant that future Claude (or future-you in a new session) would benefit from knowing on session start. Don't pad it with stuff a smart reader can figure out from the code.

## Conventions

- **Branch**: develop on whatever branch the current task description specifies (most recent: `claude/continue-work-ndzl4`).
- **Deploy-as-test workflow**: this is a personal app — the user is the only user. The user does NOT routinely run `npm run dev` locally; instead, the testing surface IS the deployed Vercel app at `core-quest.vercel.app`. When a feature branch is ready to verify, **merge it into `main` and push** — Vercel auto-deploys main and the user reviews on the live URL. Don't insist on local-server testing; don't ask the user to run terminal commands when a merge-to-main accomplishes the same thing. Direct pushes to `main` are explicitly OK for this project, including for prototype / spike work, because there are no external users to break.
- **Realtime channels**: every list hook (`useQuests`, `useNotes`, etc.) must use `useId()` to namespace its Supabase channel name, otherwise multiple components mounting the same hook collide on `postgres_changes`. See `1f49491` for the original fix.
- **Auth**: email + password is primary; OTP code is fallback. Never re-add `emailRedirectTo` to `signInWithOtp` — that breaks iOS PWA login (link opens in Safari, not the home-screen app).
- **Reminders**: timestamps written by the frontend must use `new Date('YYYY-MM-DDTHH:mm').toISOString()` so they include the user's UTC offset. The Edge Function compares against `now()` in UTC.
- **Categories**: built-in categories live in `src/config/constants.js` `CATEGORIES`; custom user categories live in `user_categories`. Read the merged list via `useCategories().visible`. Don't lookup `CATEGORIES[quest.category]` directly — use `useCategories().lookup[quest.category]` so user-defined keys resolve.
- **Difficulty rank** for sort: `{ trivial: 0, easy: 1, medium: 2, hard: 3, epic: 4, legendary: 5 }`. Defined in `src/utils/challenges.js`; if you need it elsewhere, inline the constant rather than restructuring that file.

## Server-change handoff (LOCAL CLAUDE)

This project's backend lives in Supabase (database + Edge Functions). The **local** Claude Code on the user's Mac has a fully linked Supabase CLI (`supabase projects list` shows Core Quest linked). Schema migrations now live in `supabase/migrations/<timestamp>_<name>.sql` and apply via `supabase db push --linked` — no more dashboard copy-paste.

**When you make a schema change locally, do this end-to-end yourself:**

1. Create a migration: `supabase/migrations/$(date +%Y%m%d%H%M%S)_<short_name>.sql` with the SQL (use `IF NOT EXISTS` / `DROP POLICY IF EXISTS` for idempotency where possible).
2. Apply: `supabase db push --linked`. If it complains about phantom remote entries, run `supabase migration repair --linked --status reverted <ids>` first.
3. Verify: `supabase db dump --linked --schema public --data-only=false | grep <new_column_or_table>`.
4. Commit the migration file along with the code changes that depend on it.

For **Edge Function** changes: `supabase functions deploy <name> --linked`.
For **secrets** changes: never paste secret values into chat or commits; instruct the user to set them via `supabase secrets set <NAME>=<value>` themselves.

**Web Claude (chat.anthropic.com, claude.ai/code) is the exception** — that environment can't reach Supabase. If a web session needs to deliver a schema change, it should write the migration file, commit + push, then end its message with a "Local CLI handoff" block telling the user to pull and run `supabase db push --linked` from their Mac.

## Schema history note

Pre-2026-05-10 schema lives in `supabase-schema.sql` — an append-only reference file that the user used to copy into the Supabase dashboard manually. As of `20260510175653_phase_6_4_combat_mvp.sql`, all new schema changes go in `supabase/migrations/`. `supabase-schema.sql` is preserved as a historical record of state-before-migrations; new sections should not be appended unless you specifically want a human-readable snapshot of recent changes alongside the proper migration.

## Critical files

- `src/config/constants.js` — `DIFFICULTIES`, `CATEGORIES`, `RECURRENCES`, `STREAK_BONUSES`, `TITLES`, `STATS`
- `src/utils/rpg.js` — `xpForLevel`, `calculateLevel`, `levelProgress`, `getQuestXP`, `maxHP`/`maxMP`, `getStreakBonus`, `getCategoryStat`
- `src/utils/recurrence.js` — `isRecurring`, `nextDueDate`, `nextReminderAt`, `recurrenceOptions`
- `src/utils/challenges.js` — `DIFFICULTY_RANK`, period helpers, `questMatchesChallenge`
- `src/utils/streak.js` — `calculateStreak`
- `src/utils/push.js` — Web Push subscribe/unsubscribe helpers
- `src/contexts/CharacterContext.jsx` — `useCharacter` exposes profile, stats, level, currentHp/Mp + hpMax/mpMax
- `src/hooks/*` — one hook per concept; all use `useId()` for realtime channels
- `src/sw.js` — custom service worker (push handler + workbox precache); registered via `injectManifest` in `vite.config.js`
- `supabase-schema.sql` — append-only schema reference, sectioned by phase
- `supabase/functions/dispatch-reminders/` — cron-triggered Web Push dispatcher
- `supabase/functions/import-from-device/` — token-auth endpoint for iPhone Shortcut imports

## Known gotchas

- **iOS Web Push only works for installed PWAs** in standalone mode (iOS 16.4+). If a user's notifications aren't arriving, first check that they re-installed via Safari → Add to Home Screen *after* the most recent service-worker change.
- **VAPID public key lives in three places** and must match in all of them: `.env` (local), Vercel env vars (deployed frontend), Supabase secrets (Edge Function). Mismatch is silent — pushes succeed but never deliver.
- **`emailRedirectTo` on Supabase OTP signin breaks iOS PWA auth.** Do not re-add.
- **`vite-plugin-pwa` strategy is `injectManifest`** (not `generateSW`). The custom service worker at `src/sw.js` must reference the manifest as `self.__WB_MANIFEST` exactly — it's a literal string replacement.
- **Quest category CHECK constraint was dropped in Phase 5.3** so user-defined categories work. Do not re-add it.
- **Stats charts** use `recharts`, which depends on `react-is`. Both are pinned. Don't accidentally remove either.

## Phases shipped

- 2.1 Recurring quests · 2.2 Quest edit/delete · 2.3 Failed/abandoned + swipe · 2.4 History timeline
- 3.1 Push subscription infra · 3.2 Reminder dispatcher Edge Function · 3.3 Notifications toggle UI
- 4.1 HP/MP combat loop · 4.2 Boss + sub-quests · 4.3 Daily/weekly challenges · 4.4 Achievements
- 5.1 Onboarding · 5.2 Note tags + quest links · 5.3 Custom categories · 5.4 Stats charts
- iPhone reminder auto-import
- **Task-management hub (most recent)** — Claude gathers/proposes/approves/reminds on tasks via an MCP server (`mcp-server/`). See `docs/design/claude-task-management.md`.

## Task-management track (game-parked)

A standalone task-manager built on the existing quest infra, kept separate from the game layer:

- **`quests.approval_status`** (`proposed`|`approved`|`rejected`, default `approved`): Claude-created tasks start `proposed` and are hidden from the board (shown in a "Pending approval" section) until Matt approves; **only `approved` tasks fire reminders**. Don't surface `proposed`/`rejected` in normal quest views.
- **`mcp-server/`** is a single-tenant MCP server (Node, stateless Streamable-HTTP) deployed on **Vercel** as serverless functions (`mcp-server/api/`), pinned to Matt's uid. Hosted on Vercel — **not Render** — to stay on the two platforms this project already uses (Vercel + Supabase); the endpoint is stateless (fresh server+transport per request) so it needs no persistent process. `src/index.js` (Express `app.listen`) is local-dev only; prod requests go `api/mcp.js` → `src/handler.js`. It has **no game logic** — completing a task there awards no XP. The game (XP/AP/combat) is **parked** until task management is proven; don't wire game side-effects into this track.
- **`dispatch-reminders` previously errored** — it referenced `quests.last_reminded_at`, which didn't exist until the `20260601000000` migration added it. The dispatcher now also filters `approval_status='approved'`.
- Provenance: Claude-written tasks stamp `external_source` + `metadata.created_by='claude'`; actions are logged to `public.claude_actions`.
- **Slack interactive approvals**: when `SLACK_BOT_TOKEN` + `SLACK_APPROVAL_CHANNEL` are set on the mcp-server, `propose_task` also posts an Approve/Reject Block Kit card; tapping a button hits `POST /slack/interactivity` (`mcp-server/api/slack-interactivity.js`), verified via `SLACK_SIGNING_SECRET`, which flips `approval_status` through the same `updateTask` path the app uses (`payload.via='slack'` in `claude_actions`). The webhook **must** read the raw body (`bodyParser:false` + manual stream buffer) — Slack signature verification needs exact bytes, so don't let Vercel pre-parse it. All three Slack env vars absent ⇒ feature is a no-op and `propose_task` still works. Setup steps in `mcp-server/README.md`.

## Game design direction

CORE Quest is becoming a **modern-day portal RPG** where a team of specialists tackles real-life goals as monster-world dungeons. The full brief lives in `vision.md`. Key invariants for any session that touches gameplay-adjacent code:

- **Art direction:** modern HD-2D pixel art (Octopath Traveler / Sea of Stars references). Decided May 4, 2026.
- **Setting:** modern-day team at a home base; portals open into themed monster worlds.
- **Team model:** fixed small roster of 5 archetypes (Warrior / Mage / Rogue / Diplomat / Scholar). Each archetype maps to a quest category cluster.
- **Combat model:** action-point economy. Quests award AP to the matching archetype; user spends AP in on-demand combat from a portal screen. Combat is *manual*, not auto-resolve.
- **Orientation:** TBD (leaning portrait + letterboxed combat). Decided in the encounter spike — see `docs/encounter-spike.md`.
- **Roadmap:** `vision.md` § "Phase 6 — Visual + narrative overhaul" for the gated sequence (6.1 art lock-in → 6.2 spike → 6.3 schema migration → 6.4 combat MVP → ...).
- **Style bible:** `docs/design/style-bible.md` is the durable home for locked reference images, palette, sprite specs, prompt recipes. Populated during Phase 6.1 design sessions.
- **Design factory:** `design-factory/` is the AI-driven asset pipeline (PixelLab + Replicate + Aseprite via `pixel-mcp`). Spec YAMLs in `design-factory/archetypes/` and `design-factory/worlds/`. Pipeline scripts in `design-factory/pipelines/`. Read `design-factory/README.md` before generating new sprites — there's a one-time API-key setup. Plan-of-record: `~/.claude/plans/core-quest-what-we-ve-lexical-ember.md`.
- **Magic system:** `docs/design/magic-system.md` — 3-tier Jungian power set (Persona / Shadow / Integration). Only **Power 1 (Persona) ships in Phase 6.4**. Powers 2 and 3 are designed-on-paper but **deferred to Phase 7+**. Don't implement Shadow or Integration before then. Power 1 mechanics must stay **skin-agnostic** (modern-weapon variants are cosmetic, not code-forks).
- **Higher Being layer:** powers are granted by a bonded entity, not innate. Bond level scales with real-life quest engagement and gates Powers 2/3. Affects home-base art (the Higher Being's "presence" grows with bond). See magic-system doc.
- **Weekly check-in:** `docs/design/weekly-checkin.md` — post-sub-boss frank conversation via Claude API (Edge Function). Tone *ramps with Bond level*. Implementation deferred to Phase 6.7. When implementing, use prompt caching on the system prompt + character context block.

Don't re-litigate these in passing. If something needs to change, update `vision.md` first.
