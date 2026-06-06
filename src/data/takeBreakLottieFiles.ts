import type { LottieAnimationData } from '../types/lottie'

const takeBreakModules = import.meta.glob('../assets/lottie/panel/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, LottieAnimationData>

function isTakeBreakPath(path: string): boolean {
  const name = path.split('/').pop() ?? ''
  return /^takeabreak/i.test(name)
}

const takeBreakEntries = Object.entries(takeBreakModules).filter(([path]) => isTakeBreakPath(path))

export const takeBreakLottieFileNames = takeBreakEntries.map(([path]) => path.split('/').pop() ?? path)

export const takeBreakLottieAnimations = takeBreakEntries.map(([, data]) => data)

export const takeBreakLottieCount = takeBreakLottieAnimations.length

export function getTakeBreakLottieByIndex(index: number): LottieAnimationData | null {
  if (takeBreakLottieCount === 0 || index < 0) return null
  return takeBreakLottieAnimations[index % takeBreakLottieCount] ?? null
}

export function getRandomTakeBreakLottieIndex(excludeIndex = -1): number {
  if (takeBreakLottieCount === 0) return -1
  if (takeBreakLottieCount === 1) return 0
  let index = Math.floor(Math.random() * takeBreakLottieCount)
  while (index === excludeIndex) {
    index = Math.floor(Math.random() * takeBreakLottieCount)
  }
  return index
}
