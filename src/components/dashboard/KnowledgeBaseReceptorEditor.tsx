import { useTranslation } from '../../context/TranslationContext'
import {
  getClinicalRelevanceLabel,
  getEvidenceQualityLabel,
  getReceptorActionLabel,
  getReceptorClinicalMeaning,
  getActionLabel,
  getScoreLabel,
  RECEPTOR_ACTIONS,
  RECEPTOR_CONFIG,
  RECEPTOR_SCORE_MAX,
  RECEPTOR_SCORE_MIN,
} from '../../data/receptorProfile'
import type {
  KnowledgeBaseDrug,
  LegacyReceptorAction,
  ReceptorAffinityEntry,
  ReceptorConfidence,
  ReceptorProfileDetail,
} from '../../types/knowledgeBase'
import { getDisplayReceptorProfile } from '../../utils/medication/receptorAffinity'

const SCORE_OPTIONS = Array.from(
  { length: RECEPTOR_SCORE_MAX - RECEPTOR_SCORE_MIN + 1 },
  (_, i) => RECEPTOR_SCORE_MIN + i,
)

const CONFIDENCE_OPTIONS: ReceptorConfidence[] = ['curated', 'estimated', 'unknown']

interface KnowledgeBaseReceptorEditorProps {
  editMode: boolean
  drug: KnowledgeBaseDrug
  /** Legacy 1–5 editing callback (only used for non-v2 entries). */
  onLegacyChange: (
    profile: Record<string, number>,
    details: Record<string, ReceptorProfileDetail>,
  ) => void
}

export function KnowledgeBaseReceptorEditor({
  editMode,
  drug,
  onLegacyChange,
}: KnowledgeBaseReceptorEditorProps) {
  const { t, language } = useTranslation()
  const isV2 = drug.receptorProfileVersion === 2 && Array.isArray(drug.receptorAffinityProfile)
  const display = getDisplayReceptorProfile(drug)

  const confidenceLabel = (c: ReceptorConfidence): string => {
    switch (c) {
      case 'curated':
        return t('kbReceptorConfidenceCurated')
      case 'estimated':
        return t('kbReceptorConfidenceEstimated')
      default:
        return t('kbReceptorConfidenceUnknown')
    }
  }

  const profile = drug.receptorProfile ?? {}
  const details = drug.receptorProfileDetails ?? {}

  const updateReceptor = (key: string, patch: Partial<ReceptorProfileDetail>) => {
    const prevDetail = details[key] ?? { score: profile[key] ?? 0 }
    const nextDetail: ReceptorProfileDetail = { ...prevDetail, ...patch }
    const score = patch.score ?? nextDetail.score ?? 0
    nextDetail.score = score

    const nextProfile = { ...profile, [key]: score }
    const nextDetails = { ...details }
    if (score > 0 || nextDetail.action || nextDetail.clinicalMeaning || nextDetail.confidence) {
      nextDetails[key] = nextDetail
    } else {
      delete nextDetails[key]
    }
    onLegacyChange(nextProfile, nextDetails)
  }

  // ── Edit mode ────────────────────────────────────────────────────────────
  if (editMode) {
    // v2 profiles are read-only here; updates go through "Regenerate".
    if (isV2) {
      return (
        <div className="kbp-receptor">
          <p className="kbp-receptor__hint">{t('kbReceptorV2EditHint')}</p>
          <V2ProfileList entries={display.entries} language={language} />
        </div>
      )
    }
    return (
      <div className="kbp-receptor">
        <p className="kbp-receptor__hint kbp-receptor__hint--legacy">{t('kbReceptorLegacyEditHint')}</p>
        <div className="kbp-receptor__scroll">
          <table className="kbp-receptor__table">
            <thead>
              <tr>
                <th className="kbp-receptor__th">{t('kbReceptorColReceptor')}</th>
                <th className="kbp-receptor__th">{t('kbReceptorColScore')}</th>
                <th className="kbp-receptor__th">{t('kbReceptorColAction')}</th>
                <th className="kbp-receptor__th kbp-receptor__th--note">
                  {t('kbReceptorColNote')}
                </th>
                <th className="kbp-receptor__th">{t('kbReceptorColConfidence')}</th>
              </tr>
            </thead>
            <tbody>
              {RECEPTOR_CONFIG.map((receptor) => {
                const detail = details[receptor.key]
                const score = profile[receptor.key] ?? detail?.score ?? 0
                const hasDetail = score > 0
                return (
                  <tr key={receptor.key} className="kbp-receptor__row">
                    <th className="kbp-receptor__row-label" scope="row">
                      <span className="kbp-receptor__symbol">{receptor.label}</span>
                      <span className="kbp-receptor__meaning">
                        {getReceptorClinicalMeaning(receptor.key, language)}
                      </span>
                    </th>
                    <td className="kbp-receptor__cell">
                      <select
                        className="kbp-receptor__select kbp-receptor__select--score"
                        value={score}
                        onChange={(e) =>
                          updateReceptor(receptor.key, { score: Number(e.target.value) })
                        }
                        aria-label={`${receptor.label} ${t('kbReceptorColScore')}`}
                      >
                        {SCORE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s} · {getScoreLabel(s, language)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="kbp-receptor__cell">
                      <select
                        className="kbp-receptor__select"
                        value={detail?.action ?? 'unknown'}
                        disabled={!hasDetail}
                        onChange={(e) =>
                          updateReceptor(receptor.key, {
                            action: e.target.value as LegacyReceptorAction,
                          })
                        }
                        aria-label={`${receptor.label} ${t('kbReceptorColAction')}`}
                      >
                        {RECEPTOR_ACTIONS.map((action) => (
                          <option key={action} value={action}>
                            {getActionLabel(action, language)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="kbp-receptor__cell">
                      <input
                        type="text"
                        className="kbp-receptor__input"
                        value={detail?.clinicalMeaning ?? ''}
                        disabled={!hasDetail}
                        placeholder={t('kbReceptorNotePlaceholder')}
                        onChange={(e) =>
                          updateReceptor(receptor.key, { clinicalMeaning: e.target.value })
                        }
                        aria-label={`${receptor.label} ${t('kbReceptorColNote')}`}
                      />
                    </td>
                    <td className="kbp-receptor__cell">
                      <select
                        className="kbp-receptor__select"
                        value={detail?.confidence ?? 'unknown'}
                        disabled={!hasDetail}
                        onChange={(e) =>
                          updateReceptor(receptor.key, {
                            confidence: e.target.value as ReceptorConfidence,
                          })
                        }
                        aria-label={`${receptor.label} ${t('kbReceptorColConfidence')}`}
                      >
                        {CONFIDENCE_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {confidenceLabel(c)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── View mode (percentage display for v2 + legacy) ─────────────────────────
  if (display.isEmpty) {
    return <p className="kbp-receptor__empty">{t('kbReceptorEmptyView')}</p>
  }

  return (
    <div className="kbp-receptor">
      {display.isLegacy ? (
        <p className="kbp-receptor__legacy-note">{t('kbReceptorLegacyConverted')}</p>
      ) : null}
      <V2ProfileList entries={display.entries} language={language} />
      <p className="kbp-receptor__scale-note">{t('kbReceptorAffinityNote')}</p>
    </div>
  )
}

function V2ProfileList({
  entries,
  language,
}: {
  entries: ReceptorAffinityEntry[]
  language: 'de' | 'en' | 'fr' | 'es'
}) {
  const { t } = useTranslation()
  const sorted = [...entries].sort(
    (a, b) => (b.affinityPercent ?? -1) - (a.affinityPercent ?? -1),
  )
  return (
    <ul className="kbp-receptor__list">
      {sorted.map((entry) => {
        const hasRaw = entry.rawKiNm != null || entry.rawIc50Nm != null || entry.pKi != null
        return (
          <li key={entry.target} className="kbp-receptor__list-item">
            <span className="kbp-receptor__list-symbol">{entry.target}</span>
            <span className="kbp-receptor__list-score-text">
              {entry.affinityPercent == null ? '—' : `${entry.affinityPercent}%`}
            </span>
            {entry.action !== 'unknown' ? (
              <span className="kbp-receptor__list-action">
                {getReceptorActionLabel(entry.action, language)}
              </span>
            ) : null}
            {entry.clinicalRelevance ? (
              <span className="kbp-receptor__list-relevance">
                {getClinicalRelevanceLabel(entry.clinicalRelevance, language)}
              </span>
            ) : null}
            {entry.isEstimated ? (
              <span className="kbp-receptor__est-badge">{t('kbReceptorEstimated')}</span>
            ) : null}
            <span className="kbp-receptor__list-meaning">
              {getEvidenceQualityLabel(entry.evidenceQuality, language)}
              {entry.sourceNote ? ` · ${entry.sourceNote}` : ''}
            </span>
            {hasRaw ? (
              <details className="kbp-receptor__raw">
                <summary>{t('kbReceptorRawDataSummary')}</summary>
                <span className="kbp-receptor__raw-values">
                  {entry.rawKiNm != null ? `Ki ${entry.rawKiNm} nM` : null}
                  {entry.rawIc50Nm != null ? ` · IC50 ${entry.rawIc50Nm} nM` : null}
                  {entry.pKi != null ? ` · pKi ${entry.pKi}` : null}
                </span>
              </details>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
