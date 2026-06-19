import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CourseDirection } from '../../../types/clinicalImprint'
import { useTranslation } from '../../../context/TranslationContext'
import { ClinicalEyebrow } from '../../clinical/ClinicalEyebrow'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { SafetyRiskSignal, SymptomSnapshotData } from './types'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import {
  PSYCHOPATH_DOMAIN_I18N_KEYS,
  type PsychopathOverviewDomainKey,
} from '../../../schemas/psychopath/extraction'
import {
  inferCourseDirection,
  savePsychopathFindingEdit,
} from '../../../utils/overview/psychopathFindingOps'
import { filterElevatedHarmSignals } from '../../../utils/overview/patientSafety'
import { usePsychopathAiExtract } from '../../../hooks/usePsychopathAiExtract'
import { showNotionToast } from '../NotionToast'

interface SymptomSnapshotCardProps {
  caseId: string
  data: SymptomSnapshotData
  riskSignals?: SafetyRiskSignal[]
  onOpen?: () => void
  onSaved?: () => void
  /** Bump when overview psychopathology store changes. */
  revision?: number
}

const COURSE_OPTIONS: { value: CourseDirection; labelKey: 'overviewPsyCourseStable' | 'overviewPsyCourseImproved' | 'overviewPsyCourseWorsened' | 'overviewPsyCourseFluctuating' | 'overviewPsyCourseUnclear' }[] = [
  { value: 'stable', labelKey: 'overviewPsyCourseStable' },
  { value: 'improved', labelKey: 'overviewPsyCourseImproved' },
  { value: 'worsened', labelKey: 'overviewPsyCourseWorsened' },
  { value: 'fluctuating', labelKey: 'overviewPsyCourseFluctuating' },
  { value: 'unclear', labelKey: 'overviewPsyCourseUnclear' },
]

function domainLabel(
  cue: SymptomSnapshotData['structured'][number],
  t: (key: UiTranslationKey) => string,
): string {
  if (cue.domainKey) {
    return t(PSYCHOPATH_DOMAIN_I18N_KEYS[cue.domainKey as PsychopathOverviewDomainKey])
  }
  return cue.label
}

function aiConfidenceLabelKey(
  confidence: NonNullable<SymptomSnapshotData['aiConfidence']>,
): UiTranslationKey {
  if (confidence === 'high') return 'overviewPsyAiConfidencehigh'
  if (confidence === 'medium') return 'overviewPsyAiConfidencemedium'
  return 'overviewPsyAiConfidencelow'
}

function SafetyAxisStrip({ signal }: { signal: SafetyRiskSignal }) {
  const classes = [
    'cm-quiet-strip',
    'cm-quiet-strip--axis',
    `cm-quiet-strip--tone-${signal.tone}`,
  ].join(' ')

  return (
    <div className={classes}>
      <p className="cm-quiet-strip__headline">{signal.label}</p>
      {signal.value ? <p className="cm-quiet-strip__detail">{signal.value}</p> : null}
      {signal.showPill && signal.pillLabel ? (
        <span className="ov-safety__severity">{signal.pillLabel}</span>
      ) : null}
    </div>
  )
}

/**
 * Psychopathologischer Befund (PPB) — structured domain grid with optional KI
 * extraction, editable narrative, and history.
 */
export function SymptomSnapshotCard({
  caseId,
  data,
  riskSignals = [],
  onOpen,
  onSaved,
  revision = 0,
}: SymptomSnapshotCardProps) {
  const { t, language } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [courseDirection, setCourseDirection] = useState<CourseDirection>('stable')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [narrativeOpen, setNarrativeOpen] = useState(false)

  const { status: aiStatus, error: aiError, isStale, isEnabled: aiEnabled, extract } =
    usePsychopathAiExtract({
      caseId,
      language,
      revision,
      autoRun: true,
    })
  const lastToastedErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (aiStatus !== 'error' || !aiError || aiError === lastToastedErrorRef.current) return
    lastToastedErrorRef.current = aiError
    showNotionToast(aiError)
  }, [aiError, aiStatus])

  const harmSignals = filterElevatedHarmSignals(
    riskSignals.filter(
      (s) => s.id === 'riskSelf' || s.id === 'riskOthers' || s.id === 'suicidality',
    ),
  )
  const hasPsychopathText =
    Boolean(data.fullText?.trim()) || Boolean(data.snapshotText?.trim())
  const hasContent =
    data.assessed ||
    hasPsychopathText ||
    data.structured.length > 0 ||
    Boolean(data.courseLabel) ||
    harmSignals.length > 0
  const canExtractWithAi = aiEnabled && hasContent

  const showNarrative =
    !editing &&
    Boolean(data.snapshotText) &&
    (!data.collapseNarrative || narrativeOpen)

  const meta = useMemo(() => {
    const parts = [
      data.assessed ? t('overviewPsyAssessed') : t('overviewPsyNotAssessed'),
      data.courseLabel,
      data.asOfLabel ? `${t('overviewPsyAsOf')} ${data.asOfLabel}` : null,
    ].filter(Boolean)
    return parts.join(' · ') || null
  }, [data, t])

  const startEditing = useCallback(() => {
    const seed = data.fullText ?? data.snapshotText ?? ''
    setDraft(seed)
    setCourseDirection(inferCourseDirection(seed) ?? 'stable')
    setEditing(true)
  }, [data.fullText, data.snapshotText])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setDraft('')
  }, [])

  const handleSave = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed) return
    savePsychopathFindingEdit({
      caseId,
      text: trimmed,
      courseDirection,
    })
    setEditing(false)
    onSaved?.()
  }, [caseId, courseDirection, draft, onSaved])

  const handleExtract = useCallback(() => {
    void extract({ force: true })
  }, [extract])

  return (
    <OverviewCard
      title={t('notionPagePsychopath')}
      className="ov-col-6 ov-ppb-card"
      meta={meta}
      action={
        editing
          ? undefined
          : onOpen
            ? { label: t('overviewPsyOpenFinding'), onClick: onOpen }
            : undefined
      }
      headerExtra={
        editing ? null : (
          <div className="ov-ppb__header-actions ov-card__head-actions">
            {canExtractWithAi ? (
              <button
                type="button"
                className="cm-section__action ov-ppb__extract"
                onClick={handleExtract}
                disabled={aiStatus === 'loading'}
                title={t('overviewPsyExtractHint')}
              >
                {aiStatus === 'loading' ? t('overviewPsyExtracting') : t('overviewPsyExtract')}
              </button>
            ) : null}
            {!aiEnabled && import.meta.env.DEV && hasContent ? (
              <span
                className="ov-ppb__extract-dev-hint"
                title="VITE_ENABLE_PSYCHOPATH_EXTRACT_AI=true (+ ENABLE_PSYCHOPATH_EXTRACT_AI server)"
              >
                KI aus
              </span>
            ) : null}
            <button type="button" className="cm-section__action ov-ppb__edit" onClick={startEditing}>
              {data.assessed ? t('overviewPsyEdit') : t('overviewPsyAdd')}
            </button>
          </div>
        )
      }
    >
      {!hasContent && !editing ? (
        <OverviewEmpty>{t('overviewPsyEmpty')}</OverviewEmpty>
      ) : null}

      {aiEnabled && aiStatus === 'loading' ? (
        <p className="ov-ppb__loading" role="status">
          {t('overviewPsyExtracting')}
        </p>
      ) : null}

      {aiEnabled && isStale && aiStatus !== 'loading' && hasPsychopathText && !data.structured.length && !data.structuredFromAi ? (
        <p className="ov-ppb__stale-hint">{t('overviewPsyStaleHint')}</p>
      ) : null}

      {aiEnabled && aiStatus === 'error' && aiError ? (
        <p className="ov-ppb__error" role="alert">
          {aiError}
        </p>
      ) : null}

      {editing ? (
        <div className="ov-ppb__editor">
          <label className="ov-ppb__editor-label" htmlFor={`ov-ppb-edit-${caseId}`}>
            {t('overviewPsyEditLabel')}
          </label>
          <textarea
            id={`ov-ppb-edit-${caseId}`}
            className="ov-ppb__textarea"
            rows={6}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <label className="ov-ppb__editor-label" htmlFor={`ov-ppb-course-${caseId}`}>
            {t('overviewPsyCourseLabel')}
          </label>
          <select
            id={`ov-ppb-course-${caseId}`}
            className="ov-ppb__select"
            value={courseDirection}
            onChange={(event) => setCourseDirection(event.target.value as CourseDirection)}
          >
            {COURSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
          <div className="ov-ppb__editor-actions">
            <button type="button" className="ov-card__action" onClick={handleSave} disabled={!draft.trim()}>
              {t('overviewPsySave')}
            </button>
            <button type="button" className="ov-ppb__cancel" onClick={cancelEditing}>
              {t('overviewPsyCancel')}
            </button>
          </div>
        </div>
      ) : null}

      {harmSignals.length > 0 ? (
        <div className="ov-ppb__safety">
          <ClinicalEyebrow className="ov-safety__subhead">
            {t('overviewPsySafetySubhead')}
          </ClinicalEyebrow>
          <div className="ov-safety__axes">
            {harmSignals.map((signal) => (
              <SafetyAxisStrip key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      ) : null}

      {!editing && data.assessed && (data.structured.length > 0 || data.unremarkableSummary) ? (
        <div className="ov-snapshot__cues ov-snapshot__cues--grid ov-snapshot__cues--compact">
          {data.structuredFromAi ? (
            <ClinicalEyebrow className="ov-ppb__structured-label">
              {t('overviewPsyStructuredLabel')}
              {data.aiConfidence ? (
                <span className="ov-ppb__ai-badge">{t(aiConfidenceLabelKey(data.aiConfidence))}</span>
              ) : null}
            </ClinicalEyebrow>
          ) : null}
          {data.structured.length > 0 ? (
            <div className="ov-ppb__domain-grid" role="list">
              {data.structured.map((cue) => (
                <div
                  key={cue.domainKey ?? cue.label}
                  className="cm-cue-row ov-ppb__domain-row"
                  role="listitem"
                >
                  <span className="cm-cue-label">{domainLabel(cue, t)}</span>
                  <span className="cm-cue-value ov-ppb__domain-value">
                    {cue.value ? <span className="ov-ppb__detail">{cue.value}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {data.unremarkableSummary ? (
            <p className="ov-ppb__unremarkable-summary">{data.unremarkableSummary}</p>
          ) : null}
        </div>
      ) : null}

      {!editing && (data.collapseNarrative || data.history.length > 0) ? (
        <div className="ov-ppb__footer-actions">
          {data.collapseNarrative && data.snapshotText ? (
            <button
              type="button"
              className="ov-ppb__narrative-toggle"
              aria-expanded={narrativeOpen}
              onClick={() => setNarrativeOpen((open) => !open)}
            >
              {narrativeOpen ? t('overviewPsyHideNarrative') : t('overviewPsyShowNarrative')}
            </button>
          ) : null}

          {data.history.length > 0 ? (
            <button
              type="button"
              className="ov-ppb__history-toggle"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              {historyOpen ? t('overviewPsyHideHistory') : t('overviewPsyShowHistory')}
              <span className="ov-ppb__history-count">{data.history.length}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {showNarrative ? (
        <p className="ov-snapshot__text ov-snapshot__text--secondary">{data.snapshotText}</p>
      ) : null}

      {!editing && historyOpen && data.history.length > 0 ? (
        <div className="ov-ppb__history">
          <ul className="ov-ppb__history-list">
            {data.history.map((entry) => {
              const expanded = expandedHistoryId === entry.id
              return (
                <li key={entry.id} className="ov-ppb__history-item">
                  <button
                    type="button"
                    className="ov-ppb__history-row"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedHistoryId((current) => (current === entry.id ? null : entry.id))
                    }
                  >
                    <span className="ov-ppb__history-date">{entry.dateLabel}</span>
                    <span className="ov-ppb__history-source">{entry.sourceLabel}</span>
                    {entry.courseLabel ? (
                      <span className="ov-ppb__history-course">{entry.courseLabel}</span>
                    ) : null}
                  </button>
                  {expanded ? <p className="ov-ppb__history-text">{entry.text}</p> : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </OverviewCard>
  )
}
