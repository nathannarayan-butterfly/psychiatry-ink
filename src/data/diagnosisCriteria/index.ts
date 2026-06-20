/**
 * Butterfly criteria registry — public entry point.
 *
 * Versioned, licensing-safe, clinician-reviewable operationalized references.
 * See {@link ./schema} for the licensing approach (original wording + sourceRef
 * citations; DSM kept as code/label crosswalk only). All records ship as
 * `status: 'draft'` until reviewed.
 */

export {
  DIAGNOSIS_CRITERIA_VERSION,
  BUTTERFLY_PROFILE_ID,
  DISORDER_CRITERIA,
  getDisorderById,
} from './registry'

export * from './schema'
export * from './match'
export * from './version'
export * from './i18n'
