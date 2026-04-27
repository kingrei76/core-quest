# CORE Quest

RPG-themed task PWA. React 19 + Vite + Supabase (Postgres + Auth + Realtime + Edge Functions) + vite-plugin-pwa, deployed on Vercel.

## When to update this file

Add an entry whenever you discover a non-obvious convention, gotcha, or invariant that future Claude (or future-you in a new session) would benefit from knowing on session start. Don't pad it with stuff a smart reader can figure out from the code.

## Conventions

- **Branch**: develop on `claude/check-project-status-J4gwt` unless user says otherwise. They sometimes ask for direct pushes to `main`; honor that when stated.
- **Realtime channels**: every list hook (`useQuests`, `useNotes`, etc.) must use `useId()` to namespace its Supabase channel name, otherwise multiple components mounting the same hook collide on `postgres_changes`. See `1f49491` for the original fix.
- **Auth**: email + password is primary; OTP code is fallback. Never re-add `emailRedirectTo` to `signInWithOtp` — that breaks iOS PWA login (link opens in Safari, not the home-screen app).
- **Reminders**: timestamps written by the frontend must use `new Date('YYYY-MM-DDTHH:mm').toISOString()` so they include the user's UTC offset. The Edge Function compares against `now()` in UTC.
- **Categories**: built-in categories live in `src/config/constants.js` `CATEGORIES`; custom user categories live in `user_categories`. Read the merged list via `useCategories().visible`. Don't lookup `CATEGORIES[quest.category]` directly — use `useCategories().lookup[quest.category]` so user-defined keys resolve.
- **Difficulty rank** for sort: `{ trivial: 0, easy: 1, medium: 2, hard: 3, epic: 4, legendary: 5 }`. Defined in `src/utils/challenges.js`; if you need it elsewhere, inline the constant rather than restructuring that file.

## Server-change handoff (IMPORTANT)

This project's backend lives in Supabase (database + Edge Functions). The web Claude Code sandbox **cannot reach the user's Supabase project** — no `supabase` CLI, no project link, no auth. The local Claude Code on the user's Mac *can*, because it shares the user's authenticated `supabase` CLI session.

**Whenever you make a change that requires server-side action** (new SQL block in `supabase-schema.sql`, new or updated function under `supabase/functions/`, secret changes, cron schedule, RLS policy, anything the user can't see by just running `npm run dev`), you MUST end your message with a self-contained handoff block the user can paste verbatim into their local Claude Code session on the Mac.

Format:

```
## Local CLI handoff

Paste this into Claude Code on your Mac (`cd ~/Development/core-quest && claude`):

---
You are Claude Code running locally on the user's Mac. The web Claude session
just pushed changes to `main` that need to be applied to Supabase. Do the
following, in order, and report each step's result:

1. `git pull origin main`
2. <run this SQL>: <paste exact SQL, or reference the new section in supabase-schema.sql by name>
3. <deploy these functions>: `supabase functions deploy <name>` (one per function added/changed)
4. <secrets>: only if changed
5. Verify: <one or two SQL queries or `supabase functions list` to confirm the change took>

If any step errors, stop and paste the error.
---
```

Include the actual SQL inline (not a file reference) when the block is short, so the user doesn't have to hunt for it. For longer migrations, reference the file by path and section heading. Always tell them what success looks like (a count, a row, a function name in `supabase functions list`).

If a change touches secrets (VAPID keys, etc.), do NOT include them in the handoff — instruct the local CLI to ask the user to paste them in directly.

## Why so much SQL on this project?

Because web Claude can't run `supabase db push`. Every schema change shows up as raw SQL in `supabase-schema.sql` for the user to copy into the dashboard, instead of being auto-applied like a normal migration. The fix is to move to `supabase/migrations/<timestamp>_name.sql` files and have local Claude run `supabase db push` from the handoff. Until that migration happens, accept the friction.

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
- iPhone reminder auto-import (most recent)
