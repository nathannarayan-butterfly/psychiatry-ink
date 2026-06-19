/**
 * Document Import — `ClinicalImportEnvelope` schema.
 *
 * Every parser adapter (json/jsonl/csv/xlsx/docx/txt/pdf) produces exactly this
 * shape. The envelope is a *pure parse result*: it never touches the patient/case
 * record. Clinical data only enters a chart after a clinician explicitly accepts
 * a candidate in the Import Review screen (see `persistCandidates.ts`).
 *
 * Validation is intentionally lenient on the *content* of each candidate (free
 * text is allowed and expected) but strict on the structural contract, so the
 * review UI and persistence layer can rely on the shape.
 */
import { z } from 'zod'

/** File formats the pipeline can detect and route to a parser adapter. */
export const IMPORT_FORMATS = ['json', 'jsonl', 'csv', 'xlsx', 'docx', 'txt', 'pdf'] as const
export const ImportFormatSchema = z.enum(IMPORT_FORMATS)
export type ImportFormat = z.infer<typeof ImportFormatSchema>

/**
 * Target clinical module a candidate maps into. These align with the persistence
 * targets wired in `persistCandidates.ts`.
 */
export const CANDIDATE_MODULES = [
  'anamnese',
  'verlauf',
  'diagnosis',
  'medication',
  'lab',
  'investigation',
  'therapy',
  'complementaryTherapy',
  'risk',
  'document',
] as const
export const CandidateModuleSchema = z.enum(CANDIDATE_MODULES)
export type CandidateModule = z.infer<typeof CandidateModuleSchema>

export const ParsingModeSchema = z.enum(['structured', 'stored_only'])
export type ParsingMode = z.infer<typeof ParsingModeSchema>

export const ConfidenceSchema = z.enum(['high', 'medium', 'low'])
export type ImportConfidence = z.infer<typeof ConfidenceSchema>

/**
 * Where in the source document a candidate came from. Used both for clinician
 * orientation in the review screen and for the provenance record stamped on
 * accepted items.
 */
export const SourceLocationSchema = z.object({
  /** DOCX/TXT heading or anamnese section id. */
  section: z.string().optional(),
  /** XLSX sheet name. */
  sheet: z.string().optional(),
  /** CSV/XLSX 1-based data row (excluding header). */
  row: z.number().int().nonnegative().optional(),
  /** JSON path / array index, e.g. `diagnoses[2]`. */
  path: z.string().optional(),
  /** JSONL / TXT 1-based line number. */
  lineNumber: z.number().int().nonnegative().optional(),
})
export type ImportSourceLocation = z.infer<typeof SourceLocationSchema>

// ---------------------------------------------------------------------------
// Per-module candidate payloads
// ---------------------------------------------------------------------------

export const AnamneseCandidateDataSchema = z.object({
  /** Optional aufnahme section id (e.g. `suchtanamnese`). */
  sectionId: z.string().optional(),
  title: z.string().min(1),
  text: z.string().min(1),
  /** Merged Aufnahmebefund sections keyed by workspace section id. */
  sectionContents: z.record(z.string(), z.string()).optional(),
})

export const VerlaufCandidateDataSchema = z.object({
  /** ISO date; defaults to import time when omitted. */
  date: z.string().optional(),
  sectionLabel: z.string().optional(),
  text: z.string().min(1),
})

export const DiagnosisCandidateDataSchema = z.object({
  label: z.string().min(1),
  icd10Code: z.string().optional(),
  icd11Code: z.string().optional(),
  dsmCode: z.string().optional(),
})

export const MedicationCandidateDataSchema = z.object({
  substance: z.string().min(1),
  strength: z.string().optional(),
  /** Free-text dose line, e.g. "1-0-1" or "5 mg morgens". */
  doseText: z.string().optional(),
  formulation: z.string().optional(),
  /** Route shorthand when detected (po, im, iv, sc). */
  route: z.string().optional(),
  /** Human-readable frequency, e.g. "täglich", "morgens", "bedarfsweise". */
  frequency: z.string().optional(),
  /** True when PRN / bedarfsweise pattern matched. */
  isPrn: z.boolean().optional(),
  /** Trade/brand name when parsed from a compound line (e.g. OKEDI). */
  displayBrandName: z.string().optional(),
  /** True when depot/LAI heuristics matched (i.m., alle N Tage, …). */
  isDepot: z.boolean().optional(),
  /** Human-readable depot interval, e.g. "alle 28 Tage". */
  depotInterval: z.string().optional(),
  /** Verbatim change snippet from a narrative adjustment sentence. */
  changeContext: z.string().optional(),
  indication: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
})

export const LabValueCandidateSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  refText: z.string().optional(),
})

export const LabCandidateDataSchema = z.object({
  date: z.string().optional(),
  panelLabel: z.string().optional(),
  values: z.array(LabValueCandidateSchema).min(1),
})

export const InvestigationCandidateDataSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  examType: z.string().optional(),
})

export const TherapyCandidateDataSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  date: z.string().optional(),
})

export const ComplementaryTherapyCandidateDataSchema = z.object({
  /** Default list id (e.g. `ergotherapie`) or custom therapy slug. */
  therapyTypeId: z.string().min(1),
  /** ISO date; defaults to import time when omitted. */
  date: z.string().optional(),
  text: z.string().min(1),
})

export const RiskCandidateDataSchema = z.object({
  text: z.string().min(1),
  category: z.string().optional(),
})

export const DocumentCandidateDataSchema = z.object({
  title: z.string().min(1),
  text: z.string().default(''),
  /** Set for PDF / scan candidates that are stored as a binary attachment. */
  attachment: z
    .object({
      /** Key into the encrypted IndexedDB attachment store. */
      storeId: z.string().min(1),
      mimeType: z.string().min(1),
      originalFileName: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
    })
    .optional(),
})

// ---------------------------------------------------------------------------
// Candidate (discriminated union on `module`)
// ---------------------------------------------------------------------------

/**
 * A point that needs clinician clarification before the candidate is trustworthy
 * (uncertain date association, uncertain patient-name match, low-confidence
 * mapping). Surfaced in the review screen as a "Klärung erforderlich" badge; the
 * clinician resolves it (e.g. fills the date) before saving.
 */
export const ImportClarificationSchema = z.object({
  /** Which field is in question, e.g. 'date' | 'module' | 'patientName'. */
  field: z.string().min(1),
  /** Machine code so the UI can branch / auto-resolve. */
  code: z.string().min(1),
  /** Localized, human-readable explanation. */
  message: z.string().min(1),
})
export type ImportClarification = z.infer<typeof ImportClarificationSchema>

const CandidateBase = {
  id: z.string().min(1),
  confidence: ConfidenceSchema,
  sourceLocation: SourceLocationSchema,
  /** Verbatim source snippet, kept for clinician verification in the review UI. */
  rawText: z.string().optional(),
  /** True when a candidate's mapping was suggested by AI (always needs review). */
  aiSuggested: z.boolean().optional(),
  /** Open questions the clinician must resolve before this candidate is reliable. */
  clarifications: z.array(ImportClarificationSchema).optional(),
}

export const ClinicalImportCandidateSchema = z.discriminatedUnion('module', [
  z.object({ ...CandidateBase, module: z.literal('anamnese'), data: AnamneseCandidateDataSchema }),
  z.object({ ...CandidateBase, module: z.literal('verlauf'), data: VerlaufCandidateDataSchema }),
  z.object({ ...CandidateBase, module: z.literal('diagnosis'), data: DiagnosisCandidateDataSchema }),
  z.object({ ...CandidateBase, module: z.literal('medication'), data: MedicationCandidateDataSchema }),
  z.object({ ...CandidateBase, module: z.literal('lab'), data: LabCandidateDataSchema }),
  z.object({ ...CandidateBase, module: z.literal('investigation'), data: InvestigationCandidateDataSchema }),
  z.object({ ...CandidateBase, module: z.literal('therapy'), data: TherapyCandidateDataSchema }),
  z.object({
    ...CandidateBase,
    module: z.literal('complementaryTherapy'),
    data: ComplementaryTherapyCandidateDataSchema,
  }),
  z.object({ ...CandidateBase, module: z.literal('risk'), data: RiskCandidateDataSchema }),
  z.object({ ...CandidateBase, module: z.literal('document'), data: DocumentCandidateDataSchema }),
])
export type ClinicalImportCandidate = z.infer<typeof ClinicalImportCandidateSchema>

/** Narrowed candidate type for a specific module. */
export type CandidateForModule<M extends CandidateModule> = Extract<
  ClinicalImportCandidate,
  { module: M }
>

// ---------------------------------------------------------------------------
// Notices (non-fatal parser messages surfaced to the clinician)
// ---------------------------------------------------------------------------

export const ImportNoticeSchema = z.object({
  level: z.enum(['info', 'warning', 'error']),
  /** Machine code so the UI can localize / branch. */
  code: z.string().min(1),
  /** Human-readable fallback (already localized at parse time when possible). */
  message: z.string().min(1),
})
export type ImportNotice = z.infer<typeof ImportNoticeSchema>

// ---------------------------------------------------------------------------
// Source metadata
// ---------------------------------------------------------------------------

export const ImportSourceSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string(),
  detectedFormat: ImportFormatSchema,
  sizeBytes: z.number().int().nonnegative(),
  importedAt: z.string().min(1),
  /** XLSX sheet names, when applicable. */
  sheetNames: z.array(z.string()).optional(),
  /** CSV/XLSX detected header columns, when applicable. */
  columns: z.array(z.string()).optional(),
})
export type ImportSource = z.infer<typeof ImportSourceSchema>

// ---------------------------------------------------------------------------
// Extracted patient identity (deterministic; offered for clinician confirmation)
// ---------------------------------------------------------------------------

/**
 * Best-effort patient identity pulled from the document via deterministic label
 * patterns ("Name:", "Patient:", "geb.", "Geburtsdatum:", ISO/DE dates). Never
 * auto-applied — the clinician confirms it before a patient is created, and it
 * feeds the patient-name de-identification step.
 */
export const ExtractedPatientIdentitySchema = z.object({
  vorname: z.string().optional(),
  nachname: z.string().optional(),
  /** Full name as written in the document. */
  name: z.string().optional(),
  /** ISO `YYYY-MM-DD` when the DOB could be parsed. */
  geburtsdatum: z.string().optional(),
  /** Verbatim DOB string as written (kept when not parseable to ISO). */
  geburtsdatumRaw: z.string().optional(),
  confidence: ConfidenceSchema,
  /** Source snippets that produced the match, for clinician verification. */
  evidence: z.array(z.string()),
})
export type ExtractedPatientIdentity = z.infer<typeof ExtractedPatientIdentitySchema>

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export const CLINICAL_IMPORT_ENVELOPE_VERSION = 1

export const ClinicalImportEnvelopeSchema = z.object({
  envelopeVersion: z.literal(CLINICAL_IMPORT_ENVELOPE_VERSION),
  /** Stable id for this import session — becomes `provenance.sourceDocumentId`. */
  sourceDocumentId: z.string().min(1),
  parserVersion: z.string().min(1),
  parsingMode: ParsingModeSchema,
  source: ImportSourceSchema,
  candidates: z.array(ClinicalImportCandidateSchema),
  notices: z.array(ImportNoticeSchema),
  /** Small text preview for the review screen (truncated, never the full file). */
  rawPreview: z.string().optional(),
  /** Deterministically extracted patient identity, when present in the document. */
  patientIdentity: ExtractedPatientIdentitySchema.optional(),
})
export type ClinicalImportEnvelope = z.infer<typeof ClinicalImportEnvelopeSchema>

// ---------------------------------------------------------------------------
// Provenance — stamped on every accepted item (see `provenanceLedger.ts`)
// ---------------------------------------------------------------------------

export const ImportProvenanceSchema = z.object({
  sourceDocumentId: z.string().min(1),
  filename: z.string().min(1),
  parserVersion: z.string().min(1),
  detectedFormat: ImportFormatSchema,
  candidateId: z.string().min(1),
  module: CandidateModuleSchema,
  originalSection: z.string().optional(),
  originalSheet: z.string().optional(),
  originalRow: z.number().int().nonnegative().optional(),
  originalLineNumber: z.number().int().nonnegative().optional(),
  originalPath: z.string().optional(),
  importedAt: z.string().min(1),
  acceptedBy: z.string().min(1),
  acceptedAt: z.string().min(1),
  aiSuggested: z.boolean(),
})
export type ImportProvenance = z.infer<typeof ImportProvenanceSchema>

/** Validate an envelope produced by a parser adapter. Throws on structural drift. */
export function parseClinicalImportEnvelope(value: unknown): ClinicalImportEnvelope {
  return ClinicalImportEnvelopeSchema.parse(value)
}

/** Non-throwing variant for boundaries that handle their own errors. */
export function safeParseClinicalImportEnvelope(value: unknown) {
  return ClinicalImportEnvelopeSchema.safeParse(value)
}
