/**
 * Clinical Intelligence — CI-local UI translation helpers.
 *
 * Why this exists: the CI panel chrome already routes through `useTranslation()`,
 * but several *rendered* strings were derived from run/catalog DATA that is not
 * locale-aware at render time:
 *   - dimension names (`finding.dimensionName`) and mechanism labels
 *     (`hypothesis.label`) come from the run payload; in the pre-baked demo run
 *     they are English (built from the catalog `nameEn`/`labelEn`), so CI showed
 *     English regardless of the app language.
 *   - the dimension/mechanism catalog browser lists rendered the German-only
 *     `nameDe`/`labelDe`.
 *   - the clinician-review audit trail rendered a hard-coded English action map.
 *
 * Fix: map the stable enum id (dimension id / mechanism id / band / audit
 * action) to a localized label *at render time*. Dimension/mechanism/band labels
 * resolve through the shared `uiTranslations` i18n keys that the catalog already
 * declares (`nameI18nKey` / `labelI18nKey`) — we read those keys, we never store
 * localized text in the run data. Audit-action labels live here as a typed
 * locale map (they had no i18n entry before).
 *
 * Follows the `medicationUiTranslations.ts` helper pattern: small typed helpers
 * that take `(id, language)` and return the localized string.
 */

import { translateUi, type UiTranslationKey } from './uiTranslations'
import {
  getClinicalIntelligenceDimension,
  type ClinicalIntelligenceDimension,
} from './clinicalIntelligence/dimensions'
import { getClinicalIntelligenceMechanism } from './clinicalIntelligence/mechanisms'
import { discussSectionLabel } from '../utils/discussCase/chromeI18n'
import type { DiscussPackageSectionKey } from '../types/discussCase'
import type { UiLanguage } from '../types/settings'
import type {
  CiAuditAction,
  ClinicalIntelligenceDimensionId,
  ClinicalIntelligenceMechanismId,
  CompactEvidenceItem,
} from '../types/clinicalIntelligence'

type LocaleMap = Record<UiLanguage, string>

/** Loose UI grouping for the 27 dimensions (band headers). */
export type ClinicalIntelligenceBand = ClinicalIntelligenceDimension['band']

/** Band → shared i18n key (the same keys the graph already uses for headers). */
const BAND_LABEL_KEY: Record<ClinicalIntelligenceBand, UiTranslationKey> = {
  cognition: 'ciBandCognition',
  psychosis: 'ciBandPsychosis',
  mood: 'ciBandMood',
  'anxiety-trauma': 'ciBandAnxietyTrauma',
  somatic: 'ciBandSomatic',
  behavior: 'ciBandBehavior',
  context: 'ciBandContext',
}

/**
 * Audit-trail action labels. These previously lived as a hard-coded English map
 * inside `ClinicianReviewCard`. German is the primary clinical locale.
 */
const auditActionLabels: Record<CiAuditAction, LocaleMap> = {
  'run-started': {
    de: 'Analyse gestartet',
    en: 'Run started',
    fr: 'Analyse démarrée',
    es: 'Análisis iniciado',
  },
  'run-completed': {
    de: 'Analyse abgeschlossen',
    en: 'Run completed',
    fr: 'Analyse terminée',
    es: 'Análisis completado',
  },
  'run-failed': {
    de: 'Analyse fehlgeschlagen',
    en: 'Run failed',
    fr: 'Échec de l’analyse',
    es: 'Análisis fallido',
  },
  'dimension-accepted': {
    de: 'Dimension akzeptiert',
    en: 'Dimension accepted',
    fr: 'Dimension acceptée',
    es: 'Dimensión aceptada',
  },
  'dimension-edited': {
    de: 'Dimension bearbeitet',
    en: 'Dimension edited',
    fr: 'Dimension modifiée',
    es: 'Dimensión editada',
  },
  'dimension-rejected': {
    de: 'Dimension verworfen',
    en: 'Dimension rejected',
    fr: 'Dimension rejetée',
    es: 'Dimensión rechazada',
  },
  'dimension-bulk-accepted': {
    de: 'Dimensionen gesammelt akzeptiert',
    en: 'Dimensions bulk-accepted',
    fr: 'Dimensions acceptées en lot',
    es: 'Dimensiones aceptadas en lote',
  },
  'mechanism-accepted': {
    de: 'Mechanismus akzeptiert',
    en: 'Mechanism accepted',
    fr: 'Mécanisme accepté',
    es: 'Mecanismo aceptado',
  },
  'mechanism-edited': {
    de: 'Mechanismus bearbeitet',
    en: 'Mechanism edited',
    fr: 'Mécanisme modifié',
    es: 'Mecanismo editado',
  },
  'mechanism-rejected': {
    de: 'Mechanismus verworfen',
    en: 'Mechanism rejected',
    fr: 'Mécanisme rejeté',
    es: 'Mecanismo rechazado',
  },
  'mechanism-bulk-accepted': {
    de: 'Mechanismen gesammelt akzeptiert',
    en: 'Mechanisms bulk-accepted',
    fr: 'Mécanismes acceptés en lot',
    es: 'Mecanismos aceptados en lote',
  },
  'evidence-base-missing': {
    de: 'Evidenzbasis fehlt',
    en: 'Evidence base missing',
    fr: 'Base de preuves manquante',
    es: 'Base de evidencia ausente',
  },
  'clinician-comment-saved': {
    de: 'Kommentar gespeichert',
    en: 'Clinician comment saved',
    fr: 'Commentaire enregistré',
    es: 'Comentario guardado',
  },
  'accepted-findings-saved': {
    de: 'Akzeptierte Befunde gespeichert',
    en: 'Accepted findings saved',
    fr: 'Résultats acceptés enregistrés',
    es: 'Hallazgos aceptados guardados',
  },
}

/** Typed keys for CI-local (non-shared) translation tables. */
export type ClinicalIntelligenceLocalKey = CiAuditAction

/**
 * Generic CI-local lookup, mirroring `translateMedicationUi`. Currently backs
 * the audit-action labels; new CI-only strings can be added to the local maps
 * above and resolved through here.
 */
export function translateClinicalIntelligence(
  key: ClinicalIntelligenceLocalKey,
  language: UiLanguage,
): string {
  return auditActionLabels[key][language]
}

/** Localized dimension name, resolved from the catalog i18n key at render time. */
export function getCiDimensionLabel(
  dimensionId: ClinicalIntelligenceDimensionId,
  language: UiLanguage,
): string {
  return translateUi(language, getClinicalIntelligenceDimension(dimensionId).nameI18nKey)
}

/** Localized mechanism label, resolved from the catalog i18n key at render time. */
export function getCiMechanismLabel(
  mechanismId: ClinicalIntelligenceMechanismId,
  language: UiLanguage,
): string {
  return translateUi(language, getClinicalIntelligenceMechanism(mechanismId).labelI18nKey)
}

/** Localized band header label. */
export function getCiBandLabel(
  band: ClinicalIntelligenceBand,
  language: UiLanguage,
): string {
  return translateUi(language, BAND_LABEL_KEY[band])
}

/** Localized clinician-review audit-trail action label. */
export function getCiAuditActionLabel(
  action: CiAuditAction,
  language: UiLanguage,
): string {
  return translateClinicalIntelligence(action, language)
}

const DISCUSS_PACKAGE_SECTION_KEYS = new Set<DiscussPackageSectionKey>([
  'diagnosis',
  'anamnesis',
  'therapie-verlauf',
  'investigations',
  'current-therapy',
  'medication',
  'side-effects',
  'risk',
  'documents',
])

/** Notion document types referenced as compact-evidence ids in demo CI data. */
const DOCUMENT_EVIDENCE_LABEL_KEYS: Record<string, UiTranslationKey> = {
  aufnahme: 'notionPageAufnahme',
  verlauf: 'notionPageVerlauf',
  medikation: 'notionPageMedikation',
  labor: 'notionPageLabor',
}

function isDiscussPackageSectionKey(id: string): id is DiscussPackageSectionKey {
  return DISCUSS_PACKAGE_SECTION_KEYS.has(id as DiscussPackageSectionKey)
}

/**
 * Localized label for a compact-evidence item id referenced in CI findings.
 * Resolves discuss-package section keys and common document-type ids; falls back
 * to the evidence item label or the raw id.
 */
export function getCiEvidenceSourceLabel(
  evidenceId: string,
  language: UiLanguage,
  evidenceItems?: readonly CompactEvidenceItem[],
): string {
  const trimmed = evidenceId.trim()
  if (!trimmed) return ''

  if (isDiscussPackageSectionKey(trimmed)) {
    return discussSectionLabel(language, trimmed)
  }

  const documentKey = DOCUMENT_EVIDENCE_LABEL_KEYS[trimmed]
  if (documentKey) {
    return translateUi(language, documentKey)
  }

  const baseId = trimmed.split(':')[0] ?? trimmed
  if (baseId !== trimmed) {
    const compoundLabel = getCiEvidenceSourceLabel(baseId, language, evidenceItems)
    if (compoundLabel !== baseId) return compoundLabel
  }

  const item = evidenceItems?.find((entry) => entry.id === trimmed)
  if (item?.label?.trim()) {
    return item.label.trim()
  }

  return trimmed
}

/** Comma-separated localized evidence source labels for display lists. */
export function formatCiEvidenceSourceList(
  evidenceIds: readonly string[],
  language: UiLanguage,
  evidenceItems?: readonly CompactEvidenceItem[],
): string {
  return evidenceIds
    .map((id) => getCiEvidenceSourceLabel(id, language, evidenceItems))
    .filter(Boolean)
    .join(', ')
}
