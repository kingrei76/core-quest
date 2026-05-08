#!/usr/bin/env python3
"""
tween.py — Generate a sprite sheet by transforming the LAYERS of a rigged
.aseprite file across N frames. No AI is involved in the per-frame work; the
character is never regenerated, only translated. Cost: $0.

Usage:
    tween.py <archetype-yaml> --anim <name>

The archetype YAML must define `rig` (path to .aseprite) and a
`keyframe_anims.<name>` entry with `frames`, `fps`, and `offsets` (per-frame
per-layer x/y deltas in pixels).

Output: <output_dir>/<anim>.png + .json + .manifest.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
ASEPRITE = "/Applications/Aseprite.app/Contents/MacOS/aseprite"


def err(msg: str, code: int = 1) -> None:
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(code)


def lua_table(d: dict[str, Any], indent: int = 0) -> str:
    """Serialize a Python dict to a Lua table literal (numeric / string keys, scalar / nested values)."""
    pad = "  " * indent
    inner_pad = "  " * (indent + 1)
    parts: list[str] = []
    for k, v in d.items():
        # Keys: integers stay integers (Lua 1-indexed), other keys become string keys.
        if isinstance(k, int) or (isinstance(k, str) and k.isdigit()):
            key_str = f"[{int(k)}]"
        else:
            key_str = f'["{k}"]'
        if isinstance(v, dict):
            parts.append(f"{inner_pad}{key_str} = {lua_table(v, indent + 1)}")
        elif isinstance(v, (int, float)):
            parts.append(f"{inner_pad}{key_str} = {v}")
        elif isinstance(v, bool):
            parts.append(f"{inner_pad}{key_str} = {'true' if v else 'false'}")
        elif isinstance(v, str):
            parts.append(f'{inner_pad}{key_str} = "{v}"')
        else:
            raise TypeError(f"unsupported value type for key {k}: {type(v)}")
    if not parts:
        return "{}"
    return "{\n" + ",\n".join(parts) + "\n" + pad + "}"


# Lua template — runs inside Aseprite (-b --script).
# Uses %% placeholders (not .format()) so literal Lua braces survive.
LUA_TEMPLATE = r"""
local args = {
  source = "%%SOURCE%%",
  outPng = "%%OUT_PNG%%",
  outJson = "%%OUT_JSON%%",
  numFrames = %%NUM_FRAMES%%,
  restFrame = %%REST_FRAME%%,
  fps = %%FPS%%,
  animName = "%%ANIM_NAME%%",
}

-- offsets[frameNum][layerName] = { x = N, y = N }
local offsets = %%OFFSETS_LUA%%

local sprite = app.open(args.source)
if not sprite then
  print("ERR: could not open " .. args.source)
  return
end

-- Snapshot the rest-pose cel images and positions from rest_frame.
-- Matt's Vanguard rig lives on frame 3; configurable per archetype.
local rest = {}
for _, layer in ipairs(sprite.layers) do
  local cel = layer:cel(args.restFrame)
  if cel then
    rest[layer.name] = {
      image = Image(cel.image),  -- copy
      x = cel.position.x,
      y = cel.position.y,
    }
  end
end

-- Make sure the sprite has at least N frames.
while #sprite.frames < args.numFrames do
  sprite:newEmptyFrame()
end

-- Set frame durations.
local durMs = math.floor(1000 / args.fps + 0.5)
for f = 1, args.numFrames do
  sprite.frames[f].duration = durMs / 1000.0
end

-- For each output frame, ensure each layer has a cel at the rest image,
-- positioned at rest + offset.
for f = 1, args.numFrames do
  for _, layer in ipairs(sprite.layers) do
    local r = rest[layer.name]
    if r then
      -- Compute offset for this frame/layer (default 0/0).
      local dx, dy = 0, 0
      local fOff = offsets[f]
      if fOff then
        local lOff = fOff[layer.name]
        if lOff then
          dx = lOff.x or 0
          dy = lOff.y or 0
        end
      end
      -- Ensure cel exists at frame f.
      local cel = layer:cel(f)
      if cel == nil then
        cel = sprite:newCel(layer, f, Image(r.image), Point(r.x + dx, r.y + dy))
      else
        -- Replace the cel image with the rest image (in case Matt had something different in the source's frame 2/3)
        -- and update position.
        cel.image = Image(r.image)
        cel.position = Point(r.x + dx, r.y + dy)
      end
    end
  end
end

-- Trim trailing frames in case source had more than we need.
while #sprite.frames > args.numFrames do
  sprite:deleteFrame(#sprite.frames)
end

-- Add a tag for this animation (so the JSON atlas labels frames).
-- Aseprite Tags need a fromFrame and toFrame.
local existingTag = nil
for _, t in ipairs(sprite.tags) do
  if t.name == args.animName then existingTag = t end
end
if not existingTag then
  local tag = sprite:newTag(1, args.numFrames)
  tag.name = args.animName
end

-- Export as horizontal sprite sheet + JSON atlas.
app.command.ExportSpriteSheet({
  ui = false,
  type = SpriteSheetType.HORIZONTAL,
  textureFilename = args.outPng,
  dataFilename = args.outJson,
  dataFormat = SpriteSheetDataFormat.JSON_HASH,
  trim = false,
  splitLayers = false,
  splitTags = false,
  layer = "",
  tag = "",
  ignoreEmpty = false,
  borderPadding = 0,
  shapePadding = 0,
  innerPadding = 0,
  mergeDuplicates = false,
})

print("OK exported " .. args.outPng)
"""


def main() -> None:
    p = argparse.ArgumentParser(description="Tween rigged .aseprite into a sprite sheet")
    p.add_argument("spec", type=Path, help="path to archetype YAML")
    p.add_argument("--anim", required=True, help="keyframe_anims entry name")
    p.add_argument("--force", action="store_true", help="ignore cached manifest")
    args = p.parse_args()

    if not args.spec.exists():
        err(f"spec not found: {args.spec}", 66)

    spec = yaml.safe_load(args.spec.read_text())
    rig_rel = spec.get("rig")
    if not rig_rel:
        err("spec missing required field 'rig' (path to .aseprite)")
    rig_path = (REPO_ROOT / rig_rel).resolve()
    if not rig_path.exists():
        err(f"rig not found: {rig_path}", 66)

    anim_specs = spec.get("keyframe_anims", {})
    anim = anim_specs.get(args.anim)
    if anim is None:
        err(f"animation '{args.anim}' not in spec (available: {list(anim_specs.keys())})")

    n_frames = anim["frames"]
    fps = anim.get("fps", 8)
    rest_frame = spec.get("rest_frame", 1)
    offsets_raw = anim.get("offsets", {})
    # Normalize keys to int; ensure all frames have at least an empty entry.
    offsets: dict[int, dict[str, dict[str, int]]] = {}
    for k, v in offsets_raw.items():
        offsets[int(k)] = v or {}
    for f in range(1, n_frames + 1):
        offsets.setdefault(f, {})

    output_dir = REPO_ROOT / spec["output_dir"]
    output_dir.mkdir(parents=True, exist_ok=True)
    out_png = output_dir / f"{args.anim}.png"
    out_json = output_dir / f"{args.anim}.json"
    manifest_path = output_dir / f"{args.anim}.manifest.json"

    # Idempotency: hash rig bytes + animation spec.
    rig_bytes = rig_path.read_bytes()
    spec_bytes = json.dumps({"frames": n_frames, "fps": fps, "offsets": offsets_raw}, sort_keys=True).encode()
    input_hash = hashlib.sha256(rig_bytes + b"\x00" + spec_bytes).hexdigest()

    if not args.force and manifest_path.exists() and out_png.exists():
        prev = json.loads(manifest_path.read_text())
        if prev.get("input_hash") == input_hash:
            print(f"skip: unchanged ({out_png.relative_to(REPO_ROOT)} already up to date)")
            return

    # Work on a copy so we never modify the source rig.
    with tempfile.TemporaryDirectory() as td:
        work = Path(td) / "work.aseprite"
        shutil.copy(rig_path, work)

        offsets_lua = lua_table(offsets, indent=0)
        replacements = {
            "%%SOURCE%%": str(work).replace("\\", "/"),
            "%%OUT_PNG%%": str(out_png).replace("\\", "/"),
            "%%OUT_JSON%%": str(out_json).replace("\\", "/"),
            "%%NUM_FRAMES%%": str(n_frames),
            "%%REST_FRAME%%": str(rest_frame),
            "%%FPS%%": str(fps),
            "%%ANIM_NAME%%": args.anim,
            "%%OFFSETS_LUA%%": offsets_lua,
        }
        lua = LUA_TEMPLATE
        for k, v in replacements.items():
            lua = lua.replace(k, v)
        lua_path = Path(td) / "tween.lua"
        lua_path.write_text(lua)

        print(f"→ rig: {rig_path.relative_to(REPO_ROOT)}")
        print(f"→ anim: {args.anim} ({n_frames} frames @ {fps}fps)")
        print("→ running Aseprite...")
        result = subprocess.run(
            [ASEPRITE, "-b", "--script", str(lua_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        # Filter out the noisy PixelLab extension errors that fire on every Aseprite startup.
        out_lines = [l for l in result.stdout.splitlines() if "handle-pose.lua" not in l]
        err_lines = [l for l in result.stderr.splitlines() if "handle-pose.lua" not in l]
        for l in out_lines:
            print(f"  {l}")
        for l in err_lines:
            print(f"  ! {l}", file=sys.stderr)
        if result.returncode != 0:
            err(f"Aseprite exited {result.returncode}")

    if not out_png.exists():
        err("Aseprite ran but did not produce the output PNG")

    print(f"  ✓ wrote {out_png.relative_to(REPO_ROOT)} ({out_png.stat().st_size:,} bytes)")
    print(f"  ✓ wrote {out_json.relative_to(REPO_ROOT)}")

    manifest = {
        "version": 1,
        "spec_path": str(args.spec.relative_to(REPO_ROOT)) if args.spec.is_absolute() else str(args.spec),
        "stage": "tween",
        "input_hash": input_hash,
        "input_files": [rig_rel],
        "outputs": [
            str(out_png.relative_to(REPO_ROOT)),
            str(out_json.relative_to(REPO_ROOT)),
        ],
        "params": {
            "anim": args.anim,
            "frames": n_frames,
            "fps": fps,
            "endpoint": "aseprite-lua-tween",
        },
        "provider": {"name": "aseprite-cli", "model": "lua-tween", "cost_usd": 0.0},
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generated_by": "design-factory/pipelines/tween.py",
    }
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"  ✓ wrote {manifest_path.relative_to(REPO_ROOT)}")
    print()
    print("Done. Inspect:")
    print(f"  open '{out_png}'")


if __name__ == "__main__":
    main()
