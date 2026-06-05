-- Per-device import tokens for the iPhone Shortcut -> import-from-device flow.
-- Defined in supabase-schema.sql but never applied to the live DB, which is why
-- the "Import from iPhone" UI 404'd. The import-from-device Edge Function looks
-- up tokens with the service-role client (bypasses RLS); the frontend manages
-- its own rows under the user's JWT, so RLS scopes CRUD to the owner.
--
-- NOTE: already applied to the live project on 2026-06-05 via the Supabase MCP
-- (apply_migration). Committed here so migration history matches the database.
create table if not exists public.device_import_tokens (
  token text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

create index if not exists device_import_tokens_user_idx
  on public.device_import_tokens (user_id);

alter table public.device_import_tokens enable row level security;

drop policy if exists "own device_import_tokens select" on public.device_import_tokens;
create policy "own device_import_tokens select" on public.device_import_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "own device_import_tokens insert" on public.device_import_tokens;
create policy "own device_import_tokens insert" on public.device_import_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "own device_import_tokens delete" on public.device_import_tokens;
create policy "own device_import_tokens delete" on public.device_import_tokens
  for delete using (auth.uid() = user_id);
