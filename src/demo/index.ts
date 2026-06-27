export {
  DEMO_CASE_ID,
  DEMO_CASE_ID_EN,
  DEMO_CASE_ID_DE,
  DEMO_PATIENT_ID,
  DEMO_PATIENT_ID_EN,
  DEMO_PATIENT_ID_DE,
  DEMO_SEED_VERSION,
  DEMO_FIXTURE_VERSION,
  demoUserStateKey,
  demoCaseIdForLocale,
  demoPatientIdForLocale,
  demoPatientIdentityForLocale,
  demoLocaleForCaseId,
  isDemoCaseId,
  allDemoCaseIds,
  LEGACY_DEMO_CASE_ID,
} from './constants'
export type {
  DemoPatientFixture,
  DemoUserState,
  DemoValidationResult,
  DemoQaModuleResult,
  DemoSeedCounts,
} from './types'
export { loadDemoFixture, loadDemoFixtureFresh, resetDemoFixtureCache, getCanonicalDemoVersion, setCanonicalDemoFixture, clearCanonicalDemoFixture } from './loadDemoFixture'
export { buildDemoPatientFixture } from './buildDemoFixture'
export { validateDemoFixture } from './validateDemoFixture'
export { seedDemoPatient } from './seedDemoPatient'
export { exportDemoFixtureFromLocal } from './exportDemoFixture'
export { fetchAndApplyCanonicalDemoFixture, resetCanonicalDemoFetchCache } from './syncCanonicalDemoFixture'
export {
  compareDemoSeedVersions,
  nextDemoSeedVersion,
  getEffectiveDemoSeedVersion,
  isDemoSeedVersionOutdated,
} from './demoVersion'
export {
  ensureDemoPatientExists,
  resetDemoPatient,
  removeDemoPatient,
  archiveDemoPatient,
  restoreDemoPatient,
} from './ensureDemoPatient'
export { uiLanguageToDemoLocale, type DemoLocale, DEMO_LOCALES } from './demoLocale'
export { getDemoContent } from './demoContent'
export {
  isDemoCase,
  isDemoCaseReadOnly,
  isDemoPublisherUserEmail,
  demoCaseLabel,
  demoPatientDisplayName,
  demoCaseIdForCurrentUi,
  isLegacyDemoCaseId,
  allKnownDemoCaseIds,
} from './demoReadOnly'
export { runDemoQaChecklist } from './demoQaChecklist'
export {
  loadDemoUserState,
  saveDemoUserState,
  isDemoArchivedForUser,
  isDemoRemovedForUser,
  shouldAutoInstallDemo,
} from './demoUserState'
export { clearDemoCaseStorage } from './clearDemoCaseStorage'
export { isClinicalIntelligenceAvailableForCase } from './demoFeatureFlags'
