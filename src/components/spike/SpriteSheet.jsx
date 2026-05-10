import { useEffect, useRef, useState } from 'react'

export default function SpriteSheet({
  src,
  frameWidth = 128,
  frameHeight = 128,
  frameCount,
  fps = 8,
  loop = true,
  onComplete,
  flip = false,
  scale = 1,
  className,
  style,
}) {
  const [frame, setFrame] = useState(0)
  const [resolvedFrameCount, setResolvedFrameCount] = useState(frameCount ?? 1)
  const lastTickRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (frameCount) {
      setResolvedFrameCount(frameCount)
      return
    }
    const img = new Image()
    img.src = src
    img.onload = () => {
      setResolvedFrameCount(Math.max(1, Math.floor(img.naturalWidth / frameWidth)))
    }
  }, [src, frameWidth, frameCount])

  useEffect(() => {
    setFrame(0)
    lastTickRef.current = 0
  }, [src])

  useEffect(() => {
    if (resolvedFrameCount <= 1) return undefined
    const interval = 1000 / fps
    let raf

    const tick = (now) => {
      if (lastTickRef.current === 0) lastTickRef.current = now
      const elapsed = now - lastTickRef.current
      if (elapsed >= interval) {
        lastTickRef.current = now
        setFrame((prev) => {
          const next = prev + 1
          if (next >= resolvedFrameCount) {
            if (loop) return 0
            onCompleteRef.current?.()
            return prev
          }
          return next
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fps, resolvedFrameCount, loop])

  const w = frameWidth * scale
  const h = frameHeight * scale

  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${frame * w}px 0`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${resolvedFrameCount * w}px ${h}px`,
        imageRendering: 'pixelated',
        transform: flip ? 'scaleX(-1)' : undefined,
        ...style,
      }}
    />
  )
}
