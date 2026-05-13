# core-quest-mcp

Streamable HTTP MCP server that exposes Core Quest data to Claude Cowork
(and Claude Code) over OAuth 2.1. Tier 1 of the plan at
`~/.claude/plans/i-don-t-mean-temporarily-drifting-cake.md`.

## What's exposed (Wave 1, read-only)

| Tool | Returns |
|---|---|
| `list_quests(status?, limit?)` | Quests filtered by status (default `available`). |
| `list_inbox(processed?, limit?)` | Inbox items (default unprocessed — the triage queue). |
| `get_character_summary()` | Profile + stats + computed level/HP/MP/AP. |
| `list_categories()` | Built-in `CATEGORIES` + any `user_categories` rows. |
| `get_todays_briefing(date?)` | Today's `daily_briefings` row, or `null`. |

Wave 2 (mutators: `add_inbox_item`, `create_quest`, `update_quest_status`,
`complete_quest`, `write_daily_briefing`) is a separate follow-up.

## One-time deploy (run on the Mac)

```bash
# 1. Apply the migration that adds the OAuth + briefings tables.
supabase db push --linked

# 2. Set the JWT signing secret used to sign access tokens.
#    Pick anything random and long; this never leaves your machines.
openssl rand -hex 32 | xargs -I{} supabase secrets set MCP_JWT_SECRET={}

# 3. Deploy the function.
supabase functions deploy core-quest-mcp --linked
```

Function URL after deploy:
```
https://yatgxollnwplztbnrfjx.supabase.co/functions/v1/core-quest-mcp
```

## Connect from Claude Cowork

1. In Cowork: **+** → **Connectors** → **Add custom connector**.
2. Paste the function URL above.
3. Cowork hits the metadata endpoint, registers itself dynamically via
   `/register`, then redirects you to the function's `/authorize` page.
4. Sign in with your Core Quest (Supabase) email + password. This is the
   same login you use for the PWA — the function uses Supabase Auth's
   password grant under the hood and discards the resulting Supabase
   session; the MCP server issues its own short-lived JWT access token
   plus a refresh token.
5. Back in Cowork the connector goes green. Try: *"list my active quests"*.

## Connect from Claude Code

Add to your project's `.mcp.json` (or `~/.claude/mcp.json` for global):

```json
{
  "mcpServers": {
    "core-quest": {
      "type": "http",
      "url": "https://yatgxollnwplztbnrfjx.supabase.co/functions/v1/core-quest-mcp"
    }
  }
}
```

Claude Code's MCP client will run the same OAuth dance via your browser
on first use.

## Architecture notes

- **OAuth metadata** is hosted under the function path
  (`/.well-known/oauth-protected-resource` etc.) rather than the host root,
  because Supabase doesn't expose the host root. Discovery still works:
  unauthenticated MCP requests get a 401 with
  `WWW-Authenticate: Bearer realm="...", resource_metadata="<full url>"`,
  which the spec explicitly allows.
- **Access tokens** are HS256 JWTs signed with `MCP_JWT_SECRET`, 1-hour
  TTL, with `sub` = the user's auth.users id. Verified inline in
  `mcp.ts:verifyAccessToken`.
- **Refresh tokens** are random 48-byte strings, stored hashed in
  `mcp_oauth_refresh_tokens`, 90-day TTL.
- **Authorization codes** are random 32-byte strings, hashed in
  `mcp_oauth_authcodes`, 10-minute TTL, PKCE-S256 enforced.
- **All DB access** runs through the service-role client and is filtered
  by `user_id` extracted from the JWT. RLS is on the data tables but
  bypassed here intentionally — the service role is the trust boundary.

## Smoke tests

After deploy, verify discovery from the Mac:

```bash
# Should return JSON with authorization_servers array.
curl -s https://yatgxollnwplztbnrfjx.supabase.co/functions/v1/core-quest-mcp/.well-known/oauth-protected-resource | jq

# Should return JSON with authorization_endpoint, token_endpoint, etc.
curl -s https://yatgxollnwplztbnrfjx.supabase.co/functions/v1/core-quest-mcp/.well-known/oauth-authorization-server | jq

# Hitting the MCP endpoint without a token should return 401 with WWW-Authenticate.
curl -i -X POST https://yatgxollnwplztbnrfjx.supabase.co/functions/v1/core-quest-mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```
