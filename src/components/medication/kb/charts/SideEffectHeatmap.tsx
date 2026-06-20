import { useMemo } from 'react'
import {
  pickKbLocalizedText,
  type SideEffectEntry,
  type SideEffectFrequency,
  type SideEffectSeverity,
} from '../../../../types/knowledgeBase'
import { kbT, type KbStringKey } from '../kbStrings'

interface SideEffectHeatmapProps {
  entries: SideEffectEntry[]
  language: string
}

/** Frequency → fill intensity (0..1). */
const FREQUENCY_ALPHA: Record<SideEffectFrequency, number> = {
  veryCommon: 0.62,
  common: 0.46,
  uncommon: 0.32,
  rare: 0.2,
  unknown: 0.1,
}

/** Severity → CSS variable (defined in notion-preview.css). */
const SEVERITY_VAR: Record<SideEffectSeverity, string> = {
  mild: 'var(--kb-sev-mild)',
  moderate: 'var(--kb-sev-moderate)',
  severe: 'var(--kb-sev-severe)',
  dangerous: 'var(--kb-sev-dangerous)',
}

const FREQUENCY_KEY: Record<SideEffectFrequency, KbStringKey> = {
  veryCommon: 'freqVeryCommon',
  common: 'freqCommon',
  uncommon: 'freqUncommon',
  rare: 'freqRare',
  unknown: 'freqUnknown',
}

const SEVERITY_KEY: Record<SideEffectSeverity, KbStringKey> = {
  mild: 'sevMild',
  moderate: 'sevModerate',
  severe: 'sevSevere',
  dangerous: 'sevDangerous',
}

const FREQUENCY_ORDER: SideEffectFrequency[] = ['veryCommon', 'common', 'uncommon', 'rare', 'unknown']

export function SideEffectHeatmap({ entries, language }: SideEffectHeatmapProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, SideEffectEntry[]>()
    for (const e of entries) {
      const sys = pickKbLocalizedText(e.system, e.systemEn, language).trim() || '—'
      const list = map.get(sys) ?? []
      list.push(e)
      map.set(sys, list)
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => FREQUENCY_ORDER.indexOf(a.frequency) - FREQUENCY_ORDER.indexOf(b.frequency),
      )
    }
    return [...map.entries()]
  }, [entries, language])

  if (entries.length === 0) return null

  return (
    <div className="kb-se">
      <p className="kb-chart__caption">{kbT(language, 'seTitle')}</p>
      <div className="kb-se__groups">
        {grouped.map(([system, list]) => (
          <div key={system} className="kb-se__group">
            <span className="kb-se__group-label">{system}</span>
            <div className="kb-se__cells">
              {list.map((e, i) => {
                const localizedEffect = pickKbLocalizedText(e.effect, e.effectEn, language) || e.effect
                const localizedNote = pickKbLocalizedText(e.note, e.noteEn, language)
                return (
                  <span
                    key={`${localizedEffect}-${i}`}
                    className="kb-se__cell"
                    style={{
                      background: `color-mix(in srgb, ${SEVERITY_VAR[e.severity]} ${Math.round(
                        FREQUENCY_ALPHA[e.frequency] * 100,
                      )}%, transparent)`,
                      borderColor: `color-mix(in srgb, ${SEVERITY_VAR[e.severity]} 38%, transparent)`,
                    }}
                    title={`${localizedEffect} — ${kbT(language, FREQUENCY_KEY[e.frequency])}, ${kbT(
                      language,
                      SEVERITY_KEY[e.severity],
                    )}${localizedNote ? ` · ${localizedNote}` : ''}`}
                  >
                    {e.severity === 'dangerous' ? (
                      <span className="kb-se__warn" aria-hidden>
                        ⚠{' '}
                      </span>
                    ) : null}
                    {localizedEffect}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="kb-chart__note">{kbT(language, 'seLegend')}</p>
    </div>
  )
}
