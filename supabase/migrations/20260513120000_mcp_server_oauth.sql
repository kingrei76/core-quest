-- Core Quest MCP server: OAuth 2.1 tables + daily_briefings.
-- Backs the supabase/functions/core-quest-mcp Edge Function, which exposes
-- Core Quest data to Claude Cowork (and Claude Code) as a Streamable HTTP
-- MCP server. OAuth flow follows the MCP 2025-06-18 authorization spec:
-- discovery via /.well-known/oauth-{protected-resource,authorization-server},
-- PKCE-required authorization code grant, dynamic client registration.
--
-- Tier 1 of the plan in ~/.claude/plans/i-don-t-mean-temporarily-drifting-cake.md
--
-- The OAuth tables are accessed only by the Edge Function (service role),
-- so RLS is left off for them. daily_briefings has RLS for client reads.

-- ---------------------------------------------------------------------------
-- mcp_oauth_clients: dynamically registered OAuth clients (RFC 7591).
-- A Cowork connector registers once; the row persists for its lifetime.
-- ---------------------------------------------------------------------------
create table if not exists mcp_oauth_clients (
  client_id text primary key,
  client_name text,
  redirect_uris text[] not null,
  token_endpoint_auth_method text not null default 'none',  -- public clients
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- mcp_oauth_authcodes: short-lived (~10 min) authorization codes.
-- Holds the PKCE challenge until the /token call verifies the verifier.
-- ---------------------------------------------------------------------------
create table if not exists mcp_oauth_authcodes (
  code_hash text primary key,
  client_id text not null references mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  redirect_uri text not null,
  resource text,
  scope text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mcp_oauth_authcodes_expires_idx
  on mcp_oauth_authcodes(expires_at);

-- ---------------------------------------------------------------------------
-- mcp_oauth_refresh_tokens: long-lived refresh tokens.
-- Access tokens themselves are stateless JWTs signed with MCP_JWT_SECRET
-- and validated in the Edge Function — no row per access token.
-- ---------------------------------------------------------------------------
create table if not exists mcp_oauth_refresh_tokens (
  token_hash text primary key,
  client_id text not null references mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists mcp_oauth_refresh_tokens_user_idx
  on mcp_oauth_refresh_tokens(user_id);

-- ---------------------------------------------------------------------------
-- daily_briefings: one row per user per day; cloud routines write it,
-- Cowork / Claude Code read it via get_todays_briefing() on session open.
-- content shape is intentionally loose (jsonb) so the routine prompt can
-- evolve without further migrations.
-- ---------------------------------------------------------------------------
create table if not exists daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  content jsonb not null,
  generated_by text,
  generated_at timestamptz not null default now()
);
create unique index if not exists daily_briefings_user_date_idx
  on daily_briefings(user_id, briefing_date);

alter table daily_briefings enable row level security;

drop policy if exists "Users see own briefings" on daily_briefings;
create policy "Users see own briefings" on daily_briefings
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own briefings" on daily_briefings;
create policy "Users insert own briefings" on daily_briefings
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own briefings" on daily_briefings;
create policy "Users update own briefings" on daily_briefings
  for update using (auth.uid() = user_id);
