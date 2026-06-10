import { useTranslation } from '../../context/TranslationContext'
import {
  getReceptorClinicalMeaning,
  getActionLabel,
  getScoreLabel,
  RECEPTOR_ACTIONS,
  RECEPTOR_CONFIG,
  RECEPTOR_SCORE_MAX,
  RECEPTOR_SCORE_MIN,
} from '../../data/receptorProfile'
import type {
  ReceptorAction,
  ReceptorConfidence,
  ReceptorProfileDetail,
} from '../../types/knowledgeBase'

const SCORE_OPTIONS = Array.from(
  { length: RECEPTOR_SCORE_MAX - RECEPTOR_SCORE_MIN + 1 },
  (_, i) => RECEPTOR_SCORE_MIN + i,
)

const CONFIDENCE_OPTIONS: ReceptorConfidence[] = ['curated', 'estimated', 'unknown']

interface KnowledgeBaseReceptorEditorProps {
  editMode: boolean
  profile?: Record<string, number>
  details?: Record<string, ReceptorProfileDetail>
  onChange: (
    profile: Record<string, number>,
    details: Record<string, ReceptorProfileDetail>,
  ) => void
}

export function KnowledgeBaseReceptorEditor({
  editMode,
  profile = {},
  details = {},
  onChange,
}: KnowledgeBaseReceptorEditorProps) {
  const { t, language } = useTranslation()

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
    onChange(nextProfile, nextDetails)
  }

  if (editMode) {
    return (
      <div className="kbp-receptor">
        <p className="kbp-receptor__hint">{t('kbReceptorHint')}</p>
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
                            action: e.target.value as ReceptorAction,
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

  // ── View mode ──────────────────────────────────────────────────────────────
  const activeReceptors = RECEPTOR_CONFIG.filter((r) => (profile[r.key] ?? 0) > 0)

  if (activeReceptors.length === 0) {
    return <p className="kbp-receptor__empty">{t('kbReceptorEmptyView')}</p>
  }

  return (
    <div className="kbp-receptor">
      <ul className="kbp-receptor__list">
        {activeReceptors.map((receptor) => {
          const detail = details[receptor.key]
          const score = profile[receptor.key] ?? detail?.score ?? 0
          return (
            <li key={receptor.key} className="kbp-receptor__list-item">
              <span className="kbp-receptor__list-symbol">{receptor.label}</span>
              <span className="kbp-receptor__list-score" aria-hidden>
                {renderScoreDots(score)}
              </span>
              <span className="kbp-receptor__list-score-text">
                {score} · {getScoreLabel(score, language)}
              </span>
              {detail?.action && detail.action !== 'unknown' ? (
                <span className="kbp-receptor__list-action">
                  {getActionLabel(detail.action, language)}
                </span>
              ) : null}
              <span className="kbp-receptor__list-meaning">
                {detail?.clinicalMeaning || getReceptorClinicalMeaning(receptor.key, language)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function renderScoreDots(score: number): string {
  const filled = Math.max(0, Math.min(RECEPTOR_SCORE_MAX, Math.round(score)))
  return '●'.repeat(filled) + '○'.repeat(RECEPTOR_SCORE_MAX - filled)
}
