import { useMemo } from 'react'
import { ClinicalHeroStrip } from '../../clinical/ClinicalHeroStrip'
import { buildClinicalThesis } from '../../../utils/overview/clinicalThesis'
import { getCaseMeta } from '../../../hooks/useCaseRegistry'
import { isDemoCase } from '../../../demo'
import { useTranslation } from '../../../context/TranslationContext'
import { loadNotionPageDate } from '../../../utils/notionPageDate'
import { formatDateDe } from '../../../utils/overview/dateLabels'
import type { HeroSummaryData } from './types'

interface OverviewHeroProps {
  data: HeroSummaryData
  caseId: string
}

/**
 * Übersicht hero widget — typographic patient strip with clinical thesis.
 * Replaces the former boxed "Auf einen Blick" metric strip with the canvas
 * minimal hero pattern. Supplementary orientation facts render as quiet meta.
 */
export function OverviewHero({ data, caseId }: OverviewHeroProps) {
  const { t } = useTranslation()

  const { name, metaLine } = useMemo(() => {
    const meta = getCaseMeta(caseId)
    const structuredName = [meta?.localVorname?.trim(), meta?.localNachname?.trim()]
      .filter(Boolean)
      .join(' ')
    const displayName =
      structuredName ||
      meta?.localName?.trim() ||
      (isDemoCase(caseId) ? t('demoPatientDisplayName') : t('patientNavFallback'))

    const geschlecht = meta?.localGeschlecht
    const genderLabel =
      geschlecht === 'maennlich'
        ? t('patientGeschlechtMaennlich')
        : geschlecht === 'weiblich'
          ? t('patientGeschlechtWeiblich')
          : geschlecht === 'divers'
            ? t('patientGeschlechtDivers')
            : null

    const ageLabel = meta?.localAge?.trim() ? `${meta.localAge} J` : null
    const admissionIso = loadNotionPageDate('aufnahme', caseId)
    const admissionLabel = admissionIso ? formatDateDe(admissionIso) : null

    const parts = [
      ageLabel,
      genderLabel,
      admissionLabel ? `Aufnahme ${admissionLabel}` : null,
    ].filter(Boolean)

    return { name: displayName, metaLine: parts.length > 0 ? parts.join(' · ') : null }
  }, [caseId, t])

  const thesis = useMemo(() => buildClinicalThesis(caseId), [caseId])

  const orientationMeta = useMemo(() => {
    const parts: string[] = []
    if (data.primaryDiagnosis?.code) {
      parts.push(data.primaryDiagnosis.code)
    }
    if (data.risk?.label) {
      parts.push(`Risiko ${data.risk.label}`)
    }
    if (data.activeMedCount > 0) {
      parts.push(
        `${data.activeMedCount} ${data.activeMedCount === 1 ? 'aktives Präparat' : 'aktive Präparate'}`,
      )
    }
    if (data.lastContact?.relativeLabel ?? data.lastContact?.dateLabel) {
      parts.push(`Letzter Kontakt ${data.lastContact.relativeLabel ?? data.lastContact.dateLabel}`)
    }
    if (data.nextAppointment?.relativeLabel ?? data.nextAppointment?.dateLabel) {
      parts.push(
        `Nächster Termin ${data.nextAppointment.relativeLabel ?? data.nextAppointment.dateLabel}`,
      )
    }
    return parts.length > 0 ? parts.join(' · ') : null
  }, [data])

  return (
    <div className="ov-hero-widget">
      <ClinicalHeroStrip name={name} metaLine={metaLine} caseId={caseId} thesis={thesis} />
      {orientationMeta ? (
        <p className="ov-hero-widget__orientation" aria-label="Orientierung">
          {orientationMeta}
        </p>
      ) : null}
    </div>
  )
}
