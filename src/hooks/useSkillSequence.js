import { useCallback, useRef, useState } from 'react'

// Walks a skill's beats in sequence: sets pose, awaits duration, fires effects.
// Effects bubble out via onEffect(token) so the page can run damage / shake /
// flash / floating numbers from one place.
//
// A beat is `{ pose?, duration?, effects? }`.
//   - pose: Combatant pose key for `self` (the player). Persists until next pose beat.
//   - effects: array of string tokens. `damage:N` carries an integer payload.
//   - duration: ms to wait before advancing. Omitted = instantaneous.
//
// `play(skill)` returns a promise that resolves when the sequence finishes.
// While playing, isPlaying === true so the action button can disable itself.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function useSkillSequence({ onEffect } = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [selfPose, setSelfPose] = useState('idle')
  const playingRef = useRef(false)

  const play = useCallback(
    async (skill) => {
      if (playingRef.current || !skill?.beats?.length) return
      playingRef.current = true
      setIsPlaying(true)

      try {
        for (const beat of skill.beats) {
          if (beat.pose) setSelfPose(beat.pose)
          if (beat.effects && onEffect) {
            for (const token of beat.effects) onEffect(token)
          }
          if (beat.duration) await sleep(beat.duration)
        }
      } finally {
        setSelfPose('idle')
        playingRef.current = false
        setIsPlaying(false)
      }
    },
    [onEffect],
  )

  return { isPlaying, selfPose, play }
}
