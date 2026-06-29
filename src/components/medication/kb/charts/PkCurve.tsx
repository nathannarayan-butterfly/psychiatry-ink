import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PharmacokineticData } from '../../../../types/knowledgeBase'
import { kbT } from '../kbStrings'

interface PkCurveProps {
  pk: PharmacokineticData
  language: string
  chartExportKey?: string
}

/**
 * Schematic one-compartment oral concentration–time curve derived from the
 * half-life (elimination) and Tmax (absorption). This is explicitly NOT a real
 * pharmacokinetic measurement — it visualises the qualitative shape only.
 */
function buildCurve(halfLifeHours: number, tmaxHours: number | null | undefined) {
  const ke = Math.LN2 / halfLifeHours
  let ka: number
  if (tmaxHours != null && tmaxHours > 0) {
    // Solve tmax = ln(ka/ke)/(ka-ke) for ka by bisection (tmax decreases as ka↑).
    let lo = ke * 1.05
    let hi = ke * 400
    ka = (lo + hi) / 2
    for (let i = 0; i < 64; i++) {
      const mid = (lo + hi) / 2
      const t = Math.log(mid / ke) / (mid - ke)
      if (t > tmaxHours) lo = mid
      else hi = mid
      ka = mid
    }
  } else {
    ka = ke * 4
  }
  const effectiveTmax =
    tmaxHours != null && tmaxHours > 0 ? tmaxHours : Math.log(ka / ke) / (ka - ke)
  const tEnd = Math.max(effectiveTmax * 2.2, halfLifeHours * 5)
  const N = 64
  const raw: { t: number; c: number }[] = []
  let peak = 0
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * tEnd
    const c = (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t))
    const safe = Number.isFinite(c) && c > 0 ? c : 0
    raw.push({ t, c: safe })
    if (safe > peak) peak = safe
  }
  const scale = peak > 0 ? 100 / peak : 1
  return raw.map((p) => ({
    t: Math.round(p.t * 10) / 10,
    c: Math.round(p.c * scale),
  }))
}

export function PkCurve({ pk, language, chartExportKey }: PkCurveProps) {
  const data = useMemo(() => {
    if (pk.halfLifeHours == null || pk.halfLifeHours <= 0) return null
    return buildCurve(pk.halfLifeHours, pk.tmaxHours)
  }, [pk.halfLifeHours, pk.tmaxHours])

  if (!data) return null

  return (
    <div className="kb-pk-curve">
      <p className="kb-chart__caption">{kbT(language, 'pkCurveTitle')}</p>
      <div
        className="kb-chart__canvas"
        role="img"
        aria-label={kbT(language, 'pkCurveTitle')}
        {...(chartExportKey ? { 'data-kb-export-chart': chartExportKey } : {})}
      >
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
            <defs>
              <linearGradient id="kbPkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.14} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              stroke="var(--border-soft)"
              label={{
                value: kbT(language, 'pkCurveAxisTime'),
                position: 'insideBottom',
                offset: -8,
                fill: 'var(--text-muted)',
                fontSize: 10,
              }}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              stroke="var(--border-soft)"
              width={28}
              domain={[0, 100]}
            />
            {pk.tmaxHours != null && pk.tmaxHours > 0 ? (
              <ReferenceLine
                x={Math.round(pk.tmaxHours * 10) / 10}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                label={{ value: 'Tmax', fill: 'var(--text-muted)', fontSize: 9, position: 'top' }}
              />
            ) : null}
            <Tooltip
              contentStyle={{
                fontSize: '0.7rem',
                borderRadius: '0.4rem',
                border: '1px solid var(--border-soft)',
                background: 'var(--surface)',
              }}
              labelFormatter={(v) => `${v} ${kbT(language, 'hours')}`}
              formatter={(value) => [`${value}`, kbT(language, 'pkCurveAxisConc')]}
            />
            <Area
              type="monotone"
              dataKey="c"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="url(#kbPkFill)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="kb-chart__note">{kbT(language, 'pkSchematicNote')}</p>
    </div>
  )
}
