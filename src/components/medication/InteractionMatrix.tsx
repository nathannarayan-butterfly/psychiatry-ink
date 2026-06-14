import type { InteractionEntry } from '../../data/psychDrugReference/schema'
import type { MedicationEntry } from '../../types/medicationPlan'
import type {
  CombinationSeverity,
  PatientCombinationCheckFinding,
} from '../../types/combinationCheck'
import type { UiLanguage } from '../../types/settings'

type LegacySeverity = InteractionEntry['severity']

const LEGACY_SEVERITY_ORDER: LegacySeverity[] = ['mild', 'moderate', 'severe', 'contraindicated']

const COMBO_SEVERITY_ORDER: CombinationSeverity[] = [
  'none',
  'low',
  'moderate',
  'high',
  'critical',
]

const SEVERITY_LEGEND: { severity: CombinationSeverity; labelDe: string; labelEn: string }[] = [
  { severity: 'none', labelDe: 'Keine', labelEn: 'None' },
  { severity: 'low', labelDe: 'Gering', labelEn: 'Low' },
  { severity: 'moderate', labelDe: 'Moderat', labelEn: 'Moderate' },
  { severity: 'high', labelDe: 'Hoch', labelEn: 'High' },
  { severity: 'critical', labelDe: 'Kritisch', labelEn: 'Critical' },
]

function legacySeverityRank(s: LegacySeverity): number {
  return LEGACY_SEVERITY_ORDER.indexOf(s)
}

function comboSeverityRank(s: CombinationSeverity): number {
  return COMBO_SEVERITY_ORDER.indexOf(s)
}

function worstLegacySeverity(a: LegacySeverity, b: LegacySeverity): LegacySeverity {
  return legacySeverityRank(a) >= legacySeverityRank(b) ? a : b
}

function worstComboSeverity(a: CombinationSeverity, b: CombinationSeverity): CombinationSeverity {
  return comboSeverityRank(a) >= comboSeverityRank(b) ? a : b
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_\s]+/g, '')
}

function substanceMatches(crossName: string, substance: string): boolean {
  const a = normName(crossName)
  const b = normName(substance)
  return a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))
}

function truncate(s: string, n = 10): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

type CrossInteraction = {
  drugA: string
  drugB: string
  interaction: InteractionEntry
}

function findCellInteractions(
  crossInteractions: CrossInteraction[],
  substI: string,
  substJ: string,
): CrossInteraction[] {
  return crossInteractions.filter((c) => {
    const matchesI = substanceMatches(c.drugA, substI) || substanceMatches(c.drugB, substI)
    const matchesJ = substanceMatches(c.drugA, substJ) || substanceMatches(c.drugB, substJ)
    return matchesI && matchesJ
  })
}

function findCellFindings(
  findings: PatientCombinationCheckFinding[],
  substI: string,
  substJ: string,
): PatientCombinationCheckFinding[] {
  return findings.filter(
    (f) =>
      (substanceMatches(f.substanceAName, substI) && substanceMatches(f.substanceBName, substJ)) ||
      (substanceMatches(f.substanceAName, substJ) && substanceMatches(f.substanceBName, substI)),
  )
}

function legacySeverityIcon(severity: LegacySeverity): string {
  switch (severity) {
    case 'contraindicated':
      return '✕'
    case 'severe':
      return '⚠'
    case 'moderate':
      return '·'
    default:
      return ''
  }
}

function comboSourceClass(finding: PatientCombinationCheckFinding): string {
  if (finding.status === 'pending_clinician_review') {
    return 'interaction-matrix__cell--source-ai-pending'
  }
  if (
    finding.source === 'knowledge_base' ||
    finding.status === 'verified_kb' ||
    finding.status === 'accepted'
  ) {
    return 'interaction-matrix__cell--source-kb'
  }
  return ''
}

function buildCellTooltip(
  finding: PatientCombinationCheckFinding | undefined,
  legacyHits: CrossInteraction[],
  language: UiLanguage,
): string | undefined {
  if (finding) {
    const parts = [finding.mainRisk]
    if (finding.mechanism) parts.push(finding.mechanism)
    if (finding.monitoring) parts.push(finding.monitoring)
    return parts.filter(Boolean).join('\n\n')
  }
  if (legacyHits.length === 0) return undefined
  return legacyHits
    .map((h) => (language === 'de' ? h.interaction.clinicalNoteDe : h.interaction.clinicalNoteEn))
    .join('\n\n')
}

interface InteractionMatrixProps {
  activeMeds: MedicationEntry[]
  crossInteractions: CrossInteraction[]
  findings?: PatientCombinationCheckFinding[]
  language: UiLanguage
}

export function InteractionMatrix({
  activeMeds,
  crossInteractions,
  findings = [],
  language,
}: InteractionMatrixProps) {
  if (activeMeds.length < 2) return null

  const substances = activeMeds.map((m) => m.substance)
  const hasCheckResults = findings.length > 0

  return (
    <div className="interaction-matrix">
      <div className="interaction-matrix__scroll">
        <table
          className="interaction-matrix__table"
          aria-label={language === 'de' ? 'Wechselwirkungsmatrix' : 'Interaction matrix'}
        >
          <thead>
            <tr>
              <th className="interaction-matrix__corner" />
              {substances.map((s) => (
                <th key={s} className="interaction-matrix__col-header" title={s}>
                  {truncate(s)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {substances.map((substI, i) => (
              <tr key={substI}>
                <th className="interaction-matrix__row-header" title={substI}>
                  {truncate(substI)}
                </th>
                {substances.map((substJ, j) => {
                  if (i === j) {
                    return (
                      <td key={substJ} className="interaction-matrix__cell interaction-matrix__cell--self" />
                    )
                  }

                  const pairFindings = hasCheckResults
                    ? findCellFindings(findings, substI, substJ)
                    : []
                  const legacyHits = findCellInteractions(crossInteractions, substI, substJ)

                  if (pairFindings.length > 0) {
                    const worst = pairFindings.reduce<CombinationSeverity>(
                      (acc, f) => worstComboSeverity(acc, f.severity),
                      'none',
                    )
                    const primary = pairFindings.find((f) => f.severity === worst) ?? pairFindings[0]!
                    const tooltipText = buildCellTooltip(primary, legacyHits, language)

                    return (
                      <td
                        key={substJ}
                        className={[
                          'interaction-matrix__cell',
                          `interaction-matrix__cell--combo-${worst}`,
                          comboSourceClass(primary),
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={tooltipText}
                      >
                        {primary.status === 'pending_clinician_review' ? (
                          <span className="interaction-matrix__badge" aria-hidden="true">
                            KI
                          </span>
                        ) : primary.source === 'knowledge_base' || primary.status === 'verified_kb' ? (
                          <span className="interaction-matrix__badge interaction-matrix__badge--kb" aria-hidden="true">
                            KB
                          </span>
                        ) : null}
                      </td>
                    )
                  }

                  if (!hasCheckResults && legacyHits.length > 0) {
                    const worst: LegacySeverity = legacyHits.reduce<LegacySeverity>(
                      (acc, h) => worstLegacySeverity(acc, h.interaction.severity),
                      'mild',
                    )
                    const tooltipText = buildCellTooltip(undefined, legacyHits, language)

                    return (
                      <td
                        key={substJ}
                        className={`interaction-matrix__cell interaction-matrix__cell--${worst}`}
                        title={tooltipText}
                      >
                        <span className="interaction-matrix__icon">{legacySeverityIcon(worst)}</span>
                      </td>
                    )
                  }

                  return <td key={substJ} className="interaction-matrix__cell" />
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasCheckResults ? (
        <div
          className="interaction-matrix__legend"
          aria-label={language === 'de' ? 'Farbcode Schweregrad' : 'Severity color code'}
        >
          <span className="interaction-matrix__legend-title">
            {language === 'de' ? 'Farbcode' : 'Color code'}
          </span>
          <ul className="interaction-matrix__legend-items">
            {SEVERITY_LEGEND.map(({ severity, labelDe, labelEn }) => (
              <li key={severity} className="interaction-matrix__legend-item">
                <span
                  className={`interaction-matrix__legend-swatch interaction-matrix__cell--combo-${severity}`}
                  aria-hidden="true"
                />
                <span>{language === 'de' ? labelDe : labelEn}</span>
              </li>
            ))}
          </ul>
          <ul className="interaction-matrix__legend-source">
            <li>
              <span className="interaction-matrix__legend-source-mark interaction-matrix__legend-source-mark--kb" />
              {language === 'de' ? 'Wissensdatenbank' : 'Knowledge base'}
            </li>
            <li>
              <span className="interaction-matrix__legend-source-mark interaction-matrix__legend-source-mark--ai" />
              {language === 'de' ? 'KI-Vorschlag (prüfen)' : 'AI suggestion (review)'}
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
