import type { LottieAnimationData } from '../types/lottie'

const panelLottieModules = import.meta.glob('../assets/lottie/panel/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, LottieAnimationData>

function fileNameFromPath(path: string): string {
  return path.split('/').pop() ?? ''
}

function isTakeBreakPath(path: string): boolean {
  return /^takeabreak/i.test(fileNameFromPath(path))
}

function isIdlePath(path: string): boolean {
  return /idle/i.test(fileNameFromPath(path))
}

const idleEntries = Object.entries(panelLottieModules)
  .filter(([path]) => isIdlePath(path))
  .sort(([a], [b]) => fileNameFromPath(a).localeCompare(fileNameFromPath(b)))

const decorativeEntries = Object.entries(panelLottieModules)
  .filter(([path]) => !isTakeBreakPath(path) && !isIdlePath(path))
  .sort(([a], [b]) => fileNameFromPath(a).localeCompare(fileNameFromPath(b)))

export const panelLottieFileNames = decorativeEntries.map(([path]) => fileNameFromPath(path))
export const idleLottieFileNames = idleEntries.map(([path]) => fileNameFromPath(path))

export const panelLottieAnimations = decorativeEntries.map(([, data]) => data)
export const idleLottieAnimations = idleEntries.map(([, data]) => data)

export const panelLottieCount = panelLottieAnimations.length
export const idleLottieCount = idleLottieAnimations.length

function getFromList(
  list: LottieAnimationData[],
  count: number,
  index: number,
): LottieAnimationData | null {
  if (count === 0 || index < 0) return null
  return list[index % count] ?? null
}

function randomIndex(count: number, excludeIndex = -1): number {
  if (count === 0) return -1
  if (count === 1) return 0
  let index = Math.floor(Math.random() * count)
  while (index === excludeIndex) {
    index = Math.floor(Math.random() * count)
  }
  return index
}

function wrapIndex(count: number, index: number): number {
  if (count === 0) return -1
  return ((index % count) + count) % count
}

export function getPanelLottieByIndex(index: number): LottieAnimationData | null {
  return getFromList(panelLottieAnimations, panelLottieCount, index)
}

export function getIdleLottieByIndex(index: number): LottieAnimationData | null {
  return getFromList(idleLottieAnimations, idleLottieCount, index)
}

export function getRandomPanelLottieIndex(excludeIndex = -1): number {
  return randomIndex(panelLottieCount, excludeIndex)
}

export function getRandomIdleLottieIndex(excludeIndex = -1): number {
  return randomIndex(idleLottieCount, excludeIndex)
}

export function wrapPanelLottieIndex(index: number): number {
  return wrapIndex(panelLottieCount, index)
}

export function wrapIdleLottieIndex(index: number): number {
  return wrapIndex(idleLottieCount, index)
}

export function pickRandomPanelLottie(): LottieAnimationData | null {
  return getPanelLottieByIndex(getRandomPanelLottieIndex())
}

export function pickRandomIdleLottie(): LottieAnimationData | null {
  return getIdleLottieByIndex(getRandomIdleLottieIndex())
}
