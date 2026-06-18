import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Architectural guard — prevents the recurring "diagnosis label is gone"
 * regression (e.g. commit 9c4bd85, where a design refactor silently dropped
 * `DiagnosisDisplayLabel` from the Übersicht hero and left bare ICD codes).
 *
 * Two invariants are locked in:
 *  1. Display surfaces must NOT reach into raw stored labels
 *     (`entry.icd10.label` / `.icd11.label` / `.dsm.label`) for rendering —
 *     every title must flow through the shared resolver.
 *  2. The Übersicht hero must keep rendering a resolved title via the enforced
 *     `DiagnosisDisplayLabel` component, not a bare code.
 */

const ROOT = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

/** Display components that render diagnosis titles to the clinician. */
const DISPLAY_SURFACES = [
  'src/components/notion/DiagnosenWidget.tsx',
  'src/components/notion/overview/OverviewHero.tsx',
  'src/components/notion/overview/OverviewDashboard.tsx',
  'src/components/notion/overview/ButterflyCriteriaCard.tsx',
  'src/components/workspace/IsdmAnalysisPanel.tsx',
  'src/components/diagnosis/DiagnosisDisplayLabel.tsx',
]

const RAW_LABEL_PATTERN = /\.(icd10|icd11|dsm)\.label\b/

describe('diagnosis label wiring guard', () => {
  it.each(DISPLAY_SURFACES)(
    '%s does not read raw stored labels for display',
    (file) => {
      const source = readSource(file)
      const offending = source
        .split('\n')
        .map((line, idx) => ({ line: line.trim(), no: idx + 1 }))
        .filter(({ line }) => RAW_LABEL_PATTERN.test(line))
      expect(
        offending,
        `${file} reads a raw diagnosis label directly; route it through the shared resolver ` +
          `(resolveDiagnosisLabelSync / DiagnosisDisplayLabel) instead:\n` +
          offending.map((o) => `  L${o.no}: ${o.line}`).join('\n'),
      ).toEqual([])
    },
  )

  it('OverviewHero renders the primary diagnosis through DiagnosisDisplayLabel', () => {
    const source = readSource('src/components/notion/overview/OverviewHero.tsx')
    expect(
      source.includes('DiagnosisDisplayLabel'),
      'OverviewHero must render the diagnosis via the enforced DiagnosisDisplayLabel component',
    ).toBe(true)
  })

  it('DiagnosenWidget resolves entry titles through the shared resolver', () => {
    const source = readSource('src/components/notion/DiagnosenWidget.tsx')
    expect(
      source.includes('resolveDiagnosisLabelSync') || source.includes('useDiagnosisDisplayTitles'),
      'DiagnosenWidget must resolve titles through the shared resolver',
    ).toBe(true)
  })
})
