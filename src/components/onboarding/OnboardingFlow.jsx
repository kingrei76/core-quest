import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCharacter } from '../../contexts/CharacterContext'
import { CATEGORIES, DIFFICULTIES } from '../../config/constants'
import { categoryOptions } from '../../utils/categories'
import { getCategoryStat } from '../../utils/rpg'
import styles from './OnboardingFlow.module.css'

const FOCUS_BONUS = 5
const SECONDARY_BONUS = 2

export default function OnboardingFlow() {
  const { user } = useAuth()
  const { refresh } = useCharacter()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [characterName, setCharacterName] = useState('')
  const [focus, setFocus] = useState('health')
  const [firstQuest, setFirstQuest] = useState('')
  const [saving, setSaving] = useState(false)

  const skip = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ display_name: 'Adventurer' }).eq('id', user.id)
    await refresh()
    navigate('/inbox', { replace: true })
  }

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => Math.max(0, s - 1))

  const handleFinish = async () => {
    setSaving(true)
    const name = characterName.trim() || 'Adventurer'

    await supabase.from('profiles').update({
      character_name: name,
      display_name: name,
    }).eq('id', user.id)

    const focusStat = getCategoryStat(focus)
    const statsUpdate = {
      [focusStat]: 10 + FOCUS_BONUS,
      updated_at: new Date().toISOString(),
    }
    // give a small bump to one secondary stat (whichever isn't the focus and is also above-baseline interesting)
    const secondaryStat = focusStat === 'wisdom' ? 'fortune' : 'wisdom'
    statsUpdate[secondaryStat] = 10 + SECONDARY_BONUS

    await supabase.from('character_stats').update(statsUpdate).eq('user_id', user.id)

    if (firstQuest.trim()) {
      await supabase.from('quests').insert({
        user_id: user.id,
        title: firstQuest.trim(),
        category: focus,
        difficulty: 'easy',
        xp_value: DIFFICULTIES.easy.xp,
        status: 'available',
      })
    }

    await refresh()
    navigate('/inbox', { replace: true })
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <button onClick={skip} className={styles.skip} disabled={saving}>
          Skip intro
        </button>

        {step === 0 && (
          <>
            <h1 className={styles.title}>Welcome, traveler.</h1>
            <p className={styles.body}>
              CORE Quest turns the things you keep meaning to do into quests.
              Complete quests, earn XP, level up your character, and watch
              your habits become a story.
            </p>
            <button onClick={next} className={styles.cta}>Begin</button>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className={styles.title}>Name your character</h1>
            <p className={styles.body}>This is who you'll be on the quest board.</p>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Adventurer"
              className={styles.input}
              autoFocus
              maxLength={32}
            />
            <div className={styles.buttons}>
              <button onClick={back} className={styles.secondary}>Back</button>
              <button onClick={next} className={styles.cta}>Next</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={styles.title}>Choose your focus</h1>
            <p className={styles.body}>
              Where do you want to grow first? You'll start with a stat boost in this area.
            </p>
            <div className={styles.focusGrid}>
              {categoryOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.focusBtn} ${focus === opt.value ? styles.focusActive : ''}`}
                  style={{ '--focus-color': opt.color }}
                  onClick={() => setFocus(opt.value)}
                >
                  <div className={styles.focusLabel}>{opt.label}</div>
                  <div className={styles.focusStat}>+{FOCUS_BONUS} {CATEGORIES[opt.value].stat}</div>
                </button>
              ))}
            </div>
            <div className={styles.buttons}>
              <button onClick={back} className={styles.secondary}>Back</button>
              <button onClick={next} className={styles.cta}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className={styles.title}>Your first quest</h1>
            <p className={styles.body}>
              Pick something small you want to do today. You can leave this blank.
            </p>
            <input
              type="text"
              value={firstQuest}
              onChange={(e) => setFirstQuest(e.target.value)}
              placeholder="e.g. Take a 10-minute walk"
              className={styles.input}
              autoFocus
              maxLength={120}
            />
            <div className={styles.buttons}>
              <button onClick={back} className={styles.secondary} disabled={saving}>Back</button>
              <button onClick={handleFinish} className={styles.cta} disabled={saving}>
                {saving ? 'Starting…' : 'Start the adventure'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
