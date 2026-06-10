import { useMemo, useState } from 'react'
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import {
  getActionLabel,
  getOrderedReceptorKeys,
  getReceptorClinicalMeaning,
  getReceptorLabel,
  getScoreLabel,
  loadUserReceptorConfig,
  RECEPTOR_SCORE_MAX,
} from '../../data/receptorProfile'
import type { KnowledgeBaseDrug } from '../../types/knowledgeBase'
import type { UiLanguage } from '../../types/settings'
import {
  computeCombinedBurden,
  getActiveReceptorKeys,
  getScore,
  resolveReceptorProfiles,
  type BurdenLevel,
  type ReceptorMedInput,
} from '../../utils/medication/receptorBurden'

type ReceptorView = 'matrix' | 'burden' | 'radar'

interface ReceptorProfileSectionProps {
  activeMeds: ReceptorMedInput[]
  drugs: KnowledgeBaseDrug[]
  language: UiLanguage
}

/** hex (#rrggbb) → rgba string with the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function cellShade(color: string, score: number): string {
  if (score <= 0) return 'transparent'
  const alpha = 0.12 + (score / RECEPTOR_SCORE_MAX) * 0.55
  return hexToRgba(color, alpha)
}

function burdenWord(level: BurdenLevel, language: UiLanguage): string {
  switch (level) {
    case 'high':
      return translateMedicationUi(language, 'medReceptorBurdenHigh')
    case 'moderate':
      return translateMedicationUi(language, 'medReceptorBurdenModerate')
    default:
      return translateMedicationUi(language, 'medReceptorBurdenLow')
  }
}

export function ReceptorProfileSection({
  activeMeds,
  drugs,
  language,
}: ReceptorProfileSectionProps) {
  const [view, setView] = useState<ReceptorView>('matrix')

  const resolved = useMemo(
    () => resolveReceptorProfiles(activeMeds, drugs),
    [activeMeds, drugs],
  )

  const orderedKeys = useMemo(() => getOrderedReceptorKeys(loadUserReceptorConfig()), [])
  const activeKeys = useMemo(
    () => getActiveReceptorKeys(resolved, orderedKeys),
    [resolved, orderedKeys],
  )

  if (resolved.length === 0) {
    return (
      <div className="receptor-profile">
        <p className="receptor-profile__empty">{translateMedicationUi(language, 'medReceptorEmpty')}</p>
      </div>
    )
  }

  const legend = (
    <ul className="receptor-profile__legend" aria-label={translateMedicationUi(language, 'medReceptorLegend')}>
      {resolved.map((r) => (
        <li key={r.medId} className="receptor-profile__legend-item">
          <span className="receptor-profile__swatch" style={{ background: r.color }} aria-hidden />
          {r.medName}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="receptor-profile">
      <div className="receptor-profile__tabs" role="tablist">
        <TabButton active={view === 'matrix'} onClick={() => setView('matrix')}>
          {translateMedicationUi(language, 'medReceptorTabMatrix')}
        </TabButton>
        <TabButton active={view === 'burden'} onClick={() => setView('burden')}>
          {translateMedicationUi(language, 'medReceptorTabBurden')}
        </TabButton>
        <TabButton active={view === 'radar'} onClick={() => setView('radar')}>
          {translateMedicationUi(language, 'medReceptorTabRadar')}
        </TabButton>
      </div>

      {view === 'matrix' && (
        <MatrixView resolved={resolved} activeKeys={activeKeys} language={language} legend={legend} />
      )}
      {view === 'burden' && (
        <BurdenView resolved={resolved} activeKeys={activeKeys} language={language} legend={legend} />
      )}
      {view === 'radar' && (
        <RadarView resolved={resolved} activeKeys={activeKeys} language={language} legend={legend} />
      )}

      <p className="receptor-profile__safety">
        {translateMedicationUi(language, 'medReceptorSafetyNote')}
      </p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`receptor-profile__tab${active ? ' receptor-profile__tab--active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// ── View 1: Matrix / heatmap (default) ───────────────────────────────────────

interface ViewProps {
  resolved: ReturnType<typeof resolveReceptorProfiles>
  activeKeys: ReturnType<typeof getActiveReceptorKeys>
  language: UiLanguage
  legend: React.ReactNode
}

function MatrixView({ resolved, activeKeys, language, legend }: ViewProps) {
  if (activeKeys.length === 0) {
    return <p className="receptor-profile__empty">{translateMedicationUi(language, 'medReceptorEmpty')}</p>
  }
  return (
    <div className="receptor-profile__view">
      {legend}
      <div className="receptor-matrix__scroll">
        <table className="receptor-matrix__table">
          <thead>
            <tr>
              <th className="receptor-matrix__corner">{translateMedicationUi(language, 'medReceptorColReceptor')}</th>
              {resolved.map((r) => (
                <th
                  key={r.medId}
                  className="receptor-matrix__col-header"
                  title={r.medName}
                  style={{ color: r.color }}
                >
                  {r.medName}
                </th>
              ))}
              <th className="receptor-matrix__meaning-header">
                {translateMedicationUi(language, 'medReceptorColMeaning')}
              </th>
            </tr>
          </thead>
          <tbody>
            {activeKeys.map((key) => (
              <tr key={key}>
                <th className="receptor-matrix__row-header">{getReceptorLabel(key)}</th>
                {resolved.map((r) => {
                  const score = getScore(r, key)
                  const action = r.details?.[key]?.action
                  const actionText =
                    action && action !== 'unknown' ? ` · ${getActionLabel(action, language)}` : ''
                  return (
                    <td
                      key={r.medId}
                      className={`receptor-matrix__cell${score > 0 ? '' : ' receptor-matrix__cell--zero'}`}
                      style={{ background: cellShade(r.color, score) }}
                      title={`${getReceptorLabel(key)} · ${r.medName} · ${score}/${RECEPTOR_SCORE_MAX} (${getScoreLabel(score, language)})${actionText}`}
                    >
                      {score}
                    </td>
                  )
                })}
                <td className="receptor-matrix__meaning">
                  {getReceptorClinicalMeaning(key, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── View 2: Combined receptor burden ─────────────────────────────────────────

function BurdenView({ resolved, activeKeys, language, legend }: ViewProps) {
  const burdens = computeCombinedBurden(resolved, activeKeys).filter((b) => b.total > 0)

  if (burdens.length === 0) {
    return <p className="receptor-profile__empty">{translateMedicationUi(language, 'medReceptorEmpty')}</p>
  }

  return (
    <div className="receptor-profile__view">
      {legend}
      <p className="receptor-profile__approx">
        {translateMedicationUi(language, 'medReceptorBurdenCombined')} —{' '}
        {translateMedicationUi(language, 'medReceptorBurdenApprox')}
      </p>
      <ul className="receptor-burden">
        {burdens.map((b) => (
          <li key={b.key} className={`receptor-burden__row receptor-burden__row--${b.level}`}>
            <div className="receptor-burden__head">
              <span className="receptor-burden__label">{getReceptorLabel(b.key)}</span>
              <span className="receptor-burden__level">{burdenWord(b.level, language)}</span>
              {b.level === 'high' ? (
                <span className="receptor-burden__warning" aria-hidden>
                  ⚠
                </span>
              ) : null}
              <span className="receptor-burden__value">
                {b.total}/{RECEPTOR_SCORE_MAX}
              </span>
            </div>
            <div className="receptor-burden__bar" role="presentation">
              {b.contributors.map((c) => (
                <span
                  key={c.medId}
                  className="receptor-burden__segment"
                  style={{
                    width: `${(c.score / RECEPTOR_SCORE_MAX) * 100}%`,
                    background: c.color,
                  }}
                  title={`${c.medName} · ${c.score}/${RECEPTOR_SCORE_MAX}`}
                />
              ))}
            </div>
            <div className="receptor-burden__meta">
              <span className="receptor-burden__contributors">
                {b.contributors.map((c) => c.medName).join(' + ')}
              </span>
              <span className="receptor-burden__meaning">
                {' — '}
                {getReceptorClinicalMeaning(b.key, language)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── View 3: Radar / receptor fingerprint (optional) ──────────────────────────

function RadarView({ resolved, activeKeys, language, legend }: ViewProps) {
  if (activeKeys.length < 3) {
    return (
      <div className="receptor-profile__view">
        {legend}
        <p className="receptor-profile__hint">{translateMedicationUi(language, 'medReceptorRadarManyHint')}</p>
      </div>
    )
  }

  const data = activeKeys.map((key) => {
    const entry: Record<string, number | string> = { receptor: getReceptorLabel(key) }
    for (const r of resolved) entry[r.medId] = getScore(r, key)
    return entry
  })

  return (
    <div className="receptor-profile__view">
      {legend}
      {resolved.length > 3 ? (
        <p className="receptor-profile__hint">{translateMedicationUi(language, 'medReceptorRadarManyHint')}</p>
      ) : null}
      <div className="receptor-radar-chart">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--border-soft)" />
            <PolarAngleAxis
              dataKey="receptor"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[0, RECEPTOR_SCORE_MAX]}
              tickCount={RECEPTOR_SCORE_MAX + 1}
              tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
              axisLine={false}
            />
            {resolved.map((r) => (
              <Radar
                key={r.medId}
                name={r.medName}
                dataKey={r.medId}
                stroke={r.color}
                fill={r.color}
                fillOpacity={0.18}
                strokeWidth={1.6}
              />
            ))}
            <Tooltip
              formatter={(value, name) => [`${value}/${RECEPTOR_SCORE_MAX}`, name]}
              contentStyle={{
                fontSize: '0.72rem',
                borderRadius: '0.4rem',
                border: '1px solid var(--border-soft)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
