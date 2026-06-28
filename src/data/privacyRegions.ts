/**
 * Country-specific privacy tiers for patient metadata (name/DOB local; age in clinical vault).
 *
 * Architecture:
 * - `full`: local name/DOB vault + encrypted clinical sync (age in ciphertext; never name/DOB)
 * - `local_only`: encrypted local vault only — no server-side key storage
 * - `disabled`: feature hidden (strictest regions)
 *
 * Edit COUNTRY_TIER_OVERRIDES to adjust defaults without code changes elsewhere.
 */

export type PrivacyTier = 'full' | 'local_only' | 'disabled'

/** ISO 3166-1 alpha-2 country codes mapped to privacy tier. */
export const COUNTRY_TIER_OVERRIDES: Record<string, PrivacyTier> = {
  // DACH — strict local-only defaults
  DE: 'local_only',
  AT: 'local_only',
  CH: 'local_only',
  // Optional strict disable (empty by default — uncomment to enable)
  // FR: 'disabled',
  // Dev / non-EU placeholders — allow public-key registration
  US: 'full',
  GB: 'full',
  AU: 'full',
  CA: 'full',
}

/**
 * Fallback for countries without an explicit override (e.g. India, EU members
 * other than DE/AT/CH). Unmapped jurisdictions get the `full` tier so
 * server-side encrypted clinical case-file snapshots are allowed.
 */
export const DEFAULT_PRIVACY_TIER: PrivacyTier = 'full'

export function resolvePrivacyTier(countryCode: string | null | undefined): PrivacyTier {
  if (!countryCode) return DEFAULT_PRIVACY_TIER
  const normalized = countryCode.trim().toUpperCase()
  return COUNTRY_TIER_OVERRIDES[normalized] ?? DEFAULT_PRIVACY_TIER
}

/** Derive ISO country from BCP-47 locale tag (e.g. `de-CH` → `CH`). */
export function countryFromLocale(locale: string): string | null {
  const tag = locale.trim()
  if (!tag) return null

  const parts = tag.split(/[-_]/)
  if (parts.length >= 2) {
    const region = parts[parts.length - 1]
    if (/^[a-zA-Z]{2}$/.test(region)) return region.toUpperCase()
  }

  const lang = parts[0]?.toLowerCase()
  const langDefaults: Record<string, string> = {
    de: 'DE',
    fr: 'FR',
    es: 'ES',
    en: 'GB',
  }
  return langDefaults[lang ?? ''] ?? null
}

export function detectBrowserCountry(): string | null {
  if (typeof navigator === 'undefined') return null
  const locales = [navigator.language, ...(navigator.languages ?? [])]
  for (const locale of locales) {
    const country = countryFromLocale(locale)
    if (country) return country
  }
  return null
}

export function allowsPatientMetadata(tier: PrivacyTier): boolean {
  return tier !== 'disabled'
}

export function allowsPublicKeyRegistration(tier: PrivacyTier): boolean {
  return tier === 'full'
}

/** Encrypted workspace snapshots may be stored server-side (ciphertext only). */
export function allowsWorkspaceDbSnapshot(tier: PrivacyTier): boolean {
  return tier === 'full'
}

/** Local encrypted workspace export/import is available regardless of patient-field tier. */
export function allowsWorkspaceVault(_tier: PrivacyTier): boolean {
  return true
}
