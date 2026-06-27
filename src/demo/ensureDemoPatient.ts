import { clearDemoCaseStorage } from './clearDemoCaseStorage'
import { DEMO_CASE_ID, DEMO_SEED_VERSION } from './constants'
import { isDemoSeedDataComplete } from './demoDataIntegrity'
import { isDemoSeedVersionOutdated } from './demoVersion'
import { patchDemoUserState } from './demoUserState'
import { fetchAndApplyCanonicalDemoFixture } from './syncCanonicalDemoFixture'
import { ensureDemoClinicalIntelligenceForCase } from './ensureDemoClinicalIntelligence'
import { seedDemoPatient, type SeedDemoPatientOptions } from './seedDemoPatient'
import { getCaseMeta, replaceRegistryMap } from '../hooks/useCaseRegistry'
import { loadRegistryMapFromStorage, saveRegistryMapToStorage } from '../utils/caseRegistryStorage'
import { normalizeDemoLocale, uiLanguageToDemoLocale } from './demoLocale'
import { loadStoredUiLanguage } from '../utils/clinicalLanguage'

export interface ResetDemoPatientOptions extends SeedDemoPatientOptions {}

export async function resetDemoPatient(options: ResetDemoPatientOptions) {
  await clearDemoCaseStorage(DEMO_CASE_ID)
  return seedDemoPatient({ ...options, force: true })
}

export async function removeDemoPatient(userId: string): Promise<void> {
  await clearDemoCaseStorage(DEMO_CASE_ID)
  const meta = getCaseMeta(DEMO_CASE_ID)
  if (meta?.isDemoPatient) {
    const map = loadRegistryMapFromStorage()
    delete map[DEMO_CASE_ID]
    saveRegistryMapToStorage(map)
    replaceRegistryMap(map)
  }
  patchDemoUserState(userId, {
    status: 'removed',
    seedVersion: DEMO_SEED_VERSION,
    removedAt: new Date().toISOString(),
  })
}

export function archiveDemoPatient(userId: string): void {
  patchDemoUserState(userId, {
    status: 'archived',
    seedVersion: DEMO_SEED_VERSION,
    archivedAt: new Date().toISOString(),
  })
}

export function restoreDemoPatient(userId: string): void {
  patchDemoUserState(userId, {
    status: 'installed',
    seedVersion: DEMO_SEED_VERSION,
    archivedAt: undefined,
    removedAt: undefined,
  })
}

export async function ensureDemoPatientExists(
  options: SeedDemoPatientOptions,
): Promise<{ seeded: boolean; skippedReason?: string }> {
  // Synthetic demo case is authored in German only — skip auto-install for non-DE UI locales.
  const targetLocale = options.locale ?? uiLanguageToDemoLocale(loadStoredUiLanguage())
  if (targetLocale !== 'de') {
    return { seeded: false, skippedReason: 'locale_not_de' }
  }

  await fetchAndApplyCanonicalDemoFixture()

  const { loadDemoUserState, shouldAutoInstallDemo } = await import('./demoUserState')
  const state = loadDemoUserState(options.userId)

  if (state.status === 'archived') {
    return { seeded: false, skippedReason: 'archived' }
  }
  if (state.status === 'removed') {
    return { seeded: false, skippedReason: 'removed' }
  }

  const meta = getCaseMeta(DEMO_CASE_ID)
  const localVersion = state.seedVersion || meta?.demoSeedVersion || ''
  const outdated = isDemoSeedVersionOutdated(localVersion)
  const localeOutdated = normalizeDemoLocale(state.locale, targetLocale) !== targetLocale

  // The demo's diagnoses + document snapshots are encrypted-at-rest; decrypt them into their
  // synchronous shadows before the completeness check so a previously-seeded demo is not
  // falsely seen as incomplete (which would trigger an unnecessary reseed on every load).
  const { hydrateLocalClinicalCaches } = await import('../utils/clinicalCacheHydration')
  await hydrateLocalClinicalCaches(DEMO_CASE_ID)
  ensureDemoClinicalIntelligenceForCase(DEMO_CASE_ID)
  const incomplete = !isDemoSeedDataComplete(DEMO_CASE_ID)

  if (
    meta?.isDemoPatient &&
    state.status === 'installed' &&
    !outdated &&
    !incomplete &&
    !localeOutdated
  ) {
    return { seeded: false, skippedReason: 'already_installed' }
  }

  if (
    !shouldAutoInstallDemo(options.userId) &&
    meta?.isDemoPatient &&
    !outdated &&
    !incomplete &&
    !localeOutdated
  ) {
    return { seeded: false, skippedReason: 'already_present' }
  }

  const result = await seedDemoPatient({
    ...options,
    locale: targetLocale,
    force: outdated || incomplete || localeOutdated || !meta?.isDemoPatient,
  })
  return { seeded: result.ok }
}
