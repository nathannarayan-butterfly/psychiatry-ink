/**
 * Persistence layer — writes ACCEPTED import candidates into the correct clinical
 * module and stamps provenance on every created item.
 *
 * This is the ONLY place in the import pipeline that mutates the patient record,
 * and it runs exclusively on candidates the clinician has explicitly accepted in
 * the review screen. Parser adapters never call into here.
 *
 * Each accepted candidate is routed by `module` to the module's own save API
 * (the same APIs the manual UI uses), then a provenance record is appended to the
 * ledger keyed by the created entity's id.
 */
import type { UiLanguage } from '../../types/settings'
import type {
  ClinicalImportCandidate,
  ClinicalImportEnvelope,
  ImportProvenance,
} from '../../schemas/documentImport/envelope'
import { appendDokument, type DokumentEntry } from '../dokumenteArchive'
import { appendVerlaufEntry } from '../verlaufFeed'
import { loadDiagnosen, saveDiagnosen, type DiagnoseEntry } from '../diagnosenArchive'
import { addBefund, type LaborBefund, type LaborValue } from '../laborArchive'
import { getOrCreateMedicationPlanState, saveMedicationPlanState } from '../medication/storage'
import {
  addMedicationToPlan,
  createDefaultMedicationDraft,
  type MedicationDraft,
} from '../medication/planOps'
import type { MedicationFormulation, MedicationStatus } from '../../types/medicationPlan'
import { appendProvenance } from './provenanceLedger'

export interface PersistParams {
  caseId: string
  envelope: ClinicalImportEnvelope
  /** Candidates the clinician accepted (possibly edited copies of envelope candidates). */
  acceptedCandidates: ClinicalImportCandidate[]
  /** Display name / id of the accepting clinician (audit). */
  acceptedBy: string
  language: UiLanguage
  /** Injectable clock for deterministic tests. */
  now?: () => string
}

export interface PersistedItem {
  candidateId: string
  module: ClinicalImportCandidate['module']
  targetEntityId: string
}

export interface PersistResult {
  persisted: PersistedItem[]
  errors: { candidateId: string; message: string }[]
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const FORMULATION_MAP: Record<string, MedicationFormulation> = {
  tablet: 'tablet',
  tablette: 'tablet',
  tabletten: 'tablet',
  tbl: 'tablet',
  solution: 'solution',
  loesung: 'solution',
  lösung: 'solution',
  drops: 'drops',
  tropfen: 'drops',
  depot: 'depot',
  injection: 'injection',
  injektion: 'injection',
  capsule: 'capsule',
  kapsel: 'capsule',
  patch: 'patch',
  pflaster: 'patch',
}

function mapFormulation(value?: string): MedicationFormulation {
  if (!value) return 'tablet'
  return FORMULATION_MAP[value.trim().toLowerCase()] ?? 'other'
}

const STATUS_VALUES: MedicationStatus[] = ['active', 'paused', 'reduced', 'increased', 'discontinued']
function mapStatus(value?: string): MedicationStatus {
  const v = value?.trim().toLowerCase()
  return (STATUS_VALUES as string[]).includes(v ?? '') ? (v as MedicationStatus) : 'active'
}

function toLaborValue(v: { name: string; value: string; unit?: string; refText?: string }): LaborValue {
  const numeric = Number.parseFloat(v.value.replace(',', '.'))
  return {
    name: v.name,
    value: v.value,
    numericValue: Number.isFinite(numeric) ? numeric : undefined,
    unit: v.unit ?? '',
    refText: v.refText,
  }
}

/**
 * Persist all accepted candidates. Failures on a single candidate are collected
 * (so one bad row never blocks the rest) and returned in `errors`.
 */
export function persistAcceptedCandidates(params: PersistParams): PersistResult {
  const { caseId, envelope, acceptedCandidates, acceptedBy } = params
  const nowFn = params.now ?? (() => new Date().toISOString())
  const persisted: PersistedItem[] = []
  const errors: { candidateId: string; message: string }[] = []

  for (const candidate of acceptedCandidates) {
    const provenanceId = genId()
    try {
      const targetEntityId = persistOne(params, candidate, provenanceId, nowFn, mapStatus)
      const provenance = buildProvenance(envelope, candidate, acceptedBy, nowFn())
      appendProvenance(caseId, { ...provenance, targetEntityId })
      persisted.push({ candidateId: candidate.id, module: candidate.module, targetEntityId })
    } catch (error) {
      errors.push({
        candidateId: candidate.id,
        message: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
      })
    }
  }

  return { persisted, errors }
}

function persistOne(
  params: PersistParams,
  candidate: ClinicalImportCandidate,
  provenanceId: string,
  nowFn: () => string,
  statusMapper: (v?: string) => MedicationStatus,
): string {
  const { caseId, language } = params
  const now = nowFn()

  switch (candidate.module) {
    case 'anamnese': {
      const { sectionId, title, text } = candidate.data
      const entry = appendDokument(caseId, {
        category: 'anamnese',
        title,
        content: text,
        date: now,
        source: 'manual',
        pageType: sectionId ? `import-anamnese:${sectionId}` : 'aufnahme',
        sectionContents: sectionId ? { [sectionId]: text } : undefined,
        importProvenanceId: provenanceId,
      })
      return entry.id
    }
    case 'verlauf': {
      const entry = appendVerlaufEntry(caseId, {
        date: candidate.data.date ?? now,
        content: candidate.data.text,
        pageType: 'verlauf',
        sectionLabel: candidate.data.sectionLabel,
        source: 'manual',
      })
      return entry.id
    }
    case 'risk': {
      const entry = appendVerlaufEntry(caseId, {
        date: now,
        content: candidate.data.text,
        pageType: 'verlauf',
        sectionLabel: candidate.data.category ?? 'Risiko',
        source: 'manual',
      })
      return entry.id
    }
    case 'therapy': {
      const body = candidate.data.title
        ? `${candidate.data.title}\n${candidate.data.text}`
        : candidate.data.text
      const entry = appendVerlaufEntry(caseId, {
        date: candidate.data.date ?? now,
        content: body,
        pageType: 'therapie-verlauf',
        sectionLabel: candidate.data.title,
        source: 'manual',
      })
      return entry.id
    }
    case 'investigation': {
      const entry = appendDokument(caseId, {
        category: 'untersuchungsbefunde',
        title: candidate.data.title,
        content: candidate.data.text,
        date: now,
        source: 'manual',
        pageType: 'import-investigation',
        importProvenanceId: provenanceId,
      })
      return entry.id
    }
    case 'diagnosis': {
      const existing = loadDiagnosen(caseId)
      const entry: DiagnoseEntry = {
        id: genId(),
        icd10: {
          code: candidate.data.icd10Code ?? '',
          label: candidate.data.label,
          overridden: !candidate.data.icd10Code,
        },
        icd11: { code: candidate.data.icd11Code ?? '', label: '', overridden: false },
        dsm: { code: candidate.data.dsmCode ?? '', label: '', overridden: false },
        createdAt: now,
        updatedAt: now,
      }
      saveDiagnosen(caseId, [...existing, entry])
      return entry.id
    }
    case 'medication': {
      const state = getOrCreateMedicationPlanState(caseId)
      const planId = state.currentPlanId ?? state.plans[0]?.id
      if (!planId) throw new Error('Kein aktiver Medikationsplan')
      const beforeIds = new Set(planMedicationIds(state, planId))
      const draft: MedicationDraft = {
        ...createDefaultMedicationDraft(),
        substance: candidate.data.substance,
        strength: candidate.data.strength ?? '',
        formulation: mapFormulation(candidate.data.formulation),
        indication: candidate.data.indication ?? '',
        status: statusMapper(candidate.data.status),
        startDate: candidate.data.startDate || createDefaultMedicationDraft().startDate,
        freeTextLine: candidate.data.doseText ?? '',
      }
      const nextState = addMedicationToPlan(state, planId, draft, language)
      saveMedicationPlanState(nextState, caseId)
      const addedId = planMedicationIds(nextState, planId).find((id) => !beforeIds.has(id))
      if (!addedId) throw new Error('Medikament konnte nicht hinzugefügt werden')
      return addedId
    }
    case 'lab': {
      const befund: LaborBefund = {
        id: genId(),
        caseId,
        date: candidate.data.date ?? now,
        rawText: candidate.rawText ?? '',
        categories: [
          {
            id: genId(),
            label: candidate.data.panelLabel ?? 'Labor',
            values: candidate.data.values.map(toLaborValue),
          },
        ],
        createdAt: now,
        label: candidate.data.panelLabel,
      }
      addBefund(caseId, befund)
      return befund.id
    }
    case 'document':
    default: {
      const entry: Omit<DokumentEntry, 'id' | 'caseId'> = {
        category: 'externe-befunde',
        title: candidate.data.title,
        content: candidate.data.text,
        date: now,
        source: 'manual',
        pageType: candidate.data.attachment ? 'import-attachment' : 'import-document',
        importProvenanceId: provenanceId,
        ...(candidate.data.attachment
          ? { attachment: candidate.data.attachment, parsingMode: 'stored_only' as const }
          : {}),
      }
      return appendDokument(caseId, entry).id
    }
  }
}

function planMedicationIds(
  state: ReturnType<typeof getOrCreateMedicationPlanState>,
  planId: string,
): string[] {
  const plan = state.plans.find((p) => p.id === planId)
  return plan ? plan.medications.map((m) => m.id) : []
}

function buildProvenance(
  envelope: ClinicalImportEnvelope,
  candidate: ClinicalImportCandidate,
  acceptedBy: string,
  acceptedAt: string,
): ImportProvenance {
  return {
    sourceDocumentId: envelope.sourceDocumentId,
    filename: envelope.source.filename,
    parserVersion: envelope.parserVersion,
    detectedFormat: envelope.source.detectedFormat,
    candidateId: candidate.id,
    module: candidate.module,
    originalSection: candidate.sourceLocation.section,
    originalSheet: candidate.sourceLocation.sheet,
    originalRow: candidate.sourceLocation.row,
    originalLineNumber: candidate.sourceLocation.lineNumber,
    originalPath: candidate.sourceLocation.path,
    importedAt: envelope.source.importedAt,
    acceptedBy,
    acceptedAt,
    aiSuggested: candidate.aiSuggested ?? false,
  }
}
