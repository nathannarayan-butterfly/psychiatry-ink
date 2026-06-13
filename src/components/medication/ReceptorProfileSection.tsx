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
  getEvidenceQualityLabel,
  getReceptorActionLabel,
  getReceptorMeaningByTarget,
  normalizeReceptorTarget,
} from '../../data/receptorProfile'
import type { KnowledgeBaseDrug, ReceptorAffinityEntry } from '../../types/knowledgeBase'
import type { UiLanguage } from '../../types/settings'
import {
  AFFINITY_MAX,
  computeCombinedBurden,
  getActiveReceptorTargets,
  getAffinityPercent,
  getEntry,
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

function cellShade(color: string, percent: number): string {
  if (percent <= 0) return 'transparent'
  const alpha = 0.1 + (percent / 100) * 0.55
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

/** Short action text appended after a value (omitted when unknown). */
function actionSuffix(entry: ReceptorAffinityEntry | undefined, language: UiLanguage): string {
  if (!entry || entry.action === 'unknown') return ''
  return ` · ${getReceptorActionLabel(entry.action, language)}`
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

  const activeTargets = useMemo(() => getActiveReceptorTargets(resolved), [resolved])

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
          {r.isLegacy ? (
            <span className="receptor-profile__legacy-badge" title={translateMedicationUi(language, 'medReceptorLegacyConverted')}>
              {translateMedicationUi(language, 'medReceptorLegacyBadge')}
            </span>
          ) : null}
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
        <MatrixView resolved={resolved} activeTargets={activeTargets} language={language} legend={legend} />
      )}
      {view === 'burden' && (
        <BurdenView resolved={resolved} activeTargets={activeTargets} language={language} legend={legend} />
      )}
      {view === 'radar' && (
        <RadarView resolved={resolved} activeTargets={activeTargets} language={language} legend={legend} />
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
  activeTargets: string[]
  language: UiLanguage
  legend: React.ReactNode
}

function MatrixView({ resolved, activeTargets, language, legend }: ViewProps) {
  if (activeTargets.length === 0) {
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
            {activeTargets.map((target) => (
              <tr key={normalizeReceptorTarget(target)}>
                <th className="receptor-matrix__row-header">{target}</th>
                {resolved.map((r) => {
                  const entry = getEntry(r, target)
                  const percent = entry?.affinityPercent ?? null
                  const hasValue = percent != null && percent > 0
                  const estimated = entry?.isEstimated || r.isLegacy
                  const title = entry
                    ? `${target} · ${r.medName} · ${percent == null ? '—' : `${percent}%`}${actionSuffix(entry, language)}${
                        estimated ? ` · ${translateMedicationUi(language, 'medReceptorEstimated')}` : ''
                      }`
                    : `${target} · ${r.medName} · —`
                  return (
                    <td
                      key={r.medId}
                      className={`receptor-matrix__cell${hasValue ? '' : ' receptor-matrix__cell--zero'}`}
                      style={{ background: cellShade(r.color, percent ?? 0) }}
                      title={title}
                    >
                      {percent == null ? '—' : `${percent}%`}
                      {hasValue && estimated ? (
                        <span className="receptor-matrix__est" aria-hidden> ~</span>
                      ) : null}
                    </td>
                  )
                })}
                <td className="receptor-matrix__meaning">
                  {getReceptorMeaningByTarget(target, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── View 2: Combined receptor affinity ───────────────────────────────────────

function BurdenView({ resolved, activeTargets, language, legend }: ViewProps) {
  const burdens = computeCombinedBurden(resolved, activeTargets).filter((b) => b.total > 0)

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
          <li key={normalizeReceptorTarget(b.target)} className={`receptor-burden__row receptor-burden__row--${b.level}`}>
            <div className="receptor-burden__head">
              <span className="receptor-burden__label">{b.target}</span>
              <span className="receptor-burden__level">{burdenWord(b.level, language)}</span>
              {b.level === 'high' ? (
                <span className="receptor-burden__warning" aria-hidden>
                  ⚠
                </span>
              ) : null}
              <span className="receptor-burden__value">{b.total}%</span>
            </div>
            <div className="receptor-burden__bar" role="presentation">
              {b.contributors.map((c) => (
                <span
                  key={c.medId}
                  className="receptor-burden__segment"
                  style={{
                    width: `${(c.percent / AFFINITY_MAX) * 100}%`,
                    background: c.color,
                  }}
                  title={`${c.medName} · ${c.percent}%`}
                />
              ))}
            </div>
            <div className="receptor-burden__meta">
              <span className="receptor-burden__contributors">
                {b.contributors.map((c) => c.medName).join(' + ')}
              </span>
              <span className="receptor-burden__meaning">
                {' — '}
                {getReceptorMeaningByTarget(b.target, language)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── View 3: Radar / receptor affinity fingerprint ────────────────────────────

interface RadarTooltipPayloadItem {
  name?: unknown
  value?: unknown
  color?: string
  payload?: Record<string, unknown>
}

function RadarView({ resolved, activeTargets, language, legend }: ViewProps) {
  if (activeTargets.length < 3) {
    return (
      <div className="receptor-profile__view">
        {legend}
        <p className="receptor-profile__hint">{translateMedicationUi(language, 'medReceptorRadarManyHint')}</p>
      </div>
    )
  }

  const data = activeTargets.map((target) => {
    const entry: Record<string, number | string | null> = {
      receptor: target,
      __target: target,
    }
    for (const r of resolved) entry[r.medId] = getAffinityPercent(r, target) ?? 0
    return entry
  })

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: readonly RadarTooltipPayloadItem[]
  }) => {
    if (!active || !payload || payload.length === 0) return null
    const target = (payload[0]?.payload?.__target as string) ?? ''
    return (
      <div
        className="receptor-radar-tooltip"
        style={{
          fontSize: '0.72rem',
          borderRadius: '0.4rem',
          border: '1px solid var(--border-soft)',
          background: 'var(--surface, #fff)',
          padding: '0.5rem 0.6rem',
          maxWidth: 260,
        }}
      >
        <strong>{target}</strong>
        <ul style={{ listStyle: 'none', margin: '0.25rem 0', padding: 0 }}>
          {payload.map((item) => {
            const medId = String(item.name ?? '')
            const r = resolved.find((d) => d.medId === medId)
            if (!r) return null
            const e = getEntry(r, target)
            const value = Number(item.value ?? 0)
            const parts: string[] = [`${Number.isFinite(value) ? value : 0}%`]
            if (e && e.action !== 'unknown') parts.push(getReceptorActionLabel(e.action, language))
            if (e?.rawKiNm != null) parts.push(`Ki ${e.rawKiNm} nM`)
            if (e?.pKi != null) parts.push(`pKi ${e.pKi}`)
            if (e) parts.push(getEvidenceQualityLabel(e.evidenceQuality, language))
            const flag = r.isLegacy
              ? ` · ${translateMedicationUi(language, 'medReceptorLegacyBadge')}`
              : e?.isEstimated
                ? ` · ${translateMedicationUi(language, 'medReceptorEstimated')}`
                : ''
            return (
              <li key={medId} style={{ color: item.color }}>
                {r.medName}: {parts.join(' · ')}
                {flag}
              </li>
            )
          })}
        </ul>
        <span style={{ color: 'var(--text-muted)' }}>
          {translateMedicationUi(language, 'medReceptorTooltipDisclaimer')}
        </span>
      </div>
    )
  }

  return (
    <div className="receptor-profile__view">
      {legend}
      <p className="receptor-profile__approx">
        {translateMedicationUi(language, 'medReceptorAffinityAxisLabel')}
      </p>
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
              domain={[0, AFFINITY_MAX]}
              tickCount={6}
              tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
              axisLine={false}
            />
            {resolved.map((r) => (
              <Radar
                key={r.medId}
                name={r.medId}
                dataKey={r.medId}
                stroke={r.color}
                fill={r.color}
                fillOpacity={0.18}
                strokeWidth={1.6}
              />
            ))}
            <Tooltip content={renderTooltip} />
            <Legend
              wrapperStyle={{ fontSize: '0.72rem' }}
              formatter={(value) => resolved.find((r) => r.medId === value)?.medName ?? value}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
