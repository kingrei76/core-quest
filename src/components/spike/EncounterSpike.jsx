import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './EncounterSpike.module.css'

const VANGUARD_MAX_HP = 100
const ENEMY_MAX_HP = 80
const STRIKE_DAMAGE = 18

export default function EncounterSpike() {
  const [enemyHp, setEnemyHp] = useState(ENEMY_MAX_HP)
  const [vanguardHp] = useState(VANGUARD_MAX_HP)
  const [striking, setStriking] = useState(false)
  const [flashId, setFlashId] = useState(0)

  const handleStrike = () => {
    if (striking || enemyHp <= 0) return
    setStriking(true)
    setFlashId((id) => id + 1)
    setTimeout(() => {
      setEnemyHp((hp) => Math.max(0, hp - STRIKE_DAMAGE))
    }, 220)
    setTimeout(() => setStriking(false), 600)
  }

  const enemyDefeated = enemyHp <= 0

  return (
    <div className={styles.stage}>
      <div className={styles.banner}>
        <span className={styles.bannerLabel}>SPIKE</span>
        <span className={styles.bannerText}>
          Encounter prototype — Vanguard idle + Crashing Strike
        </span>
      </div>

      <div className={styles.field}>
        {/* Vanguard (left) */}
        <div className={styles.actorWrap}>
          <HpBar label="Vanguard" hp={vanguardHp} max={VANGUARD_MAX_HP} side="left" />
          <motion.div
            className={styles.actor}
            animate={
              striking
                ? { x: [0, 80, -8, 0], scale: [1, 1.06, 1, 1] }
                : { y: [0, -4, 0], scale: [1, 1.012, 1] }
            }
            transition={
              striking
                ? { duration: 0.6, ease: 'easeOut', times: [0, 0.4, 0.65, 1] }
                : { duration: 2.6, ease: 'easeInOut', repeat: Infinity }
            }
          >
            <img
              src="/sprites/vanguard-v1-clean.png"
              alt="Vanguard"
              className={styles.sprite}
              draggable={false}
            />
          </motion.div>
        </div>

        {/* Enemy (right) */}
        <div className={`${styles.actorWrap} ${styles.actorWrapRight}`}>
          <HpBar label="Wraith" hp={enemyHp} max={ENEMY_MAX_HP} side="right" />
          <motion.div
            className={styles.actor}
            animate={
              enemyDefeated
                ? { opacity: 0, y: 24, rotate: -8 }
                : flashId > 0 && striking
                  ? { x: [0, -10, 6, 0] }
                  : { y: [0, -3, 0] }
            }
            transition={
              enemyDefeated
                ? { duration: 0.8, ease: 'easeIn' }
                : flashId > 0 && striking
                  ? { duration: 0.4, delay: 0.22 }
                  : { duration: 3, ease: 'easeInOut', repeat: Infinity }
            }
          >
            <div className={styles.enemyPlaceholder}>
              <div className={styles.enemyEye} />
              <div className={styles.enemyEye} />
              <div className={styles.enemyMouth} />
            </div>
          </motion.div>
        </div>

        {/* Strike flash overlay */}
        <AnimatePresence>
          {striking && (
            <motion.div
              key={flashId}
              className={styles.flash}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.4, 1.6] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, times: [0, 0.3, 1] }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className={styles.controls}>
        <button
          className={styles.strikeButton}
          onClick={handleStrike}
          disabled={striking || enemyDefeated}
        >
          {enemyDefeated ? 'Defeated' : 'Crashing Strike'}
          <span className={styles.strikeCost}>1 AP</span>
        </button>
        {enemyDefeated && (
          <button
            className={styles.resetButton}
            onClick={() => setEnemyHp(ENEMY_MAX_HP)}
          >
            Reset
          </button>
        )}
      </div>

      <p className={styles.note}>
        First proof point of the encounter spike (`docs/encounter-spike.md`):
        DOM + framer-motion + a single static sprite. No sprite sheet yet.
      </p>
    </div>
  )
}

function HpBar({ label, hp, max, side }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100))
  return (
    <div className={`${styles.hpBar} ${side === 'right' ? styles.hpBarRight : ''}`}>
      <div className={styles.hpLabel}>{label}</div>
      <div className={styles.hpTrack}>
        <motion.div
          className={styles.hpFill}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className={styles.hpValue}>
        {hp} / {max}
      </div>
    </div>
  )
}
