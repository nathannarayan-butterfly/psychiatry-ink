import type {
  DiagnosisClinicalCategory,
  DiagnosisConfirmationStatus,
  DiagnosisRole,
  DiagnosisStatus,
} from '../types/diagnosisCatalogue'
import type { DiagnoseEntry } from './diagnosenArchive'

export const DIAGNOSIS_CLINICAL_CATEGORIES: readonly DiagnosisClinicalCategory[] = [
  'primary',
  'secondary',
  'differential',
  'suspected',
  'rule_out',
  'historical',
  'remitted',
  'comorbidity',
] as const

export const DIAGNOSIS_CONFIRMATION_STATUSES: readonly DiagnosisConfirmationStatus[] = [
  'confirmed',
  'active',
  'under_review',
  'anamnesis_only',
] as const

const CATEGORY_PRIORITY: Record<DiagnosisClinicalCategory, number> = {
  primary: 0,
  secondary: 1,
  comorbidity: 2,
  suspected: 3,
  differential: 4,
  rule_out: 5,
  remitted: 6,
  historical: 7,
}

/** Resolve unified category from explicit field or legacy role/status. */
export function resolveClinicalCategory(entry: DiagnoseEntry): DiagnosisClinicalCategory {
  if (entry.clinicalCategory) return entry.clinicalCategory

  const status = entry.diagnosisStatus
  if (status === 'differential') return 'differential'
  if (status === 'suspected') return 'suspected'
  if (status === 'rule_out') return 'rule_out'
  if (status === 'historical') return 'historical'
  if (status === 'remitted') return 'remitted'

  const role = entry.diagnosisRole
  if (role === 'comorbidity') return 'comorbidity'
  if (role === 'secondary' || role === 'somatic_secondary') return 'secondary'
  if (role === 'main') return 'primary'

  return 'secondary'
}

/** Resolve confirmation dimension from explicit field or legacy status. */
export function resolveConfirmationStatus(entry: DiagnoseEntry): DiagnosisConfirmationStatus {
  if (entry.confirmationStatus) return entry.confirmationStatus

  const status = entry.diagnosisStatus
  if (status === 'suspected') return 'under_review'
  if (status === 'historical') return 'anamnesis_only'
  if (status === 'remitted') return 'active'
  if (status === 'rule_out' || status === 'differential') return 'under_review'
  return 'confirmed'
}

function categoryToLegacyRole(category: DiagnosisClinicalCategory): DiagnosisRole {
  switch (category) {
    case 'primary':
      return 'main'
    case 'comorbidity':
      return 'comorbidity'
    case 'secondary':
    case 'differential':
    case 'suspected':
    case 'rule_out':
    case 'historical':
    case 'remitted':
      return 'secondary'
    default:
      return 'secondary'
  }
}

function categoryToLegacyStatus(
  category: DiagnosisClinicalCategory,
  confirmation: DiagnosisConfirmationStatus,
): DiagnosisStatus {
  switch (category) {
    case 'differential':
      return 'differential'
    case 'suspected':
      return 'suspected'
    case 'rule_out':
      return 'rule_out'
    case 'historical':
      return 'historical'
    case 'remitted':
      return 'remitted'
    default:
      break
  }

  if (confirmation === 'anamnesis_only') return 'historical'
  if (confirmation === 'under_review') return 'suspected'
  return 'confirmed'
}

/** Sync legacy role/status fields from unified classification (backward compat). */
export function syncLegacyClassificationFields(
  entry: DiagnoseEntry,
  category: DiagnosisClinicalCategory,
  confirmation: DiagnosisConfirmationStatus,
): DiagnoseEntry {
  return {
    ...entry,
    clinicalCategory: category,
    confirmationStatus: confirmation,
    diagnosisRole: categoryToLegacyRole(category),
    diagnosisStatus: categoryToLegacyStatus(category, confirmation),
  }
}

export function inferDefaultCategoryForNewEntry(
  existingEntries: DiagnoseEntry[],
): DiagnosisClinicalCategory {
  const hasPrimary = existingEntries.some((e) => resolveClinicalCategory(e) === 'primary')
  return hasPrimary ? 'secondary' : 'primary'
}

export function inferDefaultConfirmationForCategory(
  category: DiagnosisClinicalCategory,
): DiagnosisConfirmationStatus {
  if (category === 'historical') return 'anamnesis_only'
  if (category === 'suspected' || category === 'differential' || category === 'rule_out') {
    return 'under_review'
  }
  if (category === 'remitted') return 'active'
  return 'confirmed'
}

/** Apply defaults to a single entry (migration / creation). */
export function normalizeDiagnosisClassification(
  entry: DiagnoseEntry,
  index: number,
  _allEntries: DiagnoseEntry[],
): DiagnoseEntry {
  let category = entry.clinicalCategory ?? resolveClinicalCategory(entry)
  let confirmation = entry.confirmationStatus ?? resolveConfirmationStatus(entry)

  if (!entry.clinicalCategory && !entry.diagnosisRole && !entry.diagnosisStatus) {
    category = index === 0 ? 'primary' : 'secondary'
    confirmation = inferDefaultConfirmationForCategory(category)
  }

  return syncLegacyClassificationFields(entry, category, confirmation)
}

/** Sort diagnoses for display: primary first, muted categories last. */
export function sortDiagnosesForDisplay(entries: DiagnoseEntry[]): DiagnoseEntry[] {
  return [...entries].sort((a, b) => {
    const catA = resolveClinicalCategory(a)
    const catB = resolveClinicalCategory(b)
    const pri = CATEGORY_PRIORITY[catA] - CATEGORY_PRIORITY[catB]
    if (pri !== 0) return pri
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function isMutedDiagnosisCategory(category: DiagnosisClinicalCategory): boolean {
  return category === 'historical' || category === 'remitted'
}

export function isProvisionalDiagnosisCategory(category: DiagnosisClinicalCategory): boolean {
  return category === 'differential' || category === 'suspected' || category === 'rule_out'
}

export function isClinicianClassificationLocked(entry: DiagnoseEntry): boolean {
  return Boolean(entry.statusClinicianSetAt)
}

/** Clinician manually sets category — locks from AI overwrite. */
export function applyClinicianCategoryChange(
  entry: DiagnoseEntry,
  category: DiagnosisClinicalCategory,
  clinicianId?: string,
): DiagnoseEntry {
  const confirmation = resolveConfirmationStatus(entry)
  const now = new Date().toISOString()
  return syncLegacyClassificationFields(
    {
      ...entry,
      updatedAt: now,
      statusClinicianSetAt: now,
      ...(clinicianId ? { clinicianId } : {}),
    },
    category,
    confirmation,
  )
}

/** Clinician manually sets confirmation — locks from AI overwrite. */
export function applyClinicianConfirmationChange(
  entry: DiagnoseEntry,
  confirmation: DiagnosisConfirmationStatus,
  clinicianId?: string,
): DiagnoseEntry {
  const category = resolveClinicalCategory(entry)
  const now = new Date().toISOString()
  return syncLegacyClassificationFields(
    {
      ...entry,
      updatedAt: now,
      statusClinicianSetAt: now,
      ...(clinicianId ? { clinicianId } : {}),
    },
    category,
    confirmation,
  )
}

/**
 * Merge external/AI-suggested diagnosis into an existing entry.
 * Preserves clinician-set classification when locked.
 */
export function mergeDiagnosisClassificationFromExternal(
  existing: DiagnoseEntry,
  incoming: Partial<Pick<DiagnoseEntry, 'clinicalCategory' | 'confirmationStatus' | 'diagnosisRole' | 'diagnosisStatus'>>,
): DiagnoseEntry {
  if (isClinicianClassificationLocked(existing)) {
    return existing
  }

  const category =
    incoming.clinicalCategory
    ?? (incoming.diagnosisRole || incoming.diagnosisStatus
      ? resolveClinicalCategory({ ...existing, ...incoming } as DiagnoseEntry)
      : resolveClinicalCategory(existing))

  const confirmation =
    incoming.confirmationStatus
    ?? (incoming.diagnosisStatus
      ? resolveConfirmationStatus({ ...existing, ...incoming } as DiagnoseEntry)
      : resolveConfirmationStatus(existing))

  return syncLegacyClassificationFields(existing, category, confirmation)
}

/** Short chip label key for i18n (see uiTranslations). */
export function categoryTranslationKey(category: DiagnosisClinicalCategory): string {
  const map: Record<DiagnosisClinicalCategory, string> = {
    primary: 'diagnosisCategoryPrimary',
    secondary: 'diagnosisCategorySecondary',
    differential: 'diagnosisCategoryDifferential',
    suspected: 'diagnosisCategorySuspected',
    rule_out: 'diagnosisCategoryRuleOut',
    historical: 'diagnosisCategoryHistorical',
    remitted: 'diagnosisCategoryRemitted',
    comorbidity: 'diagnosisCategoryComorbidity',
  }
  return map[category]
}

export function confirmationTranslationKey(status: DiagnosisConfirmationStatus): string {
  const map: Record<DiagnosisConfirmationStatus, string> = {
    confirmed: 'diagnosisConfirmationConfirmed',
    active: 'diagnosisConfirmationActive',
    under_review: 'diagnosisConfirmationUnderReview',
    anamnesis_only: 'diagnosisConfirmationAnamnesisOnly',
  }
  return map[status]
}

export type DiagnosisChipTone = 'primary' | 'provisional' | 'muted' | 'neutral'

export function categoryChipTone(category: DiagnosisClinicalCategory): DiagnosisChipTone {
  if (category === 'primary') return 'primary'
  if (isMutedDiagnosisCategory(category)) return 'muted'
  if (isProvisionalDiagnosisCategory(category)) return 'provisional'
  return 'neutral'
}

export function confirmationChipTone(status: DiagnosisConfirmationStatus): DiagnosisChipTone {
  if (status === 'anamnesis_only') return 'muted'
  if (status === 'under_review') return 'provisional'
  if (status === 'active') return 'neutral'
  return 'neutral'
}
