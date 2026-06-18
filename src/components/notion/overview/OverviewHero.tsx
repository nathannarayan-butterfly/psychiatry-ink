import { CalendarClock, History, Pill, ShieldAlert, Stethoscope } from 'lucide-react'
import { lookupCatalogLabel } from '../../../data/diagnosisCatalog'
import { DiagnosisDisplayLabel } from '../../diagnosis/DiagnosisDisplayLabel'
import type { HeroSummaryData } from './types'

interface OverviewHeroProps {
  data: HeroSummaryData
}

/**
 * Slim "Auf einen Blick" summary strip — the orientation layer of the Übersicht.
 * One calm row of the few facts a psychiatrist scans first (Hauptdiagnose, Risiko,
 * Medikation, letzter/nächster Kontakt). Headline values only; the cards below
 * carry the detail. Risk uses semantic tone; everything else uses the area hue as
 * quiet decoration. Absent sources degrade to a muted placeholder.
 */
export function OverviewHero({ data }: OverviewHeroProps) {
  const { primaryDiagnosis, risk, activeMedCount, alertCount, lastContact, nextAppointment } = data

  return (
    <section className="ov-summary" aria-label="Übersicht auf einen Blick">
      <div className="ov-summary__item">
        <span className="ov-summary__icon" aria-hidden>
          <Stethoscope size={16} />
        </span>
        <div className="ov-summary__content">
          <span className="ov-summary__caption">Hauptdiagnose</span>
          {primaryDiagnosis ? (
            <>
              <span className="ov-summary__value" title={primaryDiagnosis.label}>
                {primaryDiagnosis.code || primaryDiagnosis.label}
              </span>
              {primaryDiagnosis.code ? (
                <span className="ov-summary__sub">
                  <DiagnosisDisplayLabel
                    code={primaryDiagnosis.code}
                    version={primaryDiagnosis.version}
                    criteriaLabel={lookupCatalogLabel(primaryDiagnosis.code, primaryDiagnosis.version)}
                    enteredLabel={primaryDiagnosis.overridden ? primaryDiagnosis.label : null}
                    overridden={primaryDiagnosis.overridden}
                    className="ov-summary__sub"
                  />
                </span>
              ) : null}
            </>
          ) : (
            <span className="ov-summary__value ov-summary__value--muted">—</span>
          )}
        </div>
      </div>

      <div className={`ov-summary__item ${risk ? `ov-summary__item--tone-${risk.tone}` : ''}`.trim()}>
        <span className="ov-summary__icon" aria-hidden>
          <ShieldAlert size={16} />
        </span>
        <div className="ov-summary__content">
          <span className="ov-summary__caption">Risiko</span>
          <span className="ov-summary__value">
            <span className="ov-summary__dot" aria-hidden />
            {risk ? risk.label : 'unauffällig'}
          </span>
          <span className="ov-summary__sub">
            {alertCount > 0
              ? `${alertCount} ${alertCount === 1 ? 'Alert' : 'Alerts'}`
              : 'keine Alerts'}
          </span>
        </div>
      </div>

      <div className="ov-summary__item">
        <span className="ov-summary__icon" aria-hidden>
          <Pill size={16} />
        </span>
        <div className="ov-summary__content">
          <span className="ov-summary__caption">Medikation</span>
          <span className="ov-summary__value">{activeMedCount}</span>
          <span className="ov-summary__sub">
            {activeMedCount === 1 ? 'aktives Präparat' : 'aktive Präparate'}
          </span>
        </div>
      </div>

      <div className="ov-summary__item">
        <span className="ov-summary__icon" aria-hidden>
          <History size={16} />
        </span>
        <div className="ov-summary__content">
          <span className="ov-summary__caption">Letzter Kontakt</span>
          {lastContact ? (
            <>
              <span className="ov-summary__value">
                {lastContact.relativeLabel ?? lastContact.dateLabel}
              </span>
              {lastContact.relativeLabel ? (
                <span className="ov-summary__sub">{lastContact.dateLabel}</span>
              ) : null}
            </>
          ) : (
            <span className="ov-summary__value ov-summary__value--muted">—</span>
          )}
        </div>
      </div>

      <div className="ov-summary__item">
        <span className="ov-summary__icon" aria-hidden>
          <CalendarClock size={16} />
        </span>
        <div className="ov-summary__content">
          <span className="ov-summary__caption">Nächster Termin</span>
          {nextAppointment ? (
            <>
              <span className="ov-summary__value">
                {nextAppointment.relativeLabel ?? nextAppointment.dateLabel}
              </span>
              <span className="ov-summary__sub" title={nextAppointment.title}>
                {nextAppointment.relativeLabel ? `${nextAppointment.dateLabel} · ` : ''}
                {nextAppointment.title}
              </span>
            </>
          ) : (
            <span className="ov-summary__value ov-summary__value--muted">kein Termin</span>
          )}
        </div>
      </div>
    </section>
  )
}
