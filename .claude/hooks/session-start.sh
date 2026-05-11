#!/bin/bash
# SessionStart hook for CORE Quest.
#
# Goal: make `supabase db push --linked` and `supabase functions deploy --linked`
# work from remote Claude Code sessions. Web sandboxes start blank, so we
# install the CLI binary and re-link the project on every session.
#
# Required env vars (set in Claude Code web settings, not committed):
#   SUPABASE_ACCESS_TOKEN  — personal access token from supabase.com/dashboard/account/tokens
#   SUPABASE_DB_PASSWORD   — database password (for `db push`)
#
# Optional:
#   SUPABASE_PROJECT_REF   — override the default (Core Quest = yatgxollnwplztbnrfjx)
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  # Local Mac sessions already have a fully linked CLI via Homebrew.
  exit 0
fi

SUPABASE_VERSION="2.98.2"
PROJECT_REF="${SUPABASE_PROJECT_REF:-yatgxollnwplztbnrfjx}"
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

# Install Supabase CLI if missing or wrong version.
need_install=1
if [ -x "$INSTALL_DIR/supabase" ]; then
  installed=$("$INSTALL_DIR/supabase" --version 2>/dev/null || echo "")
  if [ "$installed" = "$SUPABASE_VERSION" ]; then
    need_install=0
  fi
fi

if [ "$need_install" = "1" ]; then
  echo "Installing Supabase CLI v${SUPABASE_VERSION}..."
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_linux_amd64.tar.gz" \
    -o "$tmp/supabase.tar.gz"
  tar -xzf "$tmp/supabase.tar.gz" -C "$INSTALL_DIR" supabase
  chmod +x "$INSTALL_DIR/supabase"
fi

# Persist PATH for the session.
echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$CLAUDE_ENV_FILE"
export PATH="$INSTALL_DIR:$PATH"

# Install npm deps so lint/build/test work.
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  npm install --no-audit --no-fund --silent
fi

# Link the project if an access token is available.
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  # `link` writes supabase/.temp/project-ref. Idempotent on re-run.
  supabase link --project-ref "$PROJECT_REF" >/dev/null 2>&1 || \
    echo "warning: supabase link failed (token expired or wrong project ref?)"
else
  echo "warning: SUPABASE_ACCESS_TOKEN not set — supabase commands will fail until it's added in Claude settings"
fi
