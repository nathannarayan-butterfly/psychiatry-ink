import { useEffect, useMemo, useState } from 'react'
import { useDiagnosenRevision } from '../../../hooks/useDiagnosenRevision'
import { useTranslation } from '../../../context/TranslationContext'
import { useDiagnosenCodingSystem } from '../../../hooks/useDiagnosenCodingSystem'
import { useDiagnosisDisplayTitles } from '../../../hooks/useDiagnosisDisplayTitles'
import { DiagnosisClassificationChips } from '../../diagnosis/DiagnosisClassificationChips'
import {
  buildDiagnosisTitleRequestFromEntry,
  codingSystemToTitleVersion,
  resolveDiagnosisLabelSync,
} from '../../../utils/diagnosisDisplayRequests'
import {
  isMutedDiagnosisCategory,
  isProvisionalDiagnosisCategory,
  resolveClinicalCategory,
  sortDiagnosesForDisplay,
} from '../../../utils/diagnosisClassification'
import {
  getActiveCoding,
  loadDiagnosen,
  loadDiagnosenAsync,
  type DiagnoseEntry,
} from '../../../utils/diagnosenArchive'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface DiagnosesOverviewCardProps {
  caseId: string
  onOpenDiagnose: () => void
}

function rowToneClass(entry: DiagnoseEntry): string {
  const category = resolveClinicalCategory(entry)
  if (category === 'primary') return 'ov-dx__row--primary'
  if (isMutedDiagnosisCategory(category)) return 'ov-dx__row--muted'
  if (isProvisionalDiagnosisCategory(category)) return 'ov-dx__row--provisional'
  return ''
}

/**
 * Übersicht diagnoses widget — same ClinicalSection chrome and list density as
 * Safety, Medikation, and Labor cards (read-only teaser; full editing on Diagnose tab).
 */
export function DiagnosesOverviewCard({ caseId, onOpenDiagnose }: DiagnosesOverviewCardProps) {
  const { t, language } = useTranslation()
  const { activeSystem } = useDiagnosenCodingSystem(caseId)
  const diagnosenRevision = useDiagnosenRevision(caseId)
  const [entries, setEntries] = useState<DiagnoseEntry[]>(() => loadDiagnosen(caseId))
  const [loading, setLoading] = useState(entries.length === 0)

  useEffect(() => {
    const cached = loadDiagnosen(caseId)
    if (cached.length > 0) {
      setEntries(cached)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void loadDiagnosenAsync(caseId)
      .then((loaded) => {
        if (!active) return
        setEntries(loaded)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [caseId, diagnosenRevision])

  const sortedEntries = useMemo(() => sortDiagnosesForDisplay(entries), [entries])

  const titleRequests = useMemo(
    () =>
      sortedEntries.map((entry) =>
        buildDiagnosisTitleRequestFromEntry(entry, activeSystem, undefined, language),
      ),
    [sortedEntries, activeSystem, language],
  )

  const { titlesByKey: displayTitles } = useDiagnosisDisplayTitles(
    titleRequests,
    language,
    !loading,
  )

  const badge =
    sortedEntries.length > 0
      ? { label: String(sortedEntries.length), tone: 'neutral' as const }
      : undefined

  return (
    <OverviewCard
      title={t('overviewWidgetDiagnoses')}
      className="ov-col-6 ov-dx"
      badge={badge}
      action={{ label: t('overviewButterflyOpenDiagnose'), onClick: onOpenDiagnose }}
    >
      {loading ? (
        <p className="ov-meta">{t('dashboardLoading')}</p>
      ) : sortedEntries.length === 0 ? (
        <OverviewEmpty>{t('diagnosenEmpty')}</OverviewEmpty>
      ) : (
        <ul className="ov-dx__list">
          {sortedEntries.map((entry) => {
            const coding = getActiveCoding(entry, activeSystem)
            const displayLabel =
              displayTitles.get(entry.id)
              ?? resolveDiagnosisLabelSync(
                coding,
                codingSystemToTitleVersion(activeSystem),
                undefined,
                language,
              )
            const codeLabel = coding.code || '—'
            const nameLabel = displayLabel || coding.code || t('diagnosenNoLabel')

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={['ov-dx__row', rowToneClass(entry)].filter(Boolean).join(' ')}
                  onClick={onOpenDiagnose}
                >
                  <span className="ov-dx__code">{codeLabel}</span>
                  <span className="ov-dx__name ov-value-emphasis">{nameLabel}</span>
                  <span className="ov-dx__chips">
                    <DiagnosisClassificationChips entry={entry} compact />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </OverviewCard>
  )
}
