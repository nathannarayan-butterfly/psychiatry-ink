import { CalendarClock, Pill, ShieldAlert, Stethoscope } from 'lucide-react'
import type { HeroSummaryData } from './types'

interface OverviewHeroProps {
  data: HeroSummaryData
}

/**
 * Executive-summary band anchoring the Übersicht: the four headline facts a
 * psychiatrist reads first. Bold numerals + small captions, a subtle
 * theme-derived gradient for presence. All values are real; absent sources show
 * a calm placeholder. Risk uses semantic tone; everything else uses the theme
 * accent / area hue only as decoration.
 */
export function OverviewHero({ data }: OverviewHeroProps) {
  const { primaryDiagnosis, risk, activeMedCount, alertCount, nextAppointment } = data

  return (
    <section className="ov-hero" aria-label="Übersicht auf einen Blick">
      <div className="ov-hero__metric">
        <span className="ov-hero__icon" aria-hidden>
          <Stethoscope size={16} />
        </span>
        <div className="ov-hero__content">
          <span className="ov-hero__caption">Hauptdiagnose</span>
          {primaryDiagnosis ? (
            <>
              <span className="ov-hero__value ov-hero__value--code">
                {primaryDiagnosis.code || '—'}
              </span>
              <span className="ov-hero__sub" title={primaryDiagnosis.label}>
                {primaryDiagnosis.label}
              </span>
            </>
          ) : (
            <span className="ov-hero__value ov-hero__value--muted">—</span>
          )}
        </div>
      </div>

      <div className={`ov-hero__metric ov-hero__metric--risk ${risk ? `ov-hero__metric--tone-${risk.tone}` : ''}`.trim()}>
        <span className="ov-hero__icon" aria-hidden>
          <ShieldAlert size={16} />
        </span>
        <div className="ov-hero__content">
          <span className="ov-hero__caption">Risiko</span>
          <span className="ov-hero__value">
            <span className="ov-hero__risk-dot" aria-hidden />
            {risk ? risk.label : 'unauffällig'}
          </span>
          <span className="ov-hero__sub">
            {alertCount > 0 ? `${alertCount} aktive${alertCount === 1 ? 'r' : ''} Alert${alertCount === 1 ? '' : 's'}` : 'keine Alerts'}
          </span>
        </div>
      </div>

      <div className="ov-hero__metric">
        <span className="ov-hero__icon" aria-hidden>
          <Pill size={16} />
        </span>
        <div className="ov-hero__content">
          <span className="ov-hero__caption">Medikation</span>
          <span className="ov-hero__value ov-hero__value--num">{activeMedCount}</span>
          <span className="ov-hero__sub">{activeMedCount === 1 ? 'aktives Präparat' : 'aktive Präparate'}</span>
        </div>
      </div>

      <div className="ov-hero__metric">
        <span className="ov-hero__icon" aria-hidden>
          <CalendarClock size={16} />
        </span>
        <div className="ov-hero__content">
          <span className="ov-hero__caption">Nächster Termin</span>
          {nextAppointment ? (
            <>
              <span className="ov-hero__value ov-hero__value--accent">
                {nextAppointment.relativeLabel ?? nextAppointment.dateLabel}
              </span>
              <span className="ov-hero__sub" title={nextAppointment.title}>
                {nextAppointment.relativeLabel ? `${nextAppointment.dateLabel} · ` : ''}
                {nextAppointment.title}
              </span>
            </>
          ) : (
            <span className="ov-hero__value ov-hero__value--muted">kein Termin</span>
          )}
        </div>
      </div>
    </section>
  )
}
