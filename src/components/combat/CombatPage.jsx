import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCombat } from '../../hooks/useCombat'
import SpriteSheet from '../spike/SpriteSheet'
import styles from './CombatPage.module.css'

const HERO_BASE = '/sprites/craftpix/heroes/Shinobi'

const ENEMY_PATHS = {
  'skeleton-warrior': '/sprites/craftpix/monsters/Skeleton_Warrior',
}

function useSpriteScale() {
  const mql = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches
  const [isMobile, setIsMobile] = useState(mql())
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile ? 1.3 : 2
}

function HpBar({ label, hp, max, side }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (hp / max) * 100 : 0))
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

function StrikeButton({ label, cost, current, onClick, disabled, variant }) {
  const enough = current >= cost
  return (
    <button
      className={`${styles.strikeButton} ${variant === 'power' ? styles.strikePower : ''}`}
      onClick={onClick}
      disabled={disabled || !enough}
    >
      <span className={styles.strikeLabel}>{label}</span>
      <span className={styles.strikeCost}>{cost} AP</span>
    </button>
  )
}

export default function CombatPage() {
  const {
    encounter,
    loading,
    strike,
    actionPoints,
    canStrikeBasic,
    canStrikePower,
    strikes,
    lastStrike,
  } = useCombat()
  const scale = useSpriteScale()
  const [busy, setBusy] = useState(false)
  const [flashId, setFlashId] = useState(0)
  const [enemyAnim, setEnemyAnim] = useState('Idle')
  const [heroAnim, setHeroAnim] = useState('Idle')

  useEffect(() => {
    if (!lastStrike) return
    setFlashId((id) => id + 1)
    setEnemyAnim('Hurt')
    setHeroAnim(lastStrike.attackType === 'power' ? 'Attack_2' : 'Attack_1')
    const t1 = setTimeout(() => setHeroAnim('Idle'), 600)
    const t2 = setTimeout(() => {
      setEnemyAnim(lastStrike.defeated ? 'Dead' : 'Idle')
    }, 500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [lastStrike])

  const handleStrike = async (attackType) => {
    if (busy) return
    setBusy(true)
    await strike(attackType)
    setTimeout(() => setBusy(false), 650)
  }

  if (loading) {
    return (
      <div className={styles.stage}>
        <div className={styles.banner}>
          <span className={styles.bannerLabel}>COMBAT</span>
          <span className={styles.bannerText}>Loading encounter…</span>
        </div>
      </div>
    )
  }

  if (!encounter) {
    return (
      <div className={styles.stage}>
        <div className={styles.banner}>
          <span className={styles.bannerLabel}>COMBAT</span>
          <span className={styles.bannerText}>No active encounter.</span>
        </div>
      </div>
    )
  }

  const enemyDefeated = encounter.status === 'victory' || encounter.enemy_hp <= 0
  const enemyBase = ENEMY_PATHS[encounter.enemy_type] ?? ENEMY_PATHS['skeleton-warrior']

  return (
    <div className={styles.stage}>
      <div className={styles.banner}>
        <span className={styles.bannerLabel}>{enemyDefeated ? 'VICTORY' : 'COMBAT'}</span>
        <span className={styles.bannerText}>
          {enemyDefeated ? `${encounter.name} defeated` : `Encounter — ${encounter.name}`}
        </span>
        <span className={styles.apIndicator}>
          <span className={styles.apValue}>{actionPoints}</span>
          <span className={styles.apLabel}>AP</span>
        </span>
      </div>

      <div className={styles.field}>
        <div className={styles.actorWrap}>
          <HpBar label="Wanderer" hp={100} max={100} side="left" />
          <motion.div
            className={styles.actor}
            animate={
              heroAnim !== 'Idle'
                ? { x: [0, 60, -6, 0], scale: [1, 1.04, 1, 1] }
                : { y: [0, -3, 0], scale: [1, 1.01, 1] }
            }
            transition={
              heroAnim !== 'Idle'
                ? { duration: 0.6, ease: 'easeOut', times: [0, 0.4, 0.65, 1] }
                : { duration: 2.6, ease: 'easeInOut', repeat: Infinity }
            }
          >
            <SpriteSheet
              src={`${HERO_BASE}/${heroAnim}.png`}
              fps={heroAnim !== 'Idle' ? 10 : 8}
              scale={scale}
            />
          </motion.div>
        </div>

        <div className={`${styles.actorWrap} ${styles.actorWrapRight}`}>
          <HpBar
            label={encounter.name}
            hp={encounter.enemy_hp}
            max={encounter.enemy_hp_max}
            side="right"
          />
          <motion.div
            className={styles.actor}
            animate={
              enemyDefeated
                ? { opacity: 0.3, y: 24 }
                : enemyAnim === 'Hurt'
                  ? { x: [0, -10, 6, 0] }
                  : { y: [0, -3, 0] }
            }
            transition={
              enemyDefeated
                ? { duration: 0.8, ease: 'easeIn' }
                : enemyAnim === 'Hurt'
                  ? { duration: 0.4 }
                  : { duration: 3, ease: 'easeInOut', repeat: Infinity }
            }
          >
            <SpriteSheet
              src={`${enemyBase}/${enemyAnim}.png`}
              fps={enemyAnim === 'Dead' ? 6 : 8}
              loop={enemyAnim !== 'Dead'}
              flip
              scale={scale}
            />
          </motion.div>
        </div>

        <AnimatePresence>
          {lastStrike && flashId > 0 && !enemyDefeated && (
            <motion.div
              key={flashId}
              className={`${styles.flash} ${lastStrike.isCrit ? styles.flashCrit : ''}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.4, 1.6] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, times: [0, 0.3, 1] }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lastStrike && (
            <motion.div
              key={`dmg-${flashId}`}
              className={`${styles.damageNumber} ${lastStrike.isCrit ? styles.damageCrit : ''}`}
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1, 0], y: [0, -40, -60, -80], scale: [0.8, 1.2, 1, 0.9] }}
              transition={{ duration: 1.1 }}
            >
              {lastStrike.isCrit && <span className={styles.critTag}>CRIT</span>}
              {lastStrike.damage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.controls}>
        {enemyDefeated ? (
          <div className={styles.victoryBlock}>
            <p className={styles.victoryText}>The {encounter.name} falls. The team takes a breath.</p>
            <p className={styles.victoryHint}>A new encounter will rise next time you complete a quest.</p>
          </div>
        ) : (
          <>
            <StrikeButton
              label={strikes.basic.label}
              cost={strikes.basic.ap}
              current={actionPoints}
              disabled={busy || !canStrikeBasic}
              onClick={() => handleStrike('basic')}
            />
            <StrikeButton
              label={strikes.power.label}
              cost={strikes.power.ap}
              current={actionPoints}
              disabled={busy || !canStrikePower}
              onClick={() => handleStrike('power')}
              variant="power"
            />
          </>
        )}
      </div>

      <p className={styles.note}>
        Earn AP by completing real-life quests. Bank shots; spend them here. Persistent enemy HP carries across days.
      </p>
    </div>
  )
}
