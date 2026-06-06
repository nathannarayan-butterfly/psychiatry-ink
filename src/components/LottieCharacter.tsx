import Lottie from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import { useLottieRoaming } from '../hooks/useLottieRoaming'
import type { LottieCharacterConfig } from '../types/lottie'

const defaultSizeClassName =
  'lottie-character__player h-[6.5rem] w-[8.5rem] opacity-90 sm:h-[7.5rem] sm:w-[10rem]'

interface LottieCharacterProps {
  character: LottieCharacterConfig
}

export function LottieCharacter({ character }: LottieCharacterProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setReduceMotion(mediaQuery.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const element = rootRef.current
    if (!element) return

    const measure = () => {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height })
      }
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const position = useLottieRoaming({
    enabled: !reduceMotion,
    size,
    speed: character.speed,
  })

  return (
    <div
      ref={rootRef}
      className="lottie-character pointer-events-none fixed left-0 top-0 select-none"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      aria-hidden
    >
      <Lottie
        animationData={character.animationData}
        loop={character.loop ?? true}
        className={character.sizeClassName ?? defaultSizeClassName}
      />
    </div>
  )
}
