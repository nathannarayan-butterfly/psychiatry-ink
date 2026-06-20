/**
 * Settings · "Dokument-Import optimieren" / Parser-Optimierung.
 *
 * A self-contained settings section that lets a clinician teach the deterministic
 * Document Import parser how THEIR clinic's documents are laid out, persisted as a
 * per-user {@link ParserProfile} (see `useParserProfile`). The profile is applied
 * ABOVE the base parser as a detection bias — it never bypasses the review/accept
 * gate or provenance.
 *
 * PHI safety: a sample document is parsed transiently here; only de-identified
 * STRUCTURE (heading labels, column names) is shown and offered for capture —
 * never patient narrative.
 */
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { useParserProfile } from '../../hooks/useParserProfile'
import type { CandidateModule } from '../../schemas/documentImport/envelope'
import { DATE_LOCATION_HINTS, type DateLocationHint } from '../../utils/documentImport/dateAssociation'
import { TABULAR_FIELDS, type TabularField } from '../../utils/documentImport/tabular'
import { parseFile } from '../../utils/documentImport/parsers/index'
import { sanitizeProfileLabel } from '../../utils/documentImport/parserProfile'
import { moduleLabelKey, REMAP_MODULES } from '../documentImport/labels'
import { SettingsField } from './SettingsField'
import { SettingsOptionGroup } from './SettingsOptionGroup'

/** Known anamnese section ids (used to refine an `anamnese` heading alias). */
const ANAMNESE_SECTION_IDS = [
  'aufnahmeanlass',
  'aktuelle-beschwerden',
  'aktuelle-krankheitsanamnese',
  'eigenanamnese',
  'psychiatrische-vorgeschichte',
  'somatische-anamnese',
  'suchtanamnese',
  'medikamentenanamnese',
  'familienanamnese',
  'fremdanamnese',
  'biografische-anamnese',
  'sozialanamnese',
  'schul-und-berufsanamnese',
  'forensische-anamnese',
  'traumaanamnese',
  'psychopathologischer-befund',
  'somatischer-befund',
] as const

const dateHintLabelKey: Record<DateLocationHint, UiTranslationKey> = {
  auto: 'parserOptimizationDateAuto',
  'left-column': 'parserOptimizationDateLeft',
  'right-column': 'parserOptimizationDateRight',
  'section-header': 'parserOptimizationDateHeader',
  inline: 'parserOptimizationDateInline',
  'following-line': 'parserOptimizationDateFollowing',
}

const fieldLabelKey: Record<TabularField, UiTranslationKey> = {
  label: 'parserFieldLabelText',
  icd10Code: 'parserFieldIcd10Code',
  substance: 'parserFieldSubstance',
  strength: 'parserFieldStrength',
  doseText: 'parserFieldDoseText',
  indication: 'parserFieldIndication',
  status: 'parserFieldStatus',
  name: 'parserFieldName',
  value: 'parserFieldValue',
  unit: 'parserFieldUnit',
  refText: 'parserFieldRefText',
  date: 'parserFieldDate',
  panelLabel: 'parserFieldPanelLabel',
  title: 'parserFieldTitle',
  text: 'parserFieldText',
}

function humanizeSectionId(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

interface DetectedSection {
  heading: string
  module: CandidateModule
  mapped: boolean
}

interface SampleAnalysis {
  sections: DetectedSection[]
  columns: string[]
}

const inputClass =
  'w-full rounded-sm border-2 border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none'

export function ParserOptimizationSection() {
  const { t } = useTranslation()
  const {
    profile,
    setDateLocation,
    addHeadingAlias,
    removeHeadingAlias,
    addColumnAlias,
    removeColumnAlias,
    reset,
  } = useParserProfile()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [sample, setSample] = useState<SampleAnalysis | null>(null)
  const [sampleError, setSampleError] = useState(false)

  const [headingDraft, setHeadingDraft] = useState<{
    alias: string
    module: CandidateModule
    sectionId: string
  }>({ alias: '', module: 'verlauf', sectionId: '' })

  const [columnDraft, setColumnDraft] = useState<{
    header: string
    module: CandidateModule
    field: TabularField
  }>({ header: '', module: 'lab', field: 'value' })

  const moduleOptions = REMAP_MODULES.map((module) => ({
    value: module,
    label: t(moduleLabelKey(module)),
  }))

  const dateOptions = DATE_LOCATION_HINTS.map((hint) => ({
    value: hint,
    label: t(dateHintLabelKey[hint]),
  }))

  const handleAddHeadingAlias = useCallback(() => {
    const alias = headingDraft.alias.trim()
    if (!alias) return
    addHeadingAlias({
      alias,
      module: headingDraft.module,
      sectionId:
        headingDraft.module === 'anamnese' && headingDraft.sectionId
          ? headingDraft.sectionId
          : undefined,
    })
    setHeadingDraft({ alias: '', module: 'verlauf', sectionId: '' })
  }, [addHeadingAlias, headingDraft])

  const handleAddColumnAlias = useCallback(() => {
    const header = columnDraft.header.trim()
    if (!header) return
    addColumnAlias({ header, module: columnDraft.module, field: columnDraft.field })
    setColumnDraft({ header: '', module: 'lab', field: 'value' })
  }, [addColumnAlias, columnDraft])

  const analyzeSample = useCallback(async (file: File) => {
    setAnalyzing(true)
    setSampleError(false)
    setSample(null)
    try {
      // Run the BASE parser (no profile) on a transient sample. PDFs are not
      // persisted — the no-op store keeps everything in memory.
      const { envelope } = await parseFile(file, {
        caseId: 'parser-profile-sample',
        parserProfile: null,
        storeAttachment: async () => 'parser-profile-sample',
      })

      const seen = new Set<string>()
      const sections: DetectedSection[] = []
      for (const candidate of envelope.candidates) {
        const heading = candidate.sourceLocation.section?.trim()
        if (!heading) continue
        const safe = sanitizeProfileLabel(heading)
        if (!safe || seen.has(safe)) continue
        seen.add(safe)
        const mapped = !(
          candidate.module === 'document' &&
          candidate.clarifications?.some((c) => c.code === 'mapping_uncertain')
        )
        sections.push({ heading: safe, module: candidate.module, mapped })
      }

      const columns = (envelope.source.columns ?? [])
        .map((column) => sanitizeProfileLabel(column))
        .filter((column) => column.length > 0)

      setSample({ sections, columns })
    } catch {
      setSampleError(true)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const handleSampleFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) void analyzeSample(file)
      event.target.value = ''
    },
    [analyzeSample],
  )

  return (
    <div>
      <SettingsField label={t('parserOptimizationDateLocationLabel')}>
        <SettingsOptionGroup
          value={profile.dateLocation}
          options={dateOptions}
          onChange={setDateLocation}
        />
      </SettingsField>

      {/* Heading aliases */}
      <SettingsField label={t('parserOptimizationHeadingAliasesLabel')}>
        {profile.headingAliases.length === 0 ? (
          <p className="text-xs text-muted">{t('parserOptimizationNoAliases')}</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-2">
            {profile.headingAliases.map((alias, index) => (
              <li
                key={`${alias.alias}-${index}`}
                className="flex items-center justify-between gap-2 rounded-sm border-2 border-border px-2 py-1.5 text-sm text-ink"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{alias.alias}</span>
                  <span className="text-muted"> → {t(moduleLabelKey(alias.module))}</span>
                  {alias.sectionId ? (
                    <span className="text-muted"> · {humanizeSectionId(alias.sectionId)}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted hover:text-ink"
                  onClick={() => removeHeadingAlias(index)}
                >
                  {t('parserOptimizationRemove')}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            className={inputClass}
            placeholder={t('parserOptimizationHeadingPlaceholder')}
            value={headingDraft.alias}
            onChange={(e) => setHeadingDraft((d) => ({ ...d, alias: e.target.value }))}
          />
          <select
            className={inputClass}
            value={headingDraft.module}
            onChange={(e) =>
              setHeadingDraft((d) => ({ ...d, module: e.target.value as CandidateModule }))
            }
          >
            {moduleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {headingDraft.module === 'anamnese' ? (
            <select
              className={inputClass}
              value={headingDraft.sectionId}
              onChange={(e) => setHeadingDraft((d) => ({ ...d, sectionId: e.target.value }))}
            >
              <option value="">{t('parserOptimizationSectionNone')}</option>
              {ANAMNESE_SECTION_IDS.map((id) => (
                <option key={id} value={id}>
                  {humanizeSectionId(id)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <button
          type="button"
          className="mt-2 rounded-sm border-2 border-border px-3 py-1.5 text-xs text-ink hover:bg-surface-hover disabled:opacity-50"
          onClick={handleAddHeadingAlias}
          disabled={!headingDraft.alias.trim()}
        >
          {t('parserOptimizationAddAlias')}
        </button>
      </SettingsField>

      {/* Column mappings */}
      <SettingsField label={t('parserOptimizationColumnAliasesLabel')}>
        {profile.columnAliases.length === 0 ? (
          <p className="text-xs text-muted">{t('parserOptimizationNoColumnAliases')}</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-2">
            {profile.columnAliases.map((alias, index) => (
              <li
                key={`${alias.header}-${index}`}
                className="flex items-center justify-between gap-2 rounded-sm border-2 border-border px-2 py-1.5 text-sm text-ink"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{alias.header}</span>
                  <span className="text-muted">
                    {' '}
                    → {t(moduleLabelKey(alias.module))} · {t(fieldLabelKey[alias.field])}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted hover:text-ink"
                  onClick={() => removeColumnAlias(index)}
                >
                  {t('parserOptimizationRemove')}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            className={inputClass}
            placeholder={t('parserOptimizationColumnHeaderPlaceholder')}
            value={columnDraft.header}
            onChange={(e) => setColumnDraft((d) => ({ ...d, header: e.target.value }))}
          />
          <select
            className={inputClass}
            value={columnDraft.module}
            onChange={(e) =>
              setColumnDraft((d) => ({ ...d, module: e.target.value as CandidateModule }))
            }
          >
            {moduleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={columnDraft.field}
            onChange={(e) => setColumnDraft((d) => ({ ...d, field: e.target.value as TabularField }))}
          >
            {TABULAR_FIELDS.map((field) => (
              <option key={field} value={field}>
                {t(fieldLabelKey[field])}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="mt-2 rounded-sm border-2 border-border px-3 py-1.5 text-xs text-ink hover:bg-surface-hover disabled:opacity-50"
          onClick={handleAddColumnAlias}
          disabled={!columnDraft.header.trim()}
        >
          {t('parserOptimizationAddColumnAlias')}
        </button>
      </SettingsField>

      <SettingsField label={t('parserOptimizationSampleLabel')}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.txt,.csv,.tsv,.xlsx,.json,.jsonl,.pdf"
          className="hidden"
          onChange={handleSampleFile}
        />
        <button
          type="button"
          className="rounded-sm border-2 border-border px-3 py-1.5 text-xs text-ink hover:bg-surface-hover disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={analyzing}
        >
          {analyzing ? t('parserOptimizationSampleAnalyzing') : t('parserOptimizationSampleUpload')}
        </button>

        {sampleError ? (
          <p className="mt-2 text-xs text-muted">{t('parserOptimizationSampleError')}</p>
        ) : null}

        {sample ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-ink">
              {t('parserOptimizationSampleResultHeading')}
            </p>
            {sample.sections.length === 0 && sample.columns.length === 0 ? (
              <p className="text-xs text-muted">{t('parserOptimizationSampleNone')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sample.sections.map((section, index) => (
                  <li
                    key={`s-${section.heading}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-sm border-2 border-border px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-ink">
                      <span className="font-medium">{section.heading}</span>
                      <span className="text-muted">
                        {' '}
                        →{' '}
                        {section.mapped
                          ? t(moduleLabelKey(section.module))
                          : t('parserOptimizationSampleUnmapped')}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted hover:text-ink"
                      onClick={() =>
                        setHeadingDraft({
                          alias: section.heading,
                          module: section.mapped ? section.module : 'verlauf',
                          sectionId: '',
                        })
                      }
                    >
                      {t('parserOptimizationSampleAddThis')}
                    </button>
                  </li>
                ))}
                {sample.columns.map((column, index) => (
                  <li
                    key={`c-${column}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-sm border-2 border-border px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-ink font-medium">{column}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted hover:text-ink"
                      onClick={() =>
                        setColumnDraft((d) => ({ ...d, header: column }))
                      }
                    >
                      {t('parserOptimizationSampleAddThis')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </SettingsField>

      <div className="settings-section-toolbar">
        <button
          type="button"
          className="settings-section-toolbar__action"
          onClick={reset}
        >
          {t('parserOptimizationReset')}
        </button>
      </div>
    </div>
  )
}
