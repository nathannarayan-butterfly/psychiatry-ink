/**
 * Clinical Intelligence — Layer 2 visualization.
 *
 * Horizontal SVG bar chart over the 15 transdiagnostic mechanisms. Bar length
 * and fill colour both reflect confidence (low = 1/3, moderate = 2/3, high = full).
 * Each row is a clickable accordion trigger handled by the parent panel.
 */
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Check, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  CLINICAL_INTELLIGENCE_MECHANISMS,
  getClinicalIntelligenceMechanism,
} from '../../../data/clinicalIntelligence/mechanisms'
import { sortMechanismHypotheses } from '../../../services/clinicalIntelligence/mechanismInference'
import type {
  ClinicalIntelligenceMechanismId,
  MechanismHypothesis,
  MechanismInferenceResult,
} from '../../../types/clinicalIntelligence'
import { getCiMechanismLabel } from '../../../data/clinicalIntelligenceTranslations'
import { CiConfidenceLegend } from './CiConfidenceLegend'
import {
  confidenceBarFillClass,
  type ConfidenceBarFillClass,
} from '../../../utils/clinicalIntelligence/severityGraph'

interface MechanismHypothesesGraphProps {
  result: MechanismInferenceResult
  expandedId: ClinicalIntelligenceMechanismId | null
  onToggle: (id: ClinicalIntelligenceMechanismId) => void
  onAccept: (id: ClinicalIntelligenceMechanismId) => void
  onReject: (id: ClinicalIntelligenceMechanismId) => void
  onEdit: (
    id: ClinicalIntelligenceMechanismId,
    patch: Partial<
      Pick<MechanismHypothesis, 'clinicalImplication' | 'treatmentRelevance' | 'uncertainty'>
    >,
  ) => void
}

const CONFIDENCE_LABEL_KEY: Record<
  MechanismHypothesis['confidence'],
  'ciConfidenceLow' | 'ciConfidenceModerate' | 'ciConfidenceHigh'
> = {
  low: 'ciConfidenceLow',
  moderate: 'ciConfidenceModerate',
  high: 'ciConfidenceHigh',
}

const REVIEW_KEY: Record<
  MechanismHypothesis['reviewStatus'],
  'ciStatusPending' | 'ciStatusAccepted' | 'ciStatusEdited' | 'ciStatusRejected'
> = {
  pending: 'ciStatusPending',
  accepted: 'ciStatusAccepted',
  edited: 'ciStatusEdited',
  rejected: 'ciStatusRejected',
}

const CONFIDENCE_FRACTION: Record<MechanismHypothesis['confidence'], number> = {
  low: 1 / 3,
  moderate: 2 / 3,
  high: 1,
}

const BAR_WIDTH = 220
const BAR_HEIGHT = 10

export interface MechanismConfidenceBar {
  mechanismId: ClinicalIntelligenceMechanismId
  confidence: MechanismHypothesis['confidence']
  fraction: number
  confidenceClass: ConfidenceBarFillClass
}

/** Pure helper exposed for unit tests. */
export function computeMechanismBars(
  hypotheses: MechanismHypothesis[],
): MechanismConfidenceBar[] {
  return sortMechanismHypotheses(hypotheses).map((m) => ({
    mechanismId: m.mechanismId,
    confidence: m.confidence,
    fraction: CONFIDENCE_FRACTION[m.confidence],
    confidenceClass: confidenceBarFillClass(m.confidence),
  }))
}

function MechanismDetail({
  hypothesis,
  onAccept,
  onReject,
  onEdit,
}: {
  hypothesis: MechanismHypothesis
  onAccept: (id: ClinicalIntelligenceMechanismId) => void
  onReject: (id: ClinicalIntelligenceMechanismId) => void
  onEdit: (
    id: ClinicalIntelligenceMechanismId,
    patch: Partial<
      Pick<MechanismHypothesis, 'clinicalImplication' | 'treatmentRelevance' | 'uncertainty'>
    >,
  ) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [implication, setImplication] = useState(hypothesis.clinicalImplication)
  const [treatment, setTreatment] = useState(hypothesis.treatmentRelevance)
  const [uncertainty, setUncertainty] = useState(hypothesis.uncertainty)

  if (editing) {
    return (
      <div className="ci-graph-row__edit">
        <label className="ci-row__label">
          {t('ciClinicalImplication')}
          <textarea
            className="ci-row__textarea"
            rows={3}
            value={implication}
            onChange={(event) => setImplication(event.target.value)}
          />
        </label>
        <label className="ci-row__label">
          {t('ciTreatmentRelevance')}
          <textarea
            className="ci-row__textarea"
            rows={3}
            value={treatment}
            onChange={(event) => setTreatment(event.target.value)}
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
              onEdit(hypothesis.mechanismId, {
                clinicalImplication: implication.trim() || hypothesis.clinicalImplication,
                treatmentRelevance: treatment.trim() || hypothesis.treatmentRelevance,
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
              setImplication(hypothesis.clinicalImplication)
              setTreatment(hypothesis.treatmentRelevance)
              setUncertainty(hypothesis.uncertainty)
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
      <p className="ci-row__summary">{hypothesis.clinicalImplication}</p>
      <p className="ci-row__meta">
        <span className="ci-row__meta-label">{t('ciTreatmentRelevance')}:</span>{' '}
        {hypothesis.treatmentRelevance}
      </p>
      {hypothesis.linkedDimensions.length > 0 ? (
        <div className="ci-graph-row__chips" aria-label={t('ciLinkedDimensions')}>
          <span className="ci-row__meta-label">{t('ciLinkedDimensions')}:</span>
          {hypothesis.linkedDimensions.map((id) => (
            <span key={id} className="ci-graph-row__chip">
              {id}
            </span>
          ))}
        </div>
      ) : null}
      {hypothesis.supportingEvidenceIds.length > 0 ? (
        <p className="ci-row__meta">
          <span className="ci-row__meta-label">{t('ciSupportingEvidence')}:</span>{' '}
          {hypothesis.supportingEvidenceIds.join(', ')}
        </p>
      ) : null}
      {hypothesis.uncertainty ? (
        <p className="ci-row__meta">
          <span className="ci-row__meta-label">{t('ciUncertaintyLabel')}:</span>{' '}
          {hypothesis.uncertainty}
        </p>
      ) : null}
      <div className="ci-row__actions">
        <button
          type="button"
          className="ci-btn ci-btn--primary"
          onClick={() => onAccept(hypothesis.mechanismId)}
          disabled={hypothesis.reviewStatus === 'accepted'}
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
          onClick={() => onReject(hypothesis.mechanismId)}
        >
          <Trash2 className="ci-btn__icon" aria-hidden strokeWidth={2} />
          {t('ciActionReject')}
        </button>
      </div>
    </div>
  )
}

export function MechanismHypothesesGraph({
  result,
  expandedId,
  onToggle,
  onAccept,
  onReject,
  onEdit,
}: MechanismHypothesesGraphProps) {
  const { t, language } = useTranslation()
  const sorted = useMemo(
    () => sortMechanismHypotheses(result.activeMechanisms),
    [result.activeMechanisms],
  )
  const onlyExploratory =
    sorted.length === 0 && result.exploratoryInsufficientEvidence.length > 0

  if (sorted.length === 0) {
    return (
      <div className="ci-graph" aria-label={t('ciCardMechanism')}>
        {onlyExploratory ? (
          <p className="ci-warning">{t('ciMechanismOnlyExploratoryWarning')}</p>
        ) : null}
        <p className="cm-empty">{t('ciNoActiveMechanisms')}</p>
      </div>
    )
  }

  return (
    <div className="ci-graph" aria-label={t('ciCardMechanism')}>
      <CiConfidenceLegend />
      <p className="ci-graph__hint">{t('ciGraphMechanismHint')}</p>
      <ul className="ci-graph__rows">
        {sorted.map((hypothesis) => {
          const expanded = expandedId === hypothesis.mechanismId
          const mech = getClinicalIntelligenceMechanism(hypothesis.mechanismId)
          const fraction = CONFIDENCE_FRACTION[hypothesis.confidence]
          const barW = Math.max(2, fraction * BAR_WIDTH)
          const fillClass = confidenceBarFillClass(hypothesis.confidence)
          return (
            <li
              key={hypothesis.mechanismId}
              className={[
                'ci-graph-row',
                'ci-graph-row--mech',
                `ci-graph-row--${hypothesis.confidence}`,
                `ci-graph-row--${hypothesis.reviewStatus}`,
                expanded ? 'ci-graph-row--expanded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className="ci-graph-row__trigger"
                aria-expanded={expanded}
                onClick={() => onToggle(hypothesis.mechanismId)}
              >
                {expanded ? (
                  <ChevronDown className="ci-graph-row__chev" aria-hidden strokeWidth={2} />
                ) : (
                  <ChevronRight className="ci-graph-row__chev" aria-hidden strokeWidth={2} />
                )}
                <span className="ci-graph-row__name" title={mech.descriptionDe}>
                  {getCiMechanismLabel(hypothesis.mechanismId, language)}
                </span>
                <svg
                  className="ci-graph-row__bar"
                  width={BAR_WIDTH}
                  height={BAR_HEIGHT}
                  viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={t(CONFIDENCE_LABEL_KEY[hypothesis.confidence])}
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
                    className={`ci-graph-row__bar-fill ${fillClass}`}
                  />
                </svg>
                <div className="ci-graph-row__meta">
                  <span
                    className={`ci-graph-row__conf-dot ci-graph-row__conf-dot--${hypothesis.confidence}`}
                    role="img"
                    aria-label={t(CONFIDENCE_LABEL_KEY[hypothesis.confidence])}
                    title={t(CONFIDENCE_LABEL_KEY[hypothesis.confidence])}
                  />
                  {hypothesis.linkedDimensions.length > 0 ? (
                    <span className="ci-graph-row__linked-count" aria-hidden>
                      ↳ {hypothesis.linkedDimensions.length}
                    </span>
                  ) : null}
                  {hypothesis.reviewStatus !== 'pending' ? (
                    <span
                      className={`ci-graph-row__status-icon ci-graph-row__status-icon--${hypothesis.reviewStatus}`}
                      role="img"
                      aria-label={t(REVIEW_KEY[hypothesis.reviewStatus])}
                      title={t(REVIEW_KEY[hypothesis.reviewStatus])}
                    >
                      {hypothesis.reviewStatus === 'accepted' ? (
                        <Check aria-hidden strokeWidth={2.5} />
                      ) : hypothesis.reviewStatus === 'edited' ? (
                        <Pencil aria-hidden strokeWidth={2.5} />
                      ) : (
                        <X aria-hidden strokeWidth={2.5} />
                      )}
                    </span>
                  ) : null}
                </div>
              </button>
              {expanded ? (
                <MechanismDetail
                  hypothesis={hypothesis}
                  onAccept={onAccept}
                  onReject={onReject}
                  onEdit={onEdit}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
      <details className="ci-catalog-toggle">
        <summary>
          {CLINICAL_INTELLIGENCE_MECHANISMS.length} {t('ciCatalogMechanismsLabel')}
        </summary>
        <ol className="ci-catalog-list">
          {CLINICAL_INTELLIGENCE_MECHANISMS.map((mech) => (
            <li key={mech.id} className="ci-catalog-list__item">
              <code>{mech.id}</code> — {getCiMechanismLabel(mech.id, language)}
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}
