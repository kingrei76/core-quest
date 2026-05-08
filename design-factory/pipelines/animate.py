#!/usr/bin/env python3
"""
animate.py — Generate animated sprite frames for an archetype using PixelLab's
animate-with-text endpoint.

Usage:
    PIXELLAB_API_KEY=<key> animate.py <archetype-yaml> [--anim idle|walk|attack|hurt] [--frames 4] [--size 64]

Defaults: idle, 4 frames, 64x64.

Reads the archetype spec, picks a clean reference image, calls PixelLab's
animate-with-text with the spec's prompt fragments. Writes:
    <output_dir>/<anim>.png         — frames horizontally stitched into a sprite sheet
    <output_dir>/<anim>.json        — frame atlas (Aseprite-compatible: frames + meta)
    <output_dir>/<anim>.manifest.json — manifest sidecar

Idempotent: re-running with the same input hash + params is a no-op.

Requires: pip install pixellab pillow
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from PIL import Image
import pixellab


REPO_ROOT = Path(__file__).resolve().parents[2]


def err(msg: str, code: int = 1) -> None:
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(code)


def load_spec(spec_path: Path) -> dict[str, Any]:
    if not spec_path.exists():
        err(f"spec not found: {spec_path}", 66)
    with spec_path.open() as fh:
        return yaml.safe_load(fh)


def find_anim(spec: dict[str, Any], name: str) -> dict[str, Any]:
    for a in spec.get("animations", []):
        if a["name"] == name:
            return a
    err(f"animation '{name}' not found in spec (available: {[a['name'] for a in spec.get('animations', [])]})")


def hash_inputs(*parts: bytes) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p)
        h.update(b"\x00")
    return h.hexdigest()


def stitch_horizontal(frames: list[Image.Image]) -> Image.Image:
    """Stitch frames into one horizontal sprite sheet."""
    if not frames:
        raise ValueError("no frames to stitch")
    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        # Convert RGB → RGBA (alpha later when we wire rembg into the pipeline).
        if f.mode != "RGBA":
            f = f.convert("RGBA")
        sheet.paste(f, (i * w, 0))
    return sheet


def make_atlas(anim: dict[str, Any], frame_size: tuple[int, int], n_frames: int, sheet_path: str) -> dict[str, Any]:
    """Build an Aseprite-compatible frame atlas JSON."""
    fw, fh = frame_size
    duration_ms = int(1000 / anim.get("fps", 8))
    frames = {}
    for i in range(n_frames):
        frames[f"{anim['name']}-{i}"] = {
            "frame": {"x": i * fw, "y": 0, "w": fw, "h": fh},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": fw, "h": fh},
            "sourceSize": {"w": fw, "h": fh},
            "duration": duration_ms,
        }
    return {
        "frames": frames,
        "meta": {
            "app": "design-factory",
            "version": "1",
            "image": Path(sheet_path).name,
            "format": "RGBA8888",
            "size": {"w": fw * n_frames, "h": fh},
            "scale": "1",
            "frameTags": [
                {"name": anim["name"], "from": 0, "to": n_frames - 1, "direction": "forward"}
            ],
        },
    }


def main() -> None:
    p = argparse.ArgumentParser(description="PixelLab animate-with-text → sprite sheet")
    p.add_argument("spec", type=Path, help="path to archetype YAML")
    p.add_argument("--anim", default="idle", help="animation name from spec (default: idle)")
    p.add_argument("--size", type=int, default=64, help="square output size in px (default 64)")
    p.add_argument("--frames", type=int, default=None, help="override frame count from spec")
    p.add_argument("--seed", type=int, default=0, help="seed (0=random)")
    p.add_argument("--force", action="store_true", help="ignore cached manifest, regenerate")
    args = p.parse_args()

    api_key = os.environ.get("PIXELLAB_API_KEY")
    if not api_key:
        err(
            "PIXELLAB_API_KEY not set.\n  Try:\n"
            "  export PIXELLAB_API_KEY=\"$(OP_ACCOUNT=my.1password.com op read 'op://Personal/Pixellab.ai API/notesPlain')\"",
            78,
        )

    spec = load_spec(args.spec)
    anim = find_anim(spec, args.anim)
    n_frames = args.frames or anim.get("frames", 4)

    # Reference image: prefer clean_image from spec, fall back to cropped, then reference_image.
    candidates = [
        spec.get("clean_image"),
        "public/sprites/vanguard-v1-cropped.png" if spec["name"] == "vanguard" else None,
        spec.get("reference_image"),
    ]
    ref_path = next((REPO_ROOT / c for c in candidates if c and (REPO_ROOT / c).exists()), None)
    if ref_path is None:
        err(f"no usable reference image found for '{spec['name']}' (tried: {candidates})")

    print(f"→ archetype: {spec['name']}, anim: {args.anim}, frames: {n_frames}, size: {args.size}x{args.size}")
    print(f"→ reference: {ref_path.relative_to(REPO_ROOT)}")

    output_dir = REPO_ROOT / spec["output_dir"]
    output_dir.mkdir(parents=True, exist_ok=True)

    sheet_path = output_dir / f"{args.anim}.png"
    atlas_path = output_dir / f"{args.anim}.json"
    manifest_path = output_dir / f"{args.anim}.manifest.json"

    # Hash: image bytes + critical params. If unchanged, skip.
    ref_bytes = ref_path.read_bytes()
    params = {
        "anim": args.anim,
        "size": args.size,
        "n_frames": n_frames,
        "seed": args.seed,
        "endpoint": "animate-with-text",
        "description_hash": hashlib.sha256(
            (spec["prompt"]["base_style"] + spec["prompt"]["archetype"]).encode()
        ).hexdigest()[:16],
    }
    input_hash = hash_inputs(ref_bytes, json.dumps(params, sort_keys=True).encode())

    if not args.force and manifest_path.exists() and sheet_path.exists():
        prev = json.loads(manifest_path.read_text())
        if prev.get("input_hash") == input_hash:
            print(f"skip: unchanged ({sheet_path.relative_to(REPO_ROOT)} already up to date)")
            return

    # Build prompt fragments.
    description = (spec["prompt"]["base_style"] + " " + spec["prompt"]["archetype"]).strip()
    action_map = {
        "idle": "subtle idle breathing pose, weight shifting",
        "walk": "walking forward, alternating legs and arms",
        "attack": "dynamic melee attack swing with weapon",
        "hurt": "knocked back, recoil reaction",
    }
    action = action_map.get(args.anim, args.anim)

    # Call PixelLab.
    # API requires reference_image dimensions to match image_size — it does not
    # auto-resize. Use thumbnail to preserve aspect ratio, then paste centered
    # onto a square canvas. RGBA white-on-transparent so the model sees a clean
    # silhouette.
    print("→ calling PixelLab animate-with-text...")
    client = pixellab.Client(secret=api_key)
    raw = Image.open(ref_path).convert("RGBA")
    raw.thumbnail((args.size, args.size), Image.LANCZOS)
    ref_img = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
    ref_img.paste(raw, ((args.size - raw.width) // 2, (args.size - raw.height) // 2))
    ref_img = ref_img.convert("RGB")  # SDK wraps as PNG either way; RGB is fine
    print(f"  ↳ resized reference to {ref_img.size}")

    response = client.animate_with_text(
        image_size={"width": args.size, "height": args.size},
        description=description,
        action=action,
        reference_image=ref_img,
        view="side",
        direction="east",
        negative_description=spec["prompt"].get("negative", ""),
        n_frames=n_frames,
        seed=args.seed,
    )

    print(f"  ✓ generated {len(response.images)} frames, usage: ${response.usage.usd:.4f}")

    # Convert to PIL and stitch.
    frames = [img.pil_image() for img in response.images]
    sheet = stitch_horizontal(frames)
    sheet.save(sheet_path, format="PNG")
    print(f"  ✓ wrote {sheet_path.relative_to(REPO_ROOT)} ({sheet_path.stat().st_size:,} bytes)")

    # Atlas.
    atlas = make_atlas(anim, frames[0].size, n_frames, str(sheet_path))
    atlas_path.write_text(json.dumps(atlas, indent=2))
    print(f"  ✓ wrote {atlas_path.relative_to(REPO_ROOT)}")

    # Manifest.
    manifest = {
        "version": 1,
        "spec_path": str(args.spec.relative_to(REPO_ROOT)) if args.spec.is_absolute() else str(args.spec),
        "stage": "animate",
        "input_hash": input_hash,
        "input_files": [str(ref_path.relative_to(REPO_ROOT))],
        "outputs": [
            str(sheet_path.relative_to(REPO_ROOT)),
            str(atlas_path.relative_to(REPO_ROOT)),
        ],
        "params": params,
        "provider": {
            "name": "pixellab",
            "model": "animate-with-text",
            "cost_usd": response.usage.usd,
        },
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generated_by": "design-factory/pipelines/animate.py",
    }
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"  ✓ wrote {manifest_path.relative_to(REPO_ROOT)}")
    print()
    print("Done. Inspect:")
    print(f"  open '{sheet_path}'")
    print(f"  jq '.' '{manifest_path}'")


if __name__ == "__main__":
    main()
