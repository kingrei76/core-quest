# CraftPix Sprite Asset Credits

All character and background sprite assets in this directory are sourced from [Craftpix.net](https://craftpix.net) under the [CraftPix Free License](https://craftpix.net/file-licenses/).

## Packs in use

### Heroes
**Free Shinobi / Samurai / Fighter Pixel Art Sprites**
Source: <https://craftpix.net/freebies/free-shinobi-sprites-pixel-art/>
Pack ID: 453698

### Monsters
**Free Skeleton Pixel Art Sprite Sheets**
Source: <https://craftpix.net/freebies/free-skeleton-pixel-art-sprite-sheets/>
Pack ID: 957123

### Backgrounds
**Free Forest and Trees Pixel Backgrounds**
Source: <https://craftpix.net/freebies/free-forest-and-trees-pixel-backgrounds/>
Pack ID: 154389

## License summary

CraftPix Free License (per <https://craftpix.net/file-licenses/>):
- ✅ Free for use in commercial and non-commercial projects
- ✅ Use in unlimited projects you own
- ❌ Do not modify the assets (free-tier restriction)
- ❌ Do not redistribute as standalone assets (must be embedded in a project)
- ⚠ Attribution required — credit Craftpix.net visibly somewhere in the project

This file satisfies the attribution requirement for the Core Quest project. The encounter spike UI (`/spike/encounter`) also references this file.

## Frame format

All character sprite sheets in this collection use the same format:
- **128 × 128 pixels per frame**
- Single horizontal row of frames
- Frame count varies per animation (see image width / 128)
- 8-bit RGBA PNG

This allows the `SpriteSheet` React component (`src/components/spike/SpriteSheet.jsx`) to derive frame count automatically from image dimensions.
