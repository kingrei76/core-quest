#!/usr/bin/env bash
#
# cleanup.sh — Remove the background (and watermarks/text artifacts that read
# as background) from a Leonardo-generated PNG using a cloud rembg model on
# Replicate. Writes a transparent PNG + a manifest.json sidecar so subsequent
# runs with unchanged inputs short-circuit.
#
# Usage:
#   cleanup.sh <input.png> <output.png>
#
# Required env:
#   REPLICATE_API_TOKEN
#
# Optional env:
#   REPLICATE_MODEL   default: 851-labs/background-remover
#                     alternatives worth trying: cjwbw/rembg, lucataco/remove-bg
#   POLL_INTERVAL     default: 2 (seconds)
#   POLL_TIMEOUT      default: 180 (seconds)

set -euo pipefail

# ---- args + env validation -------------------------------------------------

INPUT="${1:-}"
OUTPUT="${2:-}"

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
  echo "Usage: $0 <input.png> <output.png>" >&2
  exit 64  # EX_USAGE
fi
if [[ -z "${REPLICATE_API_TOKEN:-}" ]]; then
  echo "Error: REPLICATE_API_TOKEN not set." >&2
  echo "Try:" >&2
  echo "  export REPLICATE_API_TOKEN=\"\$(op read 'op://Personal/Replicate API/credential')\"" >&2
  exit 78  # EX_CONFIG
fi
if [[ ! -f "$INPUT" ]]; then
  echo "Error: input file not found: $INPUT" >&2
  exit 66  # EX_NOINPUT
fi

MODEL="${REPLICATE_MODEL:-851-labs/background-remover}"
POLL_INTERVAL="${POLL_INTERVAL:-2}"
POLL_TIMEOUT="${POLL_TIMEOUT:-180}"

# ---- idempotency: hash input + model, skip if manifest still matches -------

INPUT_HASH=$(shasum -a 256 "$INPUT" | awk '{print $1}')
COMBINED_HASH=$(printf '%s:%s' "$INPUT_HASH" "$MODEL" | shasum -a 256 | awk '{print $1}')

MANIFEST="${OUTPUT%.*}.manifest.json"

if [[ -f "$MANIFEST" && -f "$OUTPUT" ]]; then
  EXISTING_HASH=$(jq -r '.input_hash // ""' "$MANIFEST" 2>/dev/null || echo "")
  if [[ "$EXISTING_HASH" == "$COMBINED_HASH" ]]; then
    echo "skip: unchanged ($OUTPUT already up to date)"
    exit 0
  fi
fi

mkdir -p "$(dirname "$OUTPUT")"

# ---- prepare request -------------------------------------------------------

# Encode input as base64 data URI. macOS `base64` and Linux `base64 -w 0`
# differ; piping through `tr` strips newlines portably.
echo "→ encoding $INPUT (size: $(wc -c < "$INPUT") bytes)..."
DATA_URI="data:image/png;base64,$(base64 < "$INPUT" | tr -d '\n')"

# Build the JSON body. jq handles escaping properly.
REQ_BODY=$(jq -n --arg image "$DATA_URI" '{ input: { image: $image } }')

# ---- POST prediction -------------------------------------------------------

echo "→ calling Replicate model: $MODEL"

CREATE_RESPONSE=$(curl -sS \
  -X POST \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: wait=5" \
  -d "$REQ_BODY" \
  "https://api.replicate.com/v1/models/${MODEL}/predictions")

# Surface API errors clearly.
if echo "$CREATE_RESPONSE" | jq -e '.detail // .title // empty' >/dev/null 2>&1; then
  echo "Error from Replicate:" >&2
  echo "$CREATE_RESPONSE" | jq '.' >&2
  exit 1
fi

PREDICTION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')
PREDICTION_URL=$(echo "$CREATE_RESPONSE" | jq -r '.urls.get // empty')

if [[ -z "$PREDICTION_ID" || -z "$PREDICTION_URL" ]]; then
  echo "Error: malformed Replicate response (no id / urls.get):" >&2
  echo "$CREATE_RESPONSE" | jq '.' >&2
  exit 1
fi

echo "→ prediction id: $PREDICTION_ID"

# ---- poll until done -------------------------------------------------------

STATUS=$(echo "$CREATE_RESPONSE" | jq -r '.status // "starting"')
ELAPSED=0
RESPONSE="$CREATE_RESPONSE"

while [[ "$STATUS" == "starting" || "$STATUS" == "processing" ]]; do
  if (( ELAPSED >= POLL_TIMEOUT )); then
    echo "Error: prediction timed out after ${POLL_TIMEOUT}s (id=$PREDICTION_ID)" >&2
    exit 1
  fi
  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))

  RESPONSE=$(curl -sS \
    -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
    "$PREDICTION_URL")
  STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"')
  echo "  status: $STATUS (${ELAPSED}s)"
done

if [[ "$STATUS" != "succeeded" ]]; then
  echo "Error: prediction did not succeed (status=$STATUS)" >&2
  echo "$RESPONSE" | jq '.' >&2
  exit 1
fi

# ---- download output -------------------------------------------------------

# Replicate `output` for a single-image model is either a string URL or a
# 1-element array; handle both.
OUTPUT_URL=$(echo "$RESPONSE" | jq -r '
  if (.output | type) == "string" then .output
  elif (.output | type) == "array" then .output[0]
  else empty end')

if [[ -z "$OUTPUT_URL" ]]; then
  echo "Error: no output URL in prediction:" >&2
  echo "$RESPONSE" | jq '.' >&2
  exit 1
fi

echo "→ downloading: $OUTPUT_URL"
curl -sSL -o "$OUTPUT" "$OUTPUT_URL"

if [[ ! -s "$OUTPUT" ]]; then
  echo "Error: downloaded file is empty: $OUTPUT" >&2
  exit 1
fi

echo "✓ wrote $OUTPUT ($(wc -c < "$OUTPUT") bytes)"

# ---- write manifest --------------------------------------------------------

GENERATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COST_USD=$(echo "$RESPONSE" | jq -r '.metrics.predict_time // empty
  | if . == empty then null
    else (. * 0.000725 | tonumber)   # rough Replicate CPU pricing; tune later
    end' 2>/dev/null || echo "null")

# Build the manifest. Repo-relative paths assume cwd is repo root.
REPO_ROOT=$(git -C "$(dirname "$OUTPUT")" rev-parse --show-toplevel 2>/dev/null || pwd)
INPUT_REL=$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$INPUT" "$REPO_ROOT")
OUTPUT_REL=$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$OUTPUT" "$REPO_ROOT")

jq -n \
  --arg input_hash "$COMBINED_HASH" \
  --arg input_file "$INPUT_REL" \
  --arg output_file "$OUTPUT_REL" \
  --arg model "$MODEL" \
  --arg pid "$PREDICTION_ID" \
  --arg generated_at "$GENERATED_AT" \
  --argjson cost "$COST_USD" \
  '{
    version: 1,
    spec_path: null,
    stage: "cleanup",
    input_hash: $input_hash,
    input_files: [$input_file],
    outputs: [$output_file],
    params: {},
    provider: {
      name: "replicate",
      model: $model,
      prediction_id: $pid,
      cost_usd: $cost
    },
    generated_at: $generated_at,
    generated_by: "design-factory/pipelines/cleanup.sh"
  }' > "$MANIFEST"

echo "✓ wrote $MANIFEST"
echo
echo "Done. Inspect the result:"
echo "  open '$OUTPUT'"
echo "  jq '.' '$MANIFEST'"
