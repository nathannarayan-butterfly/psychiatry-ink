import { DEMO_SEED_VERSION } from './constants'
import type { DemoLocale } from './demoLocale'
import { getCanonicalDemoVersion } from './loadDemoFixture'

export function compareDemoSeedVersions(a: string, b: string): number {
  const parse = (value: string): number => {
    const match = /^v(\d+)$/i.exec(value.trim())
    return match ? Number(match[1]) : 0
  }
  const left = parse(a)
  const right = parse(b)
  if (left !== right) return left - right
  return a.trim().localeCompare(b.trim())
}

export function nextDemoSeedVersion(current: string | null | undefined): string {
  const base = (current?.trim() || DEMO_SEED_VERSION).trim()
  const match = /^v(\d+)$/i.exec(base)
  if (match) return `v${Number(match[1]) + 1}`
  return `${base}-1`
}

export function getEffectiveDemoSeedVersion(locale?: DemoLocale): string {
  if (locale) return getCanonicalDemoVersion(locale) ?? DEMO_SEED_VERSION
  return DEMO_SEED_VERSION
}

export function isDemoSeedVersionOutdated(
  localVersion: string | undefined | null,
  locale?: DemoLocale,
): boolean {
  const target = getEffectiveDemoSeedVersion(locale)
  if (!localVersion?.trim()) return true
  return compareDemoSeedVersions(localVersion, target) < 0
}
