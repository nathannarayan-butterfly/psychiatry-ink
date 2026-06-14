import { useMemo, useState, type ReactNode } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { ReceptorAffinityEntry } from '../../../../types/knowledgeBase'
import { getReceptorActionLabel, getReceptorDisplayLabel, getReceptorTitleLabel } from '../../../../data/receptorProfile'
import { RECEPTOR_DRUG_PALETTE } from '../../../../data/receptorProfile'
import type { UiLanguage } from '../../../../types/settings'
import { kbT } from '../kbStrings'

type RadarTab = 'radar' | 'ranked' | 'list'

interface ReceptorRadarProps {
  entries: ReceptorAffinityEntry[]
  language: string
  compact?: boolean
  /** Existing ranked list (KnowledgeBaseReceptorEditor view) shown in the List tab. */
  children?: ReactNode
}

const SERIES_COLOR = RECEPTOR_DRUG_PALETTE[0]!

export function ReceptorRadar({ entries, language, compact = false, children }: ReceptorRadarProps) {
  const [tab, setTab] = useState<RadarTab>('radar')
  const lang = (language === 'en' || language === 'fr' || language === 'es' ? language : 'de') as UiLanguage

  const ranked = useMemo(
    () => [...entries].sort((a, b) => (b.affinityPercent ?? -1) - (a.affinityPercent ?? -1)),
    [entries],
  )

  const radarData = useMemo(
    () =>
      ranked
        .filter((e) => e.affinityPercent != null)
        .map((e) => ({
          receptor: getReceptorDisplayLabel(e.target),
          __target: e.target,
          value: e.affinityPercent ?? 0,
          action: e.action,
        })),
    [ranked],
  )

  const canRadar = radarData.length >= 3

  return (
    <div className="kb-receptor-radar">
      <div className="kb-receptor-radar__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'radar'}
          className={`kb-receptor-radar__tab${tab === 'radar' ? ' kb-receptor-radar__tab--active' : ''}`}
          onClick={() => setTab('radar')}
        >
          {kbT(language, 'receptorTabRadar')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ranked'}
          className={`kb-receptor-radar__tab${tab === 'ranked' ? ' kb-receptor-radar__tab--active' : ''}`}
          onClick={() => setTab('ranked')}
        >
          {kbT(language, 'receptorTabRanked')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'list'}
          className={`kb-receptor-radar__tab${tab === 'list' ? ' kb-receptor-radar__tab--active' : ''}`}
          onClick={() => setTab('list')}
        >
          {kbT(language, 'receptorTabList')}
        </button>
      </div>

      {tab === 'radar' ? (
        canRadar ? (
          <div className="kb-chart__canvas" role="img" aria-label={kbT(language, 'receptorTabRadar')}>
            <ResponsiveContainer width="100%" height={compact ? 240 : 320}>
              <RadarChart data={radarData} outerRadius={compact ? '66%' : '72%'}>
                <PolarGrid stroke="var(--border-soft)" />
                <PolarAngleAxis dataKey="receptor" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke={SERIES_COLOR}
                  fill={SERIES_COLOR}
                  fillOpacity={0.12}
                  strokeWidth={1.4}
                  isAnimationActive={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: '0.7rem',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--border-soft)',
                    background: 'var(--surface)',
                  }}
                  labelFormatter={(_label, payload) => {
                    const target = (payload?.[0]?.payload as { __target?: string } | undefined)?.__target
                    return target ? getReceptorDisplayLabel(target) : _label
                  }}
                  formatter={(value) => [`${value}%`, '']}
                />
              </RadarChart>
            </ResponsiveContainer>
            <p className="kb-chart__note">{kbT(language, 'receptorRadarHint')}</p>
          </div>
        ) : (
          <p className="kb-chart__note">{kbT(language, 'receptorRadarHint')}</p>
        )
      ) : null}

      {tab === 'ranked' ? (
        <div className="kb-receptor-ranked">
          {ranked.map((e) => {
            const pct = e.affinityPercent ?? 0
            const displayLabel = getReceptorDisplayLabel(e.target)
            const titleLabel = getReceptorTitleLabel(e.target)
            return (
              <div key={e.target} className="kb-receptor-ranked__row">
                <span className="kb-receptor-ranked__label" title={titleLabel}>{displayLabel}</span>
                <span className="kb-receptor-ranked__bar-wrap">
                  <span
                    className="kb-receptor-ranked__bar"
                    style={{ width: `${pct}%`, background: SERIES_COLOR, opacity: 0.55 }}
                  />
                </span>
                <span className="kb-receptor-ranked__value">
                  {e.affinityPercent == null ? '—' : `${pct}%`}
                  {e.action !== 'unknown' ? (
                    <span className="kb-receptor-ranked__action">
                      {' · '}
                      {getReceptorActionLabel(e.action, lang)}
                    </span>
                  ) : null}
                </span>
              </div>
            )
          })}
          <p className="kb-chart__note">{kbT(language, 'receptorRadarHint')}</p>
        </div>
      ) : null}

      {tab === 'list' ? <div className="kb-receptor-radar__list">{children}</div> : null}
    </div>
  )
}
