import { clearDemoCaseStorage } from './clearDemoCaseStorage'
import {
  DEMO_SEED_VERSION,
  allDemoCaseIds,
  demoCaseIdForLocale,
  LEGACY_DEMO_CASE_ID,
} from './constants'
import { isDemoSeedDataComplete } from './demoDataIntegrity'
import { isDemoSeedVersionOutdated } from './demoVersion'
import { patchDemoUserState } from './demoUserState'
import { fetchAndApplyCanonicalDemoFixture } from './syncCanonicalDemoFixture'
import { ensureDemoClinicalIntelligenceForCase } from './ensureDemoClinicalIntelligence'
import { seedDemoPatient, type SeedDemoPatientOptions } from './seedDemoPatient'
import { getCaseMeta, replaceRegistryMap } from '../hooks/useCaseRegistry'
import { loadRegistryMapFromStorage, saveRegistryMapToStorage } from '../utils/caseRegistryStorage'
import { normalizeDemoLocale, uiLanguageToDemoLocale, type DemoLocale } from './demoLocale'
import { loadStoredUiLanguage } from '../utils/clinicalLanguage'

export interface ResetDemoPatientOptions extends SeedDemoPatientOptions {}

function resolveTargetLocale(options: SeedDemoPatientOptions): DemoLocale {
  return options.locale ?? uiLanguageToDemoLocale(loadStoredUiLanguage())
}

async function purgeLegacyDemo(): Promise<void> {
  const map = loadRegistryMapFromStorage()
  if (map[LEGACY_DEMO_CASE_ID]) {
    delete map[LEGACY_DEMO_CASE_ID]
    saveRegistryMapToStorage(map)
    replaceRegistryMap(map)
  }
  await clearDemoCaseStorage(LEGACY_DEMO_CASE_ID)
}

export async function resetDemoPatient(options: ResetDemoPatientOptions) {
  const locale = resolveTargetLocale(options)
  const caseId = demoCaseIdForLocale(locale)
  await clearDemoCaseStorage(caseId)
  return seedDemoPatient({ ...options, locale, force: true })
}

export async function removeDemoPatient(userId: string): Promise<void> {
  for (const caseId of allDemoCaseIds()) {
    await clearDemoCaseStorage(caseId)
  }
  await clearDemoCaseStorage(LEGACY_DEMO_CASE_ID)

  const map = loadRegistryMapFromStorage()
  let changed = false
  for (const caseId of [...allDemoCaseIds(), LEGACY_DEMO_CASE_ID]) {
    if (getCaseMeta(caseId)?.isDemoPatient || map[caseId]) {
      delete map[caseId]
      changed = true
    }
  }
  if (changed) {
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
  const targetLocale = resolveTargetLocale(options)
  const targetCaseId = demoCaseIdForLocale(targetLocale)

  await purgeLegacyDemo()
  await fetchAndApplyCanonicalDemoFixture({ locale: targetLocale })

  const { loadDemoUserState, shouldAutoInstallDemo } = await import('./demoUserState')
  const state = loadDemoUserState(options.userId)

  if (state.status === 'archived') {
    return { seeded: false, skippedReason: 'archived' }
  }
  if (state.status === 'removed') {
    return { seeded: false, skippedReason: 'removed' }
  }

  const meta = getCaseMeta(targetCaseId)
  const localVersion = state.seedVersion || meta?.demoSeedVersion || ''
  const outdated = isDemoSeedVersionOutdated(localVersion, targetLocale)
  const localeOutdated = normalizeDemoLocale(state.locale, targetLocale) !== targetLocale

  const { hydrateLocalClinicalCaches } = await import('../utils/clinicalCacheHydration')
  await hydrateLocalClinicalCaches(targetCaseId)
  ensureDemoClinicalIntelligenceForCase(targetCaseId)
  const incomplete = !isDemoSeedDataComplete(targetCaseId)

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
