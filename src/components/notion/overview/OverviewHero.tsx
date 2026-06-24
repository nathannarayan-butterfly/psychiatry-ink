import { useMemo, type ReactNode } from 'react'
import { ClinicalHeroStrip } from '../../clinical/ClinicalHeroStrip'
import { ClinicalPageEyebrow } from '../../clinical/ClinicalPageEyebrow'
import { DiagnosisDisplayLabel } from '../../diagnosis/DiagnosisDisplayLabel'
import { OverviewActionToolbar } from './OverviewActionToolbar'
import { OverviewClinicalSignalChips } from './OverviewClinicalSignalChips'
import { buildClinicalThesis } from '../../../utils/overview/clinicalThesis'
import { buildClinicalHeroMeta } from '../../../utils/overview/clinicalHeroMeta'
import { DEFAULT_CASE_ID } from '../../../utils/caseContext'
import { useOverviewClinicalRefresh } from '../../../hooks/useOverviewClinicalRefresh'
import { useTranslation } from '../../../context/TranslationContext'
import type { OverviewQuickActionId } from '../../../utils/overview/overviewQuickActions'
import type { ClinicalSignalChip } from '../../../utils/overview/overviewClinicalSignals'
import type { HeroSummaryData } from './types'

interface OverviewHeroProps {
  data: HeroSummaryData
  caseId: string
  /** Bump when local patient meta changes so the hero re-reads registry data. */
  metaVersion?: number
  /** Page title shown in the hero top bar (e.g. "Übersicht"). */
  title?: string
  onExportPdf?: () => void
  onExportWord?: () => void
  onPrint?: () => void
  onVisitAction?: (action: OverviewQuickActionId) => void
  onClinicalSubheadingChange?: () => void
  onSignalChipClick?: (chip: ClinicalSignalChip) => void
}

/**
 * Übersicht visit command header — identity, clinical summary, and signal chips
 * on a calm clinical command card; quick actions live in the top action toolbar.
 */
export function OverviewHero({
  data,
  caseId,
  metaVersion = 0,
  title,
  onExportPdf,
  onExportWord,
  onPrint,
  onVisitAction,
  onClinicalSubheadingChange,
  onSignalChipClick,
}: OverviewHeroProps) {
  const { language, t } = useTranslation()
  const clinicalRefreshRevision = useOverviewClinicalRefresh(caseId)

  const { name, demographics } = useMemo(() => {
    void metaVersion
    void clinicalRefreshRevision
    return buildClinicalHeroMeta(caseId, t)
  }, [caseId, metaVersion, clinicalRefreshRevision, t])

  const thesis = useMemo(() => {
    void metaVersion
    return buildClinicalThesis(caseId)
  }, [caseId, metaVersion])

  const supplementFacts = useMemo(() => {
    const facts: Array<{ label: string; value: ReactNode }> = []
    const ctx = data.identityContext
    const primary = data.primaryDiagnosis
    if (primary?.code.trim()) {
      facts.push({
        label: t('overviewHeroDiagnosisLabel'),
        value: (
          <>
            {primary.code}
            {' · '}
            <DiagnosisDisplayLabel
              code={primary.code}
              version={primary.version}
              language={language}
              enteredLabel={primary.overridden ? primary.label : null}
              overridden={primary.overridden}
            />
          </>
        ),
      })
    } else if (ctx.diagnosisLine) {
      facts.push({ label: t('overviewHeroDiagnosisLabel'), value: ctx.diagnosisLine })
    }
    if (ctx.caseTypeLabel) {
      facts.push({ label: t('overviewHeroCaseTypeLabel'), value: ctx.caseTypeLabel })
    }
    if (ctx.admissionDayLabel) {
      facts.push({ label: t('overviewHeroAdmissionDayLabel'), value: ctx.admissionDayLabel })
    }
    return facts
  }, [data.identityContext, data.primaryDiagnosis, language, t])

  const showTopbar = Boolean(title || onExportPdf || onExportWord || onPrint || onVisitAction)
  const showToolbar = Boolean(
    onVisitAction || (onExportPdf && onExportWord && onPrint),
  )

  const showPatientIdentity = caseId !== DEFAULT_CASE_ID

  return (
    <section
      className="ov-hero ov-hero--command ov-hero--visit-header aura-card"
      aria-label={t('overviewWidgetHeroSummary')}
    >
      {showTopbar ? (
        <div className="ov-hero__topbar">
          {title ? <ClinicalPageEyebrow label={title} /> : <span aria-hidden />}
          {showToolbar ? (
            <OverviewActionToolbar
              onExportPdf={onExportPdf}
              onExportWord={onExportWord}
              onPrint={onPrint}
              visitActionContext={onVisitAction ? data.visitActionContext : undefined}
              onVisitAction={onVisitAction}
            />
          ) : null}
        </div>
      ) : null}

      <div className="ov-hero__command-grid">
        <div className="ov-hero__zones-abc">
          <ClinicalHeroStrip
            name={name}
            demographics={demographics}
            supplementFacts={supplementFacts}
            showDemographics={showPatientIdentity}
            caseId={showPatientIdentity ? caseId : undefined}
            thesis={thesis}
            thesisEditable
            onThesisChange={onClinicalSubheadingChange}
            className="ov-hero__identity-strip"
          />

          {onSignalChipClick ? (
            <OverviewClinicalSignalChips
              chips={data.clinicalSignalChips}
              onChipClick={onSignalChipClick}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
