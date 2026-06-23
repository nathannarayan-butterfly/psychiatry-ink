import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Pill,
  Stethoscope,
} from 'lucide-react'
import { ClinicalHeroStrip } from '../../clinical/ClinicalHeroStrip'
import { ClinicalPageEyebrow } from '../../clinical/ClinicalPageEyebrow'
import { OverviewActionToolbar } from './OverviewActionToolbar'
import { ButterflyLogo } from '../../ButterflyLogo'
import { DiagnosisDisplayLabel } from '../../diagnosis/DiagnosisDisplayLabel'
import { buildClinicalThesis } from '../../../utils/overview/clinicalThesis'
import { buildClinicalHeroMeta } from '../../../utils/overview/clinicalHeroMeta'
import { DEFAULT_CASE_ID } from '../../../utils/caseContext'
import { resolveDisplayCriteriaLabel } from '../../../utils/diagnosisDisplayRequests'
import { useTranslation } from '../../../context/TranslationContext'
import type { SemanticTone } from './OverviewCard'
import type { HeroSummaryData } from './types'

interface OverviewHeroProps {
  data: HeroSummaryData
  caseId: string
  /** Bump when local patient meta changes so the hero re-reads registry data. */
  metaVersion?: number
  /** Page title shown in the hero top bar (e.g. "Übersicht"). */
  title?: string
  /** Export the dashboard as PDF (print-to-PDF, wired through from the dashboard). */
  onExportPdf?: () => void
  /** Export the dashboard as Word/.doc (wired through from the dashboard). */
  onExportWord?: () => void
  /** Print the dashboard (wired through from the dashboard). */
  onPrint?: () => void
  onClinicalSubheadingChange?: () => void
}

/** How "full" the risk gauge ring reads for each semantic severity. */
const RISK_FRACTION: Record<SemanticTone, number> = {
  high: 1,
  moderate: 0.68,
  info: 0.5,
  low: 0.32,
  ok: 0.2,
  neutral: 0.14,
}

/* ───────────────────────── motion-aware hooks ───────────────────────────── */

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** rAF count-up from 0 → target (ease-out cubic). Returns target instantly when disabled. */
function useCountUp(target: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 850
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled])
  return value
}

/* ─────────────────────────── risk gauge ring ────────────────────────────── */

function RiskRing({ tone, animate }: { tone: SemanticTone; animate: boolean }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const fraction = RISK_FRACTION[tone] ?? 0.2
  const target = circumference * (1 - fraction)
  const [offset, setOffset] = useState(animate ? circumference : target)

  useEffect(() => {
    if (!animate) {
      setOffset(target)
      return
    }
    setOffset(circumference)
    let raf = 0
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setOffset(target))
    })
    return () => cancelAnimationFrame(raf)
  }, [animate, target, circumference])

  return (
    <span className={`ov-hero__ring ov-hero__ring--tone-${tone}`} aria-hidden>
      <svg viewBox="0 0 56 56">
        <circle className="ov-hero__ring-track" cx="28" cy="28" r={radius} strokeWidth="6" />
        <circle
          className="ov-hero__ring-prog"
          cx="28"
          cy="28"
          r={radius}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animate
              ? 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)'
              : undefined,
          }}
        />
      </svg>
    </span>
  )
}

/**
 * Übersicht hero — a refined LIGHT "header card" that reads as the same family
 * as the bento dashboard cards: it consumes the shared `.aura-card` treatment
 * (light surface, subtle overview-gold sheen, accent hairline, soft elevation)
 * and adds patient identity + the editable clinical thesis, a calm "Auf einen
 * Blick" briefing line beside a gently breathing Butterfly mark, and an
 * at-a-glance row of metric tiles (count-up numbers + a risk gauge ring).
 *
 * Intentionally minimal: no dark command-deck surface, no aurora mesh, no 3D
 * tilt/spotlight, no typewriter — just clean, professional, legible data. The
 * only motion is the restrained count-up / ring fill (gated by
 * prefers-reduced-motion) and the opt-in Butterfly breathe (CSS, also reduced-
 * motion + print aware). Every value is real wired data; tiles with no source
 * are omitted and a brand-new case degrades to a calm invitation.
 */
export function OverviewHero({
  data,
  caseId,
  metaVersion = 0,
  title,
  onExportPdf,
  onExportWord,
  onPrint,
  onClinicalSubheadingChange,
}: OverviewHeroProps) {
  const { t, language } = useTranslation()
  const reducedMotion = usePrefersReducedMotion()
  const animate = !reducedMotion

  const { name, demographics, isAssigned } = useMemo(() => {
    void metaVersion
    return buildClinicalHeroMeta(caseId, t)
  }, [caseId, metaVersion, t])

  const thesis = useMemo(() => {
    void metaVersion
    return buildClinicalThesis(caseId)
  }, [caseId, metaVersion])

  const primaryDiagnosis = data.primaryDiagnosis

  // Concise at-a-glance briefing — distilled from the same wired metrics, shown
  // statically (no typewriter) for the calm light look.
  const briefingText = useMemo(() => {
    const segments: string[] = []
    if (primaryDiagnosis?.code) {
      segments.push(
        primaryDiagnosis.label
          ? `${primaryDiagnosis.code} ${primaryDiagnosis.label}`
          : primaryDiagnosis.code,
      )
    }
    if (data.risk?.label) segments.push(`${t('overviewGlanceRisk')} ${data.risk.label}`)
    if (data.activeMedCount > 0) {
      segments.push(
        `${t('overviewGlanceMedication')}: ${data.activeMedCount} ${t('overviewGlanceMedsActiveUnit')}`,
      )
    }
    if (data.alertCount > 0) {
      segments.push(`${data.alertCount} ${t('overviewGlanceAlerts')}`)
    }
    if (data.nextAppointment && (data.nextAppointment.relativeLabel || data.nextAppointment.dateLabel)) {
      segments.push(
        `${t('overviewGlanceNextAppointment')}: ${data.nextAppointment.relativeLabel ?? data.nextAppointment.dateLabel}`,
      )
    }
    return segments.join('   ·   ')
  }, [data, primaryDiagnosis, t])

  const medCount = useCountUp(data.activeMedCount, animate)
  const alertCount = useCountUp(data.alertCount, animate)

  const tiles: ReactNode[] = []

  if (data.risk?.label) {
    tiles.push(
      <li
        key="risk"
        className={`ov-hero__tile ov-hero__tile--risk ov-hero__tile--tone-${data.risk.tone}`}
      >
        <RiskRing tone={data.risk.tone} animate={animate} />
        <span className="ov-hero__tile-body">
          <span className="ov-hero__tile-label">{t('overviewGlanceRisk')}</span>
          <span className="ov-hero__tile-value">{data.risk.label}</span>
        </span>
      </li>,
    )
  }

  if (primaryDiagnosis?.code) {
    tiles.push(
      <li key="diagnosis" className="ov-hero__tile">
        <span className="ov-hero__tile-icon" aria-hidden>
          <Stethoscope strokeWidth={1.75} />
        </span>
        <span className="ov-hero__tile-body">
          <span className="ov-hero__tile-label">{t('overviewGlanceDiagnosis')}</span>
          <span className="ov-hero__tile-value">
            <span className="ov-hero__tile-dx">
              <span className="ov-hero__tile-code">{primaryDiagnosis.code}</span>
              <DiagnosisDisplayLabel
                code={primaryDiagnosis.code}
                version={primaryDiagnosis.version}
                language={language}
                criteriaLabel={resolveDisplayCriteriaLabel(
                  primaryDiagnosis.code,
                  primaryDiagnosis.version,
                )}
                enteredLabel={primaryDiagnosis.overridden ? primaryDiagnosis.label : null}
                overridden={primaryDiagnosis.overridden ?? false}
              />
            </span>
          </span>
        </span>
      </li>,
    )
  }

  if (data.activeMedCount > 0) {
    tiles.push(
      <li key="medication" className="ov-hero__tile">
        <span className="ov-hero__tile-icon" aria-hidden>
          <Pill strokeWidth={1.75} />
        </span>
        <span className="ov-hero__tile-body">
          <span className="ov-hero__tile-label">{t('overviewGlanceMedication')}</span>
          <span className="ov-hero__tile-value">
            <span className="ov-hero__tile-num">{medCount}</span>{' '}
            <span className="ov-hero__tile-unit">{t('overviewGlanceMedsActiveUnit')}</span>
          </span>
        </span>
      </li>,
    )
  }

  if (data.alertCount > 0) {
    tiles.push(
      <li key="alerts" className="ov-hero__tile ov-hero__tile--tone-moderate">
        <span className="ov-hero__tile-icon" aria-hidden>
          <AlertTriangle strokeWidth={1.75} />
        </span>
        <span className="ov-hero__tile-body">
          <span className="ov-hero__tile-label">{t('overviewGlanceAlerts')}</span>
          <span className="ov-hero__tile-value">
            <span className="ov-hero__tile-num">{alertCount}</span>
          </span>
        </span>
      </li>,
    )
  }

  if (data.lastContact && (data.lastContact.relativeLabel || data.lastContact.dateLabel)) {
    tiles.push(
      <li key="last-contact" className="ov-hero__tile">
        <span className="ov-hero__tile-icon" aria-hidden>
          <Clock strokeWidth={1.75} />
        </span>
        <span className="ov-hero__tile-body">
          <span className="ov-hero__tile-label">{t('overviewGlanceLastContact')}</span>
          <span className="ov-hero__tile-value">
            {data.lastContact.relativeLabel ?? data.lastContact.dateLabel}
          </span>
          {data.lastContact.relativeLabel ? (
            <span className="ov-hero__tile-sub">{data.lastContact.dateLabel}</span>
          ) : null}
        </span>
      </li>,
    )
  }

  if (data.nextAppointment && (data.nextAppointment.relativeLabel || data.nextAppointment.dateLabel)) {
    tiles.push(
      <li key="next-appointment" className="ov-hero__tile">
        <span className="ov-hero__tile-icon" aria-hidden>
          <CalendarClock strokeWidth={1.75} />
        </span>
        <span className="ov-hero__tile-body">
          <span className="ov-hero__tile-label">{t('overviewGlanceNextAppointment')}</span>
          <span className="ov-hero__tile-value">
            {data.nextAppointment.relativeLabel ?? data.nextAppointment.dateLabel}
          </span>
          {data.nextAppointment.title ? (
            <span className="ov-hero__tile-sub">{data.nextAppointment.title}</span>
          ) : null}
        </span>
      </li>,
    )
  }

  return (
    <section className="ov-hero aura-card" aria-label={t('overviewWidgetHeroSummary')}>
      <div className="ov-hero__content">
        {title || onExportPdf || onExportWord || onPrint ? (
          <div className="ov-hero__topbar">
            {title ? <ClinicalPageEyebrow label={title} /> : <span aria-hidden />}
            {onExportPdf && onExportWord && onPrint ? (
              <OverviewActionToolbar
                onExportPdf={onExportPdf}
                onExportWord={onExportWord}
                onPrint={onPrint}
              />
            ) : null}
          </div>
        ) : null}

        <div className="ov-hero__identity">
          <ClinicalHeroStrip
            name={name}
            demographics={demographics}
            showDemographics={isAssigned}
            caseId={isAssigned && caseId !== DEFAULT_CASE_ID ? caseId : undefined}
            thesis={thesis}
            thesisEditable
            onThesisChange={onClinicalSubheadingChange}
          />
        </div>

        {briefingText ? (
          <div className="ov-hero__briefing">
            <span className="ov-hero__orb" aria-hidden>
              <ButterflyLogo breathing size={26} />
            </span>
            <span className="ov-hero__briefing-main">
              <span className="ov-hero__briefing-eyebrow">{t('overviewGlanceHeading')}</span>
              <p className="ov-hero__briefing-text">{briefingText}</p>
            </span>
          </div>
        ) : null}

        {tiles.length > 0 ? (
          <ul className="ov-hero__tiles">{tiles}</ul>
        ) : (
          <p className="ov-hero__empty">{t('overviewGlanceEmpty')}</p>
        )}
      </div>
    </section>
  )
}
