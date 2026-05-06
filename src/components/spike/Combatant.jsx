import { motion } from 'framer-motion'
import styles from './Combatant.module.css'

// Per-pose transforms applied to the body. With a real sprite sheet, each pose
// would also swap a frame; for now we fake animation by squashing/leaning the
// static portrait via framer-motion. When tagged frames exist (idle/attack/hurt),
// extend this map with `frame: <index>` and add a sprite-sheet renderer below.
const POSE_TRANSFORMS = {
  idle: { x: 0, y: 0, rotate: 0, scaleY: 1 },
  wind_up: { x: -10, y: -3, rotate: -3, scaleY: 1 },
  lunge: { x: 24, y: -6, rotate: 2, scaleY: 1.03 },
  swing: { x: 42, y: 3, rotate: 4, scaleY: 0.96 },
  recover: { x: 10, y: 0, rotate: 1, scaleY: 1 },
  hurt: { x: -14, y: 0, rotate: -7, scaleY: 0.97 },
}

const POSE_TRANSITION = {
  type: 'spring',
  stiffness: 480,
  damping: 22,
  mass: 0.6,
}

export default function Combatant({ pose = 'idle', sprite, alt = 'Combatant' }) {
  const transform = POSE_TRANSFORMS[pose] ?? POSE_TRANSFORMS.idle
  const isIdle = pose === 'idle'

  return (
    <div className={styles.wrap}>
      <div className={styles.shadow} aria-hidden />
      <motion.div
        className={styles.body}
        animate={transform}
        transition={POSE_TRANSITION}
        style={{ originX: 0.5, originY: 1 }}
      >
        <motion.div
          className={styles.bob}
          animate={isIdle ? { y: [0, -3, 0] } : { y: 0 }}
          transition={
            isIdle
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
        >
          <img
            src={sprite}
            alt={alt}
            className={styles.sprite}
            draggable={false}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
