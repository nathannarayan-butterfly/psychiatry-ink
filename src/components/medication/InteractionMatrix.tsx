import type { InteractionEntry } from '../../data/psychDrugReference/schema'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'

type Severity = InteractionEntry['severity']

const SEVERITY_ORDER: Severity[] = ['mild', 'moderate', 'severe', 'contraindicated']

function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s)
}

function worstSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b
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

function severityIcon(severity: Severity): string {
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

interface InteractionMatrixProps {
  activeMeds: MedicationEntry[]
  crossInteractions: CrossInteraction[]
  language: UiLanguage
}

export function InteractionMatrix({ activeMeds, crossInteractions, language }: InteractionMatrixProps) {
  if (activeMeds.length < 2) return null

  const substances = activeMeds.map((m) => m.substance)

  return (
    <div className="interaction-matrix">
      <div className="interaction-matrix__scroll">
        <table className="interaction-matrix__table" aria-label={language === 'de' ? 'Wechselwirkungsmatrix' : 'Interaction matrix'}>
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

                  const hits = findCellInteractions(crossInteractions, substI, substJ)
                  if (hits.length === 0) {
                    return <td key={substJ} className="interaction-matrix__cell" />
                  }

                  const worst: Severity = hits.reduce<Severity>(
                    (acc, h) => worstSeverity(acc, h.interaction.severity),
                    'mild',
                  )
                  const tooltipTexts = hits.map((h) =>
                    language === 'de' ? h.interaction.clinicalNoteDe : h.interaction.clinicalNoteEn,
                  )
                  const tooltipText = tooltipTexts.join('\n\n')

                  return (
                    <td
                      key={substJ}
                      className={`interaction-matrix__cell interaction-matrix__cell--${worst}`}
                      title={tooltipText}
                    >
                      <span className="interaction-matrix__icon">{severityIcon(worst)}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
