export const LOTTIE_EXCLUSION_SELECTOR = '[data-lottie-exclusion]'

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export function inflateRect(rect: DOMRect, padding: number): Rect {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
  }
}

export function getLottieExclusionRects(padding = 12): Rect[] {
  return Array.from(document.querySelectorAll<HTMLElement>(LOTTIE_EXCLUSION_SELECTOR))
    .filter((element) => element.offsetParent !== null || element.getClientRects().length > 0)
    .map((element) => inflateRect(element.getBoundingClientRect(), padding))
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
