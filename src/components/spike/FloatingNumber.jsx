import { motion } from 'framer-motion'
import styles from './FloatingNumber.module.css'

// Damage number that drifts up + fades. Spawned with a unique key per hit
// so React re-mounts it and the animation re-runs. Calls onDone after the
// animation completes so the parent can drop it from state.
export default function FloatingNumber({ value, onDone }) {
  const drift = (Math.random() - 0.5) * 24
  return (
    <motion.div
      className={styles.number}
      initial={{ y: 0, x: 0, opacity: 0, scale: 0.6 }}
      animate={{
        y: [-4, -54, -68],
        x: [0, drift * 0.6, drift],
        opacity: [0, 1, 1, 0],
        scale: [0.6, 1.2, 1.05, 0.95],
      }}
      transition={{ duration: 0.8, ease: 'easeOut', times: [0, 0.18, 0.7, 1] }}
      onAnimationComplete={onDone}
    >
      −{value}
    </motion.div>
  )
}
