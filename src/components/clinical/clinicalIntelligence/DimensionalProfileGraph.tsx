/**
 * Clinical Intelligence — Layer 1 visualization.
 *
 * Horizontal SVG bar chart over the 27 psychopathological dimensions, grouped
 * by clinical band. Each row is a clickable accordion trigger; clicking it
 * expands the full detail/edit panel below (handled by the parent panel via
 * `expandedDimensionId` + `onToggleDimension`).
 *
 * Bars use a tiny inline `<rect>` per row (no chart-library dependency). Bar
 * width is proportional to severity (0–4); fill colour reflects severity on a
 * fixed semantic ramp (grey → green → yellow → orange → red). Confidence is a
 * secondary signal (conf dot only).
 */
import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronRight, Check, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  CLINICAL_INTELLIGENCE_DIMENSIONS,
  getClinicalIntelligenceDimension,
  type ClinicalIntelligenceDimension,
} from '../../../data/clinicalIntelligence/dimensions'
import { sortDimensionalFindings } from '../../../services/clinicalIntelligence/dimensionalIntegration'
import type {
  ClinicalIntelligenceDimensionId,
  CompactEvidenceItem,
  DimensionalFinding,
  DimensionalIntegrationResult,
} from '../../../types/clinicalIntelligence'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import {
  formatCiEvidenceSourceList,
  getCiDimensionLabel,
} from '../../../data/clinicalIntelligenceTranslations'
import { CiSeverityLegend } from './CiSeverityLegend'
import {
  severityBarFillClass,
  type SeverityBarFillClass,
} from '../../../utils/clinicalIntelligence/severityGraph'

interface DimensionalProfileGraphProps {
  result: DimensionalIntegrationResult
  evidenceItems?: readonly CompactEvidenceItem[]
  expandedId: ClinicalIntelligenceDimensionId | null
  onToggle: (id: ClinicalIntelligenceDimensionId) => void
  onAccept: (id: ClinicalIntelligenceDimensionId) => void
  onReject: (id: ClinicalIntelligenceDimensionId) => void
  onEdit: (
    id: ClinicalIntelligenceDimensionId,
    patch: Partial<
      Pick<
        DimensionalFinding,
        'clinicalSummary' | 'longitudinalPattern' | 'uncertainty' | 'missingData'
      >
    >,
  ) => void
}

type Band = ClinicalIntelligenceDimension['band']

const BAND_ORDER: readonly Band[] = [
  'psychosis',
  'mood',
  'anxiety-trauma',
  'cognition',
  'somatic',
  'behavior',
  'context',
] as const

const BAND_LABEL_KEY: Record<Band, UiTranslationKey> = {
  cognition: 'ciBandCognition',
  psychosis: 'ciBandPsychosis',
  mood: 'ciBandMood',
  'anxiety-trauma': 'ciBandAnxietyTrauma',
  somatic: 'ciBandSomatic',
  behavior: 'ciBandBehavior',
  context: 'ciBandContext',
}

const CONFIDENCE_LABEL_KEY: Record<
  DimensionalFinding['confidence'],
  'ciConfidenceLow' | 'ciConfidenceModerate' | 'ciConfidenceHigh'
> = {
  low: 'ciConfidenceLow',
  moderate: 'ciConfidenceModerate',
  high: 'ciConfidenceHigh',
}

const REVIEW_KEY: Record<
  DimensionalFinding['reviewStatus'],
  'ciStatusPending' | 'ciStatusAccepted' | 'ciStatusEdited' | 'ciStatusRejected'
> = {
  pending: 'ciStatusPending',
  accepted: 'ciStatusAccepted',
  edited: 'ciStatusEdited',
  rejected: 'ciStatusRejected',
}

const BAR_WIDTH = 220
const BAR_HEIGHT = 10
const SEVERITY_MAX = 4

interface DimensionRowGroup {
  band: Band
  rows: DimensionalFinding[]
}

function groupByBand(findings: DimensionalFinding[]): DimensionRowGroup[] {
  const byBand = new Map<Band, DimensionalFinding[]>()
  for (const finding of findings) {
    const meta = getClinicalIntelligenceDimension(finding.dimensionId)
    if (!meta) continue
    const list = byBand.get(meta.band) ?? []
    list.push(finding)
    byBand.set(meta.band, list)
  }
  const groups: DimensionRowGroup[] = []
  for (const band of BAND_ORDER) {
    const rows = byBand.get(band)
    if (rows && rows.length > 0) {
      groups.push({ band, rows })
    }
  }
  return groups
}

export interface DimensionalSeverityBar {
  dimensionId: ClinicalIntelligenceDimensionId
  severity: number
  /** 0..1 normalised severity (severity / 4). */
  fraction: number
  confidence: DimensionalFinding['confidence']
  severityClass: SeverityBarFillClass
}

/** Pure helper exposed for unit tests — computes the bar geometry rows. */
export function computeDimensionalBars(
  findings: DimensionalFinding[],
): DimensionalSeverityBar[] {
  return sortDimensionalFindings(findings).map((finding) => ({
    dimensionId: finding.dimensionId,
    severity: finding.severity,
    fraction: Math.max(0, Math.min(1, finding.severity / SEVERITY_MAX)),
    confidence: finding.confidence,
    severityClass: severityBarFillClass(finding.severity),
  }))
}

function DimensionDetail({
  finding,
  evidenceItems,
  onAccept,
  onReject,
  onEdit,
}: {
  finding: DimensionalFinding
  evidenceItems?: readonly CompactEvidenceItem[]
  onAccept: (id: ClinicalIntelligenceDimensionId) => void
  onReject: (id: ClinicalIntelligenceDimensionId) => void
  onEdit: (
    id: ClinicalIntelligenceDimensionId,
    patch: Partial<
      Pick<
        DimensionalFinding,
        'clinicalSummary' | 'longitudinalPattern' | 'uncertainty' | 'missingData'
      >
    >,
  ) => void
}) {
  const { t, language } = useTranslation()
  const dimensionLabel = getCiDimensionLabel(finding.dimensionId, language)
  const [editing, setEditing] = useState(false)
  const [summary, setSummary] = useState(finding.clinicalSummary)
  const [longitudinal, setLongitudinal] = useState(finding.longitudinalPattern)
  const [uncertainty, setUncertainty] = useState(finding.uncertainty)

  const supporting = formatCiEvidenceSourceList(
    finding.supportingEvidenceIds,
    language,
    evidenceItems,
  )
  const contradicting = formatCiEvidenceSourceList(
    finding.contradictingEvidenceIds,
    language,
    evidenceItems,
  )

  useEffect(() => {
    setSummary(finding.clinicalSummary)
    setLongitudinal(finding.longitudinalPattern)
    setUncertainty(finding.uncertainty)
  }, [finding.clinicalSummary, finding.longitudinalPattern, finding.uncertainty])

  if (editing) {
    return (
      <div className="ci-graph-row__edit">
        <h3 className="ci-graph-row__detail-title">{dimensionLabel}</h3>
        <label className="ci-row__label">
          {t('ciClinicalSummary')}
          <textarea
            className="ci-row__textarea"
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>
        <label className="ci-row__label">
          {t('ciLongitudinalPattern')}
          <textarea
            className="ci-row__textarea"
            rows={2}
            value={longitudinal}
            onChange={(event) => setLongitudinal(event.target.value)}
          />
        </label>
        <label className="ci-row__label">
          {t('ciUncertaintyLabel')}
          <textarea
            className="ci-row__textarea"
            rows={2}
            value={uncertainty}
            onChange={(event) => setUncertainty(event.target.value)}
          />
        </label>
        <div className="ci-row__actions">
          <button
            type="button"
            className="ci-btn ci-btn--primary"
            onClick={() => {
              onEdit(finding.dimensionId, {
                clinicalSummary: summary.trim() || finding.clinicalSummary,
                longitudinalPattern: longitudinal,
                uncertainty,
              })
              setEditing(false)
            }}
          >
            {t('ciActionAccept')}
          </button>
          <button
            type="button"
            className="ci-btn"
            onClick={() => {
              setSummary(finding.clinicalSummary)
              setLongitudinal(finding.longitudinalPattern)
              setUncertainty(finding.uncertainty)
              setEditing(false)
            }}
          >
            {t('todoCancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ci-graph-row__detail">
      <h3 className="ci-graph-row__detail-title">{dimensionLabel}</h3>
      <p className="ci-row__summary">{finding.clinicalSummary}</p>
      {finding.longitudinalPattern ? (
        <p className="ci-row__meta">
          <span className="ci-row__meta-label">{t('ciLongitudinalPattern')}:</span>{' '}
          {finding.longitudinalPattern}
        </p>
      ) : null}
      {supporting ? (
        <p className="ci-row__meta">
          <span className="ci-row__meta-label">{t('ciSupportingEvidence')}:</span> {supporting}
        </p>
      ) : null}
      {contradicting ? (
        <p className="ci-row__meta">
          <span className="ci-row__meta-label">{t('ciContradictingEvidence')}:</span>{' '}
          {contradicting}
        </p>
      ) : null}
      {finding.uncertainty ? (
        <p className="ci-row__meta">
          <span className="ci-row__meta-label">{t('ciUncertaintyLabel')}:</span>{' '}
          {finding.uncertainty}
        </p>
      ) : null}
      {finding.missingData ? (
        <p className="ci-row__meta">
          <span className="ci-row__meta-label">{t('ciMissingDataLabel')}:</span>{' '}
          {finding.missingData}
        </p>
      ) : null}
      <div className="ci-row__actions">
        <button
          type="button"
          className="ci-btn ci-btn--primary"
          onClick={() => onAccept(finding.dimensionId)}
          disabled={finding.reviewStatus === 'accepted'}
        >
          <Check className="ci-btn__icon" aria-hidden strokeWidth={2} />
          {t('ciActionAccept')}
        </button>
        <button type="button" className="ci-btn" onClick={() => setEditing(true)}>
          <Pencil className="ci-btn__icon" aria-hidden strokeWidth={2} />
          {t('ciActionEdit')}
        </button>
        <button
          type="button"
          className="ci-btn ci-btn--danger"
          onClick={() => onReject(finding.dimensionId)}
        >
          <Trash2 className="ci-btn__icon" aria-hidden strokeWidth={2} />
          {t('ciActionReject')}
        </button>
      </div>
    </div>
  )
}

export function DimensionalProfileGraph({
  result,
  evidenceItems,
  expandedId,
  onToggle,
  onAccept,
  onReject,
  onEdit,
}: DimensionalProfileGraphProps) {
  const { t, language } = useTranslation()
  const groups = useMemo(
    () => groupByBand(result.activeDimensions),
    [result.activeDimensions],
  )
  const maxSeverity = useMemo(
    () =>
      result.activeDimensions.reduce(
        (max, f) => Math.max(max, f.severity),
        0,
      ),
    [result.activeDimensions],
  )

  if (groups.length === 0) {
    return <p className="cm-empty">{t('ciNoActiveDimensions')}</p>
  }

  return (
    <div className="ci-graph" aria-label={t('ciCardDimensional')}>
      <div className="ci-graph__axis-row" aria-hidden>
        <span className="ci-graph__axis-chev" />
        <span className="ci-graph__axis-name" />
        <div className="ci-graph__axis">
          <span className="ci-graph__axis-label">0</span>
          <span className="ci-graph__axis-label">1</span>
          <span className="ci-graph__axis-label">2</span>
          <span className="ci-graph__axis-label">3</span>
          <span className="ci-graph__axis-label">4</span>
        </div>
      </div>
      <CiSeverityLegend />
      <p className="ci-graph__hint">
        {t('ciGraphSeverityHint')} · {t('ciGraphMaxSeverityLabel')}: {maxSeverity}/4
      </p>
      {groups.map((group) => (
        <div key={group.band} className="ci-graph__group">
          <p className="ci-eyebrow ci-graph__band">{t(BAND_LABEL_KEY[group.band])}</p>
          <ul className="ci-graph__rows">
            {sortDimensionalFindings(group.rows).map((finding) => {
              const expanded = expandedId === finding.dimensionId
              const fraction = Math.max(0, Math.min(1, finding.severity / SEVERITY_MAX))
              const barW = Math.max(2, fraction * BAR_WIDTH)
              const dimensionLabel = getCiDimensionLabel(finding.dimensionId, language)
              return (
                <li
                  key={finding.dimensionId}
                  className={[
                    'ci-graph-row',
                    `ci-graph-row--${finding.confidence}`,
                    `ci-graph-row--${finding.reviewStatus}`,
                    expanded ? 'ci-graph-row--expanded' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="ci-graph-row__trigger"
                    aria-expanded={expanded}
                    onClick={() => onToggle(finding.dimensionId)}
                  >
                    {expanded ? (
                      <ChevronDown className="ci-graph-row__chev" aria-hidden strokeWidth={2} />
                    ) : (
                      <ChevronRight className="ci-graph-row__chev" aria-hidden strokeWidth={2} />
                    )}
                    <span className="ci-graph-row__name" title={dimensionLabel}>
                      {dimensionLabel}
                    </span>
                    <svg
                      className="ci-graph-row__bar"
                      width={BAR_WIDTH}
                      height={BAR_HEIGHT}
                      viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`}
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`${t('ciSeverityLabel')}: ${finding.severity}/4`}
                    >
                      <rect
                        x={0}
                        y={0}
                        width={BAR_WIDTH}
                        height={BAR_HEIGHT}
                        rx={2}
                        className="ci-graph-row__bar-track"
                      />
                      <rect
                        x={0}
                        y={0}
                        width={barW}
                        height={BAR_HEIGHT}
                        rx={2}
                        className={`ci-graph-row__bar-fill ${severityBarFillClass(finding.severity)}`}
                      />
                    </svg>
                    <div className="ci-graph-row__meta">
                      <span className="ci-graph-row__severity">{finding.severity}/4</span>
                      <span
                        className={`ci-graph-row__conf-dot ci-graph-row__conf-dot--${finding.confidence}`}
                        role="img"
                        aria-label={t(CONFIDENCE_LABEL_KEY[finding.confidence])}
                        title={t(CONFIDENCE_LABEL_KEY[finding.confidence])}
                      />
                      {finding.reviewStatus !== 'pending' ? (
                        <span
                          className={`ci-graph-row__status-icon ci-graph-row__status-icon--${finding.reviewStatus}`}
                          role="img"
                          aria-label={t(REVIEW_KEY[finding.reviewStatus])}
                          title={t(REVIEW_KEY[finding.reviewStatus])}
                        >
                          {finding.reviewStatus === 'accepted' ? (
                            <Check aria-hidden strokeWidth={2.5} />
                          ) : finding.reviewStatus === 'edited' ? (
                            <Pencil aria-hidden strokeWidth={2.5} />
                          ) : (
                            <X aria-hidden strokeWidth={2.5} />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  {expanded ? (
                    <DimensionDetail
                      finding={finding}
                      evidenceItems={evidenceItems}
                      onAccept={onAccept}
                      onReject={onReject}
                      onEdit={onEdit}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <details className="ci-catalog-toggle">
        <summary>
          {CLINICAL_INTELLIGENCE_DIMENSIONS.length} {t('ciCatalogDimensionsLabel')}
        </summary>
        <ol className="ci-catalog-list">
          {CLINICAL_INTELLIGENCE_DIMENSIONS.map((dim) => (
            <li key={dim.id} className="ci-catalog-list__item">
              <code>{dim.id}</code> — {getCiDimensionLabel(dim.id, language)}
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}
