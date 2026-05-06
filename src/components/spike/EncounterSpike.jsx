import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import Combatant from './Combatant'
import Enemy from './Enemy'
import FloatingNumber from './FloatingNumber'
import { SKILLS } from '../../data/skills'
import { ENEMIES } from '../../data/enemies'
import { useSkillSequence } from '../../hooks/useSkillSequence'
import styles from './EncounterSpike.module.css'

const VANGUARD_MAX_HP = 100

const SHAKE_KEYFRAMES = {
  small: {
    x: [0, -3, 4, -2, 0],
    y: [0, 2, -1, 0, 0],
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  big: {
    x: [0, -9, 11, -7, 4, 0],
    y: [0, 4, -3, 2, -1, 0],
    transition: { duration: 0.32, ease: 'easeOut' },
  },
}

export default function EncounterSpike() {
  const [waveIndex, setWaveIndex] = useState(0)
  const [enemyHp, setEnemyHp] = useState(ENEMIES[0].maxHp)
  const [hitToken, setHitToken] = useState(0)
  const [flash, setFlash] = useState(false)
  const [defeated, setDefeated] = useState(false)
  const [entering, setEntering] = useState(true)
  const [victory, setVictory] = useState(false)
  const [damageEvents, setDamageEvents] = useState([])

  const flashTimerRef = useRef(null)
  const fieldControls = useAnimationControls()
  const enemy = ENEMIES[waveIndex]

  const triggerShake = useCallback(
    (mode) => {
      const kf = SHAKE_KEYFRAMES[mode] ?? SHAKE_KEYFRAMES.small
      fieldControls.start(kf)
    },
    [fieldControls],
  )

  const handleEffect = useCallback(
    (token) => {
      if (token === 'enemyFlash') {
        setFlash(true)
        clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlash(false), 110)
        return
      }
      if (token === 'screenShakeSmall') return triggerShake('small')
      if (token === 'screenShakeBig') return triggerShake('big')
      if (token.startsWith('damage:')) {
        const value = parseInt(token.slice('damage:'.length), 10) || 0
        setEnemyHp((hp) => Math.max(0, hp - value))
        setHitToken((t) => t + 1)
        const id = `${Date.now()}-${Math.random()}`
        setDamageEvents((evs) => [...evs, { id, value }])
      }
    },
    [triggerShake],
  )

  const { isPlaying, selfPose, play } = useSkillSequence({ onEffect: handleEffect })

  // Defeat trigger when HP hits zero
  useEffect(() => {
    if (enemyHp <= 0 && !defeated && !victory) {
      const t = setTimeout(() => setDefeated(true), 280)
      return () => clearTimeout(t)
    }
  }, [enemyHp, defeated, victory])

  // Wave advance after defeat fade-out
  useEffect(() => {
    if (!defeated) return
    const t = setTimeout(() => {
      const nextIndex = waveIndex + 1
      if (nextIndex >= ENEMIES.length) {
        setVictory(true)
        return
      }
      setWaveIndex(nextIndex)
      setEnemyHp(ENEMIES[nextIndex].maxHp)
      setHitToken(0)
      setFlash(false)
      setDefeated(false)
      setEntering(true)
      setDamageEvents([])
    }, 800)
    return () => clearTimeout(t)
  }, [defeated, waveIndex])

  // Drop entering flag after enter anim
  useEffect(() => {
    if (!entering) return
    const t = setTimeout(() => setEntering(false), 480)
    return () => clearTimeout(t)
  }, [entering])

  // Cleanup flash timer on unmount
  useEffect(() => () => clearTimeout(flashTimerRef.current), [])

  const handleSkill = (skillKey) => {
    if (isPlaying || defeated || victory) return
    play(SKILLS[skillKey])
  }

  const handleReset = () => {
    setWaveIndex(0)
    setEnemyHp(ENEMIES[0].maxHp)
    setHitToken(0)
    setFlash(false)
    setDefeated(false)
    setVictory(false)
    setDamageEvents([])
    setEntering(true)
  }

  const removeDamageEvent = (id) =>
    setDamageEvents((evs) => evs.filter((e) => e.id !== id))

  return (
    <div className={styles.stage}>
      <div className={styles.banner}>
        <span className={styles.bannerLabel}>SPIKE</span>
        <span className={styles.bannerText}>
          {victory
            ? 'Wave cleared'
            : `Wave ${Math.min(waveIndex + 1, ENEMIES.length)} / ${ENEMIES.length} — ${enemy.name}`}
        </span>
      </div>

      <motion.div className={styles.field} animate={fieldControls}>
        {/* Vanguard (left) */}
        <div className={styles.actorSlot}>
          <HpBar
            label="Vanguard"
            hp={VANGUARD_MAX_HP}
            max={VANGUARD_MAX_HP}
            side="left"
          />
          <Combatant
            pose={selfPose}
            sprite="/sprites/vanguard-v1-cropped.png"
            alt="Vanguard"
          />
        </div>

        {/* Enemy (right) */}
        <div className={styles.actorSlot}>
          <AnimatePresence mode="wait">
            {!victory && (
              <motion.div
                key={enemy.id}
                className={styles.enemySlot}
                initial={false}
                exit={{ opacity: 0 }}
              >
                <HpBar
                  label={enemy.name}
                  hp={enemyHp}
                  max={enemy.maxHp}
                  side="right"
                />
                <div className={styles.enemyHost}>
                  <Enemy
                    enemy={enemy}
                    flash={flash}
                    hitToken={hitToken}
                    defeated={defeated}
                    entering={entering}
                  />
                  <AnimatePresence>
                    {damageEvents.map((ev) => (
                      <FloatingNumber
                        key={ev.id}
                        value={ev.value}
                        onDone={() => removeDamageEvent(ev.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
            {victory && (
              <motion.div
                key="victory"
                className={styles.victory}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className={styles.victoryTitle}>VICTORY</div>
                <div className={styles.victorySub}>The portal stabilizes.</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className={styles.controls}>
        {!victory ? (
          <>
            <button
              className={styles.skillButton}
              onClick={() => handleSkill('crashingStrike')}
              disabled={isPlaying || defeated}
            >
              <span className={styles.skillName}>Crashing Strike</span>
              <span className={styles.skillCost}>1 AP</span>
            </button>
            <button
              className={`${styles.skillButton} ${styles.skillButtonAlt}`}
              onClick={() => handleSkill('quickSlash')}
              disabled={isPlaying || defeated}
            >
              <span className={styles.skillName}>Quick Slash</span>
              <span className={styles.skillCost}>1 AP</span>
            </button>
          </>
        ) : (
          <button className={styles.resetButton} onClick={handleReset}>
            Reset wave
          </button>
        )}
      </div>

      <p className={styles.note}>
        Pose-driven body motion + beat-sequenced skills + 3-enemy wave. Swap the
        Combatant sprite path for a sheet renderer when frames land.
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
