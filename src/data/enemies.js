// Placeholder enemies for the encounter spike.
// `shape` keys map to programmatic CSS-only renderings in Enemy.jsx.
// When real pixel art lands, this file becomes the slot for spritePath
// + atlas references — same wave loop, different visuals.

export const ENEMIES = [
  {
    id: 'slime',
    name: 'Procrastiblob',
    maxHp: 36,
    shape: 'slime',
    palette: {
      core: '#3ddc85',
      mid: '#1f9c5b',
      dark: '#0f5d36',
      eye: '#0a3320',
      glow: 'rgba(61, 220, 133, 0.55)',
    },
  },
  {
    id: 'gargoyle',
    name: 'Doubt Sentinel',
    maxHp: 64,
    shape: 'gargoyle',
    palette: {
      core: '#9aa1ad',
      mid: '#5a6271',
      dark: '#2c323d',
      eye: '#ff5a3a',
      glow: 'rgba(255, 90, 58, 0.5)',
    },
  },
  {
    id: 'wraith',
    name: 'Avoidance Wraith',
    maxHp: 92,
    shape: 'wraith',
    palette: {
      core: '#7d63a1',
      mid: '#4a3158',
      dark: '#1a1228',
      eye: '#ffd700',
      glow: 'rgba(255, 215, 0, 0.6)',
    },
  },
]
