/**
 * Clinical Vorlage (template) builder — versioned structured JSON model.
 *
 * Templates are stored as structured JSON (NEVER raw HTML). The same JSON drives
 * the builder canvas, the patient/demo preview, and print/export — all through
 * the React `ClinicalDocumentRenderer`.
 *
 * Schema version history:
 *  - 1: legacy `documentTemplate` field-list model (separate system, untouched).
 *  - 2: clinical block model (this file).
 *  - 3: per-block layout (height / width / align) + rich-text HTML on text blocks.
 *       Fully backward compatible — every new field is optional and defaults are
 *       applied at render time, so v2 templates keep loading unchanged.
 *  - 4: optional document `header` / `footer` bands (rich text + placeholder
 *       tokens) rendered at the top/bottom of the A4 page. Optional, so v3
 *       templates keep loading unchanged.
 *  - 5: header/footer enhancements — band logo image (base64 data URL), fixed
 *       band height, page-number tokens (`{{page}}` / `{{pages}}`), and
 *       per-document `pageSettings` (first-page-only display + a distinct
 *       first-page header/footer via `headerFirst` / `footerFirst`). All new
 *       fields are optional with sane defaults, so v4 templates keep loading
 *       unchanged.
 */

export const CLINICAL_TEMPLATE_SCHEMA_VERSION = 5 as const

export type BlockType =
  | 'heading'
  | 'text'
  | 'input'
  | 'table'
  | 'diagnosis'
  | 'medication'
  | 'laboratory'
  | 'psychopathology'
  | 'risk'
  | 'verlauf_summary'
  | 'anamnese'
  | 'therapy'
  | 'social_therapy'
  | 'patient_data'
  | 'institution'
  | 'signature'
  | 'ai_section'
  | 'conditional'

/**
 * Clinical-source bindings — each maps to a real patient/case data domain.
 * Resolved by `resolveClinicalData` (real data when a case is present, demo
 * data in the demo preview, safe empty fallback otherwise).
 */
export type ClinicalBinding =
  | 'patient.demographics'
  | 'case.admissionReason'
  | 'diagnoses.current'
  | 'medication.current'
  | 'labs.latest'
  | 'verlauf.selectedRange'
  | 'anamnese.current'
  | 'psychopathology.latest'
  | 'risk.current'
  | 'therapy.current'
  | 'socialTherapy.current'

/** Document width of a block on the A4 page. */
export type BlockWidth = 'full' | 'half'
/** Horizontal placement used when {@link BlockWidth} is `'half'`. */
export type BlockAlign = 'left' | 'right'

export interface BlockBase {
  id: string
  /**
   * Optional minimum height (px) for the rendered block, set via the canvas
   * drag-resize handle. Undefined = content height. Honored by the renderer,
   * A4 preview and print.
   */
  height?: number
  /** Page width of the block. Defaults to `'full'` when omitted. */
  width?: BlockWidth
  /** Side the block sits on when `width === 'half'`. Defaults to `'left'`. */
  align?: BlockAlign
}

export interface HeadingBlock extends BlockBase {
  type: 'heading'
  text: string
  level: 1 | 2 | 3
}

export interface TextBlock extends BlockBase {
  type: 'text'
  /**
   * Plain-text fallback (also used for search + AI context). Paragraphs split
   * on blank lines. Kept in sync with {@link html} when rich text is edited.
   */
  text: string
  /**
   * Sanitised rich-text HTML produced by the TipTap editor (bold/italic/
   * underline, lists, alignment, font). Portable structured content — when
   * present it drives rendering; `text` remains the safe plain fallback.
   */
  html?: string
}

export type InputKind =
  | 'short_text'
  | 'long_text'
  | 'checkbox'
  | 'select'
  | 'multi_select'
  | 'yes_no'
  | 'date'
  | 'number'

export interface InputOption {
  id: string
  label: string
}

/** Covers: Free text field, Required field, Checkbox / select / date. */
export interface InputBlock extends BlockBase {
  type: 'input'
  inputKind: InputKind
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  options?: InputOption[]
  defaultValue?: string
}

export interface TableColumn {
  id: string
  label: string
}

export interface TableRow {
  id: string
  cells: Record<string, string>
}

export interface TableBlock extends BlockBase {
  type: 'table'
  caption?: string
  columns: TableColumn[]
  rows: TableRow[]
}

export interface DiagnosisBlock extends BlockBase {
  type: 'diagnosis'
  label?: string
  showCodes: boolean
  primaryOnly: boolean
}

export interface MedicationBlock extends BlockBase {
  type: 'medication'
  label?: string
  includePrn: boolean
  format: 'list' | 'table'
}

export interface LaboratoryBlock extends BlockBase {
  type: 'laboratory'
  label?: string
  onlyAbnormal: boolean
}

export interface PsychopathologyBlock extends BlockBase {
  type: 'psychopathology'
  label?: string
}

export interface RiskBlock extends BlockBase {
  type: 'risk'
  label?: string
}

export type VerlaufWindowPreset = '7d' | '14d' | 'admission' | 'all'

export interface VerlaufSummaryBlock extends BlockBase {
  type: 'verlauf_summary'
  label?: string
  windowPreset: VerlaufWindowPreset
}

export interface AnamneseBlock extends BlockBase {
  type: 'anamnese'
  label?: string
}

export interface TherapyBlock extends BlockBase {
  type: 'therapy'
  label?: string
}

export interface SocialTherapyBlock extends BlockBase {
  type: 'social_therapy'
  label?: string
}

export type PatientDataField =
  | 'name'
  | 'vorname'
  | 'nachname'
  | 'geburtsdatum'
  | 'age'
  | 'geschlecht'
  | 'address'
  | 'kostentraeger'
  | 'caseId'
  | 'admissionReason'

export interface PatientDataBlock extends BlockBase {
  type: 'patient_data'
  field: PatientDataField
  label?: string
  /** Inline = "Label: value" on one line; otherwise label above value. */
  inline: boolean
}

export type InstitutionField =
  | 'clinician.name'
  | 'clinician.title'
  | 'organization.name'
  | 'organization.address'
  | 'system.date'
  | 'system.documentDate'

export interface InstitutionBlock extends BlockBase {
  type: 'institution'
  field: InstitutionField
  label?: string
  inline: boolean
}

export interface SignatureBlock extends BlockBase {
  type: 'signature'
  roleLabel: string
  includeDate: boolean
  includeLocation: boolean
}

/**
 * AI-generated section. The template stores only the instruction + which
 * clinical context to feed. Generation happens at fill time through the billed
 * `runAiFeature` path (feature key `template_block_fill`). The template never
 * stores generated PHI.
 */
export interface AiSectionBlock extends BlockBase {
  type: 'ai_section'
  label: string
  /** Instruction guiding the model, e.g. "Summarise the hospital course". */
  prompt: string
  /** Which clinical context to provide to the model. */
  sourceBinding: ClinicalBinding | 'all'
}

export type ConditionalOperator = 'exists' | 'not_exists' | 'equals' | 'contains'

export interface ConditionalBlock extends BlockBase {
  type: 'conditional'
  label?: string
  condition: {
    source: ClinicalBinding | 'manual'
    operator: ConditionalOperator
    value?: string
  }
  /** Rendered only when the condition is satisfied. */
  children: TemplateBlock[]
}

export type TemplateBlock =
  | HeadingBlock
  | TextBlock
  | InputBlock
  | TableBlock
  | DiagnosisBlock
  | MedicationBlock
  | LaboratoryBlock
  | PsychopathologyBlock
  | RiskBlock
  | VerlaufSummaryBlock
  | AnamneseBlock
  | TherapyBlock
  | SocialTherapyBlock
  | PatientDataBlock
  | InstitutionBlock
  | SignatureBlock
  | AiSectionBlock
  | ConditionalBlock

export type ClinicalTemplateCategory =
  | 'arztbrief'
  | 'anamnese'
  | 'verlauf'
  | 'psychopathologischer-befund'
  | 'aufklaerung'
  | 'legal-forensic'
  | 'gutachten'
  | 'konsil'
  | 'custom'

export type ClinicalTemplateStatus = 'draft' | 'active' | 'archived'
export type ClinicalTemplateScope = 'personal' | 'organization'

/**
 * A document header or footer band rendered on the A4 page (top / bottom) in
 * the canvas preview, patient preview and print/export. Holds sanitised
 * rich-text HTML (TipTap) that may contain `{{placeholder}}` tokens (e.g.
 * `{{organization.name}}`, `{{patient.name}}`, `{{date}}`) resolved against the
 * clinical data at render time. This is document content — distinct from the
 * template's working name, which lives in the builder chrome.
 */
/** Horizontal placement of a band's logo image relative to the rich text. */
export type BandImageAlign = 'left' | 'center' | 'right'

export interface DocumentBand {
  html: string
  /** Show a thin rule between the band and the document body. Default true. */
  divider?: boolean
  /**
   * Optional logo / image for the band, stored as a base64 `data:` URL — the
   * same client-side asset approach the app uses elsewhere for template-local
   * images (no server upload). Rendered on the canvas, preview and export.
   */
  imageUrl?: string
  /** Rendered image height in px (width scales automatically). Default 48. */
  imageHeight?: number
  /** Image placement relative to the band's text. Default `'left'`. */
  imageAlign?: BandImageAlign
  /**
   * Fixed band height in px applied as a min-height. Undefined = content
   * height. Honored on the canvas, preview and export.
   */
  height?: number
}

/** Where the header/footer bands appear in paginated output. */
export type HeaderFooterDisplay = 'all-pages' | 'first-page-only'

/**
 * Document-level header/footer pagination behaviour. Optional — absent on v4
 * and earlier templates, where it defaults to header/footer on every page with
 * no distinct first page (the historical behaviour).
 */
export interface DocumentPageSettings {
  /** `'all-pages'` (default) or `'first-page-only'`. */
  display: HeaderFooterDisplay
  /**
   * When true (and {@link display} is `'all-pages'`), page 1 uses the distinct
   * {@link ClinicalTemplate.headerFirst} / {@link ClinicalTemplate.footerFirst}
   * bands while pages 2+ use the primary {@link ClinicalTemplate.header} /
   * {@link ClinicalTemplate.footer}. Ignored in `'first-page-only'` mode.
   */
  differentFirstPage: boolean
}

export interface ClinicalTemplateVersionSnapshot {
  version: number
  blocks: TemplateBlock[]
  savedAt: string
}

export interface ClinicalTemplate {
  schemaVersion: number
  id: string
  title: string
  description?: string
  category: ClinicalTemplateCategory
  language: 'de' | 'en'
  status: ClinicalTemplateStatus
  scope: ClinicalTemplateScope
  version: number
  blocks: TemplateBlock[]
  /** Optional A4 page header band (rendered above the body). */
  header?: DocumentBand
  /** Optional A4 page footer band (rendered below the body). */
  footer?: DocumentBand
  /**
   * Distinct first-page header, used only when
   * `pageSettings.differentFirstPage` is true. Falls back to {@link header}.
   */
  headerFirst?: DocumentBand
  /**
   * Distinct first-page footer, used only when
   * `pageSettings.differentFirstPage` is true. Falls back to {@link footer}.
   */
  footerFirst?: DocumentBand
  /** Header/footer pagination behaviour. Defaults applied when absent. */
  pageSettings?: DocumentPageSettings
  createdAt: string
  updatedAt: string
  createdBy?: string
  /** Snapshots of prior activated versions (newest first). */
  history?: ClinicalTemplateVersionSnapshot[]
}

/** Values entered into fillable blocks at document-fill time, keyed by block id. */
export type TemplateFieldValues = Record<string, string | boolean | string[]>
