import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SpriteSheet from './SpriteSheet'
import styles from './EncounterSpike.module.css'

const HERO_MAX_HP = 100
const ENEMY_MAX_HP = 80
const STRIKE_DAMAGE = 18

// Placeholder art — CraftPix off-the-shelf sprites pending Alex's in-game
// character + monster assets. See docs/design/style-bible.md.
const HERO_BASE = '/sprites/craftpix/heroes/Shinobi'
const ENEMY_BASE = '/sprites/craftpix/monsters/Skeleton_Warrior'

function useSpriteScale() {
  const mql = () => window.matchMedia('(max-width: 480px)').matches
  const [isMobile, setIsMobile] = useState(
    typeof window === 'undefined' ? false : mql(),
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile ? 1.3 : 2
}

export default function EncounterSpike() {
  const spriteScale = useSpriteScale()
  const [enemyHp, setEnemyHp] = useState(ENEMY_MAX_HP)
  const [heroHp] = useState(HERO_MAX_HP)
  const [striking, setStriking] = useState(false)
  const [enemyHurt, setEnemyHurt] = useState(false)
  const [flashId, setFlashId] = useState(0)

  const handleStrike = () => {
    if (striking || enemyHp <= 0) return
    setStriking(true)
    setFlashId((id) => id + 1)
    setTimeout(() => {
      setEnemyHp((hp) => Math.max(0, hp - STRIKE_DAMAGE))
      setEnemyHurt(true)
    }, 220)
    setTimeout(() => {
      setStriking(false)
      setEnemyHurt(false)
    }, 600)
  }

  const enemyDefeated = enemyHp <= 0
  const heroAnim = striking ? 'Attack_1' : 'Idle'
  const enemyAnim = enemyDefeated ? 'Dead' : enemyHurt ? 'Hurt' : 'Idle'

  return (
    <div className={styles.stage}>
      <div className={styles.banner}>
        <span className={styles.bannerLabel}>SPIKE</span>
        <span className={styles.bannerText}>
          Encounter prototype — Shinobi vs Skeleton Warrior
        </span>
      </div>

      <div className={styles.field}>
        {/* Hero (left) */}
        <div className={styles.actorWrap}>
          <HpBar label="Shinobi" hp={heroHp} max={HERO_MAX_HP} side="left" />
          <motion.div
            className={styles.actor}
            animate={
              striking
                ? { x: [0, 80, -8, 0], scale: [1, 1.04, 1, 1] }
                : { y: [0, -3, 0], scale: [1, 1.01, 1] }
            }
            transition={
              striking
                ? { duration: 0.6, ease: 'easeOut', times: [0, 0.4, 0.65, 1] }
                : { duration: 2.6, ease: 'easeInOut', repeat: Infinity }
            }
          >
            <SpriteSheet
              src={`${HERO_BASE}/${heroAnim}.png`}
              fps={heroAnim === 'Attack_1' ? 10 : 8}
              scale={spriteScale}
            />
          </motion.div>
        </div>

        {/* Enemy (right) */}
        <div className={`${styles.actorWrap} ${styles.actorWrapRight}`}>
          <HpBar label="Skeleton" hp={enemyHp} max={ENEMY_MAX_HP} side="right" />
          <motion.div
            className={styles.actor}
            animate={
              enemyDefeated
                ? { opacity: 0.3, y: 24 }
                : enemyHurt
                  ? { x: [0, -10, 6, 0] }
                  : { y: [0, -3, 0] }
            }
            transition={
              enemyDefeated
                ? { duration: 0.8, ease: 'easeIn' }
                : enemyHurt
                  ? { duration: 0.4 }
                  : { duration: 3, ease: 'easeInOut', repeat: Infinity }
            }
          >
            <SpriteSheet
              src={`${ENEMY_BASE}/${enemyAnim}.png`}
              fps={enemyAnim === 'Dead' ? 6 : 8}
              loop={enemyAnim !== 'Dead'}
              flip
              scale={spriteScale}
            />
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
        CraftPix sprite sheets — Shinobi (hero) and Skeleton Warrior (enemy) on a forest background.
        See <code>public/sprites/craftpix/CREDITS.md</code> for licensing.
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
