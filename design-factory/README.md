# Design Factory

Asset pipeline for Core Quest. Turns a YAML spec into committed sprite sheets.

> Origin: `~/.claude/plans/core-quest-what-we-ve-lexical-ember.md` — read that for the full reasoning. This file is the operator's reference.

## What this is

Three layers:

1. **Spec layer** — declarative YAML files in `archetypes/` and `worlds/` describe what to produce.
2. **Pipeline layer** — Bash scripts in `pipelines/` orchestrate cloud APIs (Replicate for cleanup, PixelLab for rotation + animation) and Aseprite (locally, via `pixel-mcp` MCP server) for sprite-sheet output.
3. **Output layer** — sprite sheets + JSON atlases under `public/sprites/{world}/{archetype}/` with a `manifest.json` per asset capturing the prompt, params, and version that produced it.

## One-time setup

### 1. Subscribe to PixelLab and Replicate

You (Matt) need to do this; it's behind paywalls and I can't sign you up.

- **PixelLab** — https://www.pixellab.ai/pixellab-api → subscribe ($10/mo) → grab API key.
- **Replicate** — https://replicate.com → sign up → billing card → API tokens page → create token (pay-as-you-go, ~$0.01–0.05 per run, will stay well under $5/mo at our volume).

### 2. Store keys in 1Password

You already have `op` (1Password CLI) installed. Recommended:

```
op item create --category=API\ Credential --title='PixelLab API' \
  --vault='Personal' credential='paste-key-here'
op item create --category=API\ Credential --title='Replicate API' \
  --vault='Personal' credential='paste-token-here'
```

### 3. Inject keys at runtime

The pipeline scripts read these env vars:

```
PIXELLAB_API_KEY      # from 1Password "PixelLab API"
REPLICATE_API_TOKEN   # from 1Password "Replicate API"
```

For an interactive session, the easiest way is:

```bash
export PIXELLAB_API_KEY="$(op read 'op://Personal/PixelLab API/credential')"
export REPLICATE_API_TOKEN="$(op read 'op://Personal/Replicate API/credential')"
```

(Or add to your shell rc to load on every terminal.)

**Do not** paste keys into `.env` and commit them. `.env` is gitignored, but `op` is the durable answer.

## Running the pipeline

### Clean up a Leonardo-generated PNG

```bash
./design-factory/pipelines/cleanup.sh \
  docs/design/style-bible/vanguard-v1.png \
  public/sprites/vanguard/source-clean.png
```

Output: transparent-background PNG + `public/sprites/vanguard/source-clean.manifest.json`.

### (Stage 2 — coming next) Animate from a clean PNG

```bash
./design-factory/pipelines/animate.sh design-factory/archetypes/vanguard.yaml
```

Output: `public/sprites/vanguard/{idle,walk,attack,hurt}.{png,json}` + a unified manifest.

### (Stage 4 — coming) Forge a whole world

```
/forge-world swamp-of-procrastination
```

A Claude Code slash command that loops over a world spec and runs the full pipeline for each asset.

## Spec schemas

- **`archetypes/{name}.yaml`** — character class spec (the 5 archetypes). Stable across worlds.
- **`worlds/{name}.yaml`** — world spec. Lists per-world enemies/bosses/environments. Generated on demand.
- **`manifest-schema.json`** — JSON Schema for the per-asset manifest committed alongside each sprite sheet.

See `archetypes/vanguard.yaml` and `worlds/_example.yaml` for working examples.

## Conventions

- **Style fragment lock:** every spec includes (or inherits) the canonical style fragment from `docs/design/style-bible.md` § Prompt recipes. This is what keeps every world visually coherent.
- **Idempotency:** every pipeline step writes a `manifest.json` recording input hash + params. Re-runs skip work that hasn't changed (so re-running `/forge-world` after a tiny tweak doesn't burn the whole Replicate budget).
- **Output paths:** archetype assets → `public/sprites/{archetype}/`. World-specific assets → `public/sprites/worlds/{world}/`.
- **Aseprite source files:** keep canonical `.aseprite` editing files under `docs/design/style-bible/{archetype}/` (mirrors current Vanguard structure). The factory writes _output_ PNGs to `public/sprites/`; humans edit `.aseprite` in `docs/design/`.

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `cleanup.sh` errors with 401 | `REPLICATE_API_TOKEN` not exported in the current shell | re-run the `export` line above |
| PixelLab output drifts from locked Leonardo style | Reference strength too low, or prompt fragment missing | bump `pixellab.reference_strength` in archetype YAML; verify base style fragment is included |
| Replicate spend creeping up | Re-running unchanged inputs | confirm `manifest.json` hash check is firing — should print `"skip: unchanged"` for cached runs |

## Why this lives in the repo (not a separate tool)

The factory is purpose-built for Core Quest's sprite sheets, encounter spike, and world model. Living in-repo means:
- specs are versioned with the game state they describe
- the same git history captures "what world existed when"
- onboarding a future AI session is just reading this README
