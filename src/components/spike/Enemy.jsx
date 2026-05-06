import { motion } from 'framer-motion'
import styles from './Enemy.module.css'

// Programmatic CSS-shape enemies. Each `shape` key produces a distinct
// silhouette + idle motion. `flash` triggers a brief white-out on hit.
// `hitToken` (any value that changes per hit) re-keys the recoil animation
// so subsequent hits replay it cleanly.
//
// Swap-out path: when real enemy sprites land, replace the inner shape JSX
// with an <img> + sprite-sheet renderer. The flash / recoil / defeat
// motion-wrapper stays the same.
export default function Enemy({
  enemy,
  flash = false,
  hitToken = 0,
  defeated = false,
  entering = false,
}) {
  const { palette, shape } = enemy
  const styleVars = {
    '--enemy-core': palette.core,
    '--enemy-mid': palette.mid,
    '--enemy-dark': palette.dark,
    '--enemy-eye': palette.eye,
    '--enemy-glow': palette.glow,
  }

  const idle = IDLE_MOTION[shape] ?? IDLE_MOTION.slime
  const recoil = hitToken > 0 ? { x: [0, -12, 6, 0] } : { x: 0 }

  return (
    <motion.div
      className={styles.wrap}
      style={styleVars}
      initial={entering ? { x: 80, opacity: 0 } : false}
      animate={
        defeated
          ? { y: 28, opacity: 0, rotate: -8, scale: 0.95 }
          : entering
            ? { x: 0, opacity: 1 }
            : { x: 0, opacity: 1 }
      }
      transition={
        defeated
          ? { duration: 0.7, ease: 'easeIn' }
          : { duration: 0.45, ease: 'easeOut' }
      }
    >
      <div className={styles.shadow} aria-hidden />
      <motion.div
        key={hitToken}
        className={styles.recoil}
        animate={recoil}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.02 }}
      >
        <motion.div
          className={styles.idle}
          animate={defeated ? { y: 0 } : idle.animate}
          transition={defeated ? { duration: 0 } : idle.transition}
        >
          <div className={`${styles.shape} ${styles[shape]} ${flash ? styles.flash : ''}`}>
            {shape === 'slime' && <SlimeShape />}
            {shape === 'gargoyle' && <GargoyleShape />}
            {shape === 'wraith' && <WraithShape />}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const IDLE_MOTION = {
  slime: {
    animate: { scaleX: [1, 1.08, 1], scaleY: [1, 0.93, 1] },
    transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
  },
  gargoyle: {
    animate: { rotate: [-1.2, 1.2, -1.2], y: [0, -1, 0] },
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
  },
  wraith: {
    animate: { y: [0, -10, 0], rotate: [-1.5, 1.5, -1.5] },
    transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
  },
}

function SlimeShape() {
  return (
    <>
      <div className={styles.slimeHighlight} />
      <div className={styles.eyes}>
        <div className={styles.eye} />
        <div className={styles.eye} />
      </div>
      <div className={styles.slimeMouth} />
      <div className={`${styles.drip} ${styles.dripLeft}`} />
      <div className={`${styles.drip} ${styles.dripRight}`} />
    </>
  )
}

function GargoyleShape() {
  return (
    <>
      <div className={`${styles.horn} ${styles.hornLeft}`} />
      <div className={`${styles.horn} ${styles.hornRight}`} />
      <div className={styles.gargoyleBrow} />
      <div className={styles.singleEye} />
      <div className={styles.gargoyleFangs}>
        <span /><span /><span />
      </div>
      <div className={`${styles.gargoyleArm} ${styles.gargoyleArmLeft}`} />
      <div className={`${styles.gargoyleArm} ${styles.gargoyleArmRight}`} />
    </>
  )
}

function WraithShape() {
  return (
    <>
      <div className={styles.wraithHood} />
      <div className={styles.wraithEyes}>
        <div className={styles.wraithEye} />
        <div className={styles.wraithEye} />
      </div>
      <div className={styles.wraithTatters}>
        <span /><span /><span /><span /><span />
      </div>
    </>
  )
}
