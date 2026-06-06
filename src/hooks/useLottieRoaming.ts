import { useEffect, useRef, useState } from 'react'
import {
  clamp,
  getLottieExclusionRects,
  rectsOverlap,
  type Rect,
} from '../utils/lottieExclusion'

interface Point {
  x: number
  y: number
}

interface Velocity {
  vx: number
  vy: number
}

interface Size {
  width: number
  height: number
}

interface UseLottieRoamingOptions {
  enabled: boolean
  size: Size | null
  speed?: number
}

const EXCLUSION_PADDING = 14

function randomVelocity(speed: number): Velocity {
  const angle = Math.random() * Math.PI * 2
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  }
}

function toCharacterRect(position: Point, size: Size): Rect {
  return {
    left: position.x,
    top: position.y,
    right: position.x + size.width,
    bottom: position.y + size.height,
  }
}

function findInitialPosition(size: Size, obstacles: Rect[]): Point {
  const maxX = Math.max(0, window.innerWidth - size.width)
  const maxY = Math.max(0, window.innerHeight - size.height)

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = {
      x: Math.random() * maxX,
      y: Math.random() * maxY,
    }

    const rect = toCharacterRect(candidate, size)
    if (!obstacles.some((obstacle) => rectsOverlap(rect, obstacle))) {
      return candidate
    }
  }

  return { x: maxX, y: maxY }
}

function resolveObstacleCollision(
  position: Point,
  size: Size,
  velocity: Velocity,
  obstacle: Rect,
): { position: Point; velocity: Velocity } {
  const rect = toCharacterRect(position, size)
  if (!rectsOverlap(rect, obstacle)) {
    return { position, velocity }
  }

  const overlapLeft = rect.right - obstacle.left
  const overlapRight = obstacle.right - rect.left
  const overlapTop = rect.bottom - obstacle.top
  const overlapBottom = obstacle.bottom - rect.top
  const minOverlap = Math.min(
    overlapLeft,
    overlapRight,
    overlapTop,
    overlapBottom,
  )

  const nextPosition = { ...position }
  const nextVelocity = { ...velocity }

  if (minOverlap === overlapLeft) {
    nextPosition.x = obstacle.left - size.width
    nextVelocity.vx = -Math.abs(nextVelocity.vx)
  } else if (minOverlap === overlapRight) {
    nextPosition.x = obstacle.right
    nextVelocity.vx = Math.abs(nextVelocity.vx)
  } else if (minOverlap === overlapTop) {
    nextPosition.y = obstacle.top - size.height
    nextVelocity.vy = -Math.abs(nextVelocity.vy)
  } else {
    nextPosition.y = obstacle.bottom
    nextVelocity.vy = Math.abs(nextVelocity.vy)
  }

  return { position: nextPosition, velocity: nextVelocity }
}

function resolveViewportCollision(
  position: Point,
  size: Size,
  velocity: Velocity,
): { position: Point; velocity: Velocity } {
  const maxX = Math.max(0, window.innerWidth - size.width)
  const maxY = Math.max(0, window.innerHeight - size.height)
  const nextPosition = {
    x: clamp(position.x, 0, maxX),
    y: clamp(position.y, 0, maxY),
  }
  const nextVelocity = { ...velocity }

  if (nextPosition.x <= 0 || nextPosition.x >= maxX) {
    nextVelocity.vx = -nextVelocity.vx
  }

  if (nextPosition.y <= 0 || nextPosition.y >= maxY) {
    nextVelocity.vy = -nextVelocity.vy
  }

  return { position: nextPosition, velocity: nextVelocity }
}

export function useLottieRoaming({
  enabled,
  size,
  speed = 0.45,
}: UseLottieRoamingOptions) {
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 })
  const positionRef = useRef<Point>({ x: 0, y: 0 })
  const velocityRef = useRef<Velocity>(randomVelocity(speed))
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!size) return

    if (!initializedRef.current) {
      const start = findInitialPosition(size, getLottieExclusionRects(EXCLUSION_PADDING))
      positionRef.current = start
      velocityRef.current = randomVelocity(speed)
      setPosition(start)
      initializedRef.current = true
    }

    if (!enabled) return

    let frameId = 0

    const tick = () => {
      const obstacles = getLottieExclusionRects(EXCLUSION_PADDING)
      let nextPosition = {
        x: positionRef.current.x + velocityRef.current.vx,
        y: positionRef.current.y + velocityRef.current.vy,
      }
      let nextVelocity = { ...velocityRef.current }

      for (const obstacle of obstacles) {
        const resolved = resolveObstacleCollision(
          nextPosition,
          size,
          nextVelocity,
          obstacle,
        )
        nextPosition = resolved.position
        nextVelocity = resolved.velocity
      }

      const viewportResolved = resolveViewportCollision(
        nextPosition,
        size,
        nextVelocity,
      )
      nextPosition = viewportResolved.position
      nextVelocity = viewportResolved.velocity

      positionRef.current = nextPosition
      velocityRef.current = nextVelocity
      setPosition(nextPosition)

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    const handleResize = () => {
      const maxX = Math.max(0, window.innerWidth - size.width)
      const maxY = Math.max(0, window.innerHeight - size.height)
      const clamped = {
        x: clamp(positionRef.current.x, 0, maxX),
        y: clamp(positionRef.current.y, 0, maxY),
      }
      positionRef.current = clamped
      setPosition(clamped)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [enabled, size, speed])

  useEffect(() => {
    initializedRef.current = false
  }, [size?.width, size?.height])

  return position
}
