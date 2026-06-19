import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { RegisteredTherapiesSummary } from '../../../utils/overview/registeredTherapiesSummary'

interface RegisteredTherapiesCardProps {
  data: RegisteredTherapiesSummary
  onOpenTherapie: () => void
}

export function RegisteredTherapiesCard({ data, onOpenTherapie }: RegisteredTherapiesCardProps) {
  return (
    <OverviewCard
      title="Angemeldete Therapien"
      className="ov-col-6"
      action={{ label: 'Zur Therapie', onClick: onOpenTherapie }}
    >
      {data.lines.length === 0 ? (
        <OverviewEmpty>Keine angemeldeten Therapien.</OverviewEmpty>
      ) : (
        <ul className="ov-therapy-lines">
          {data.lines.map((line) => (
            <li key={line.id} className="ov-therapy-line">
              <div className="ov-therapy-line__head">
                <span className="ov-therapy-line__kind">{line.kind}</span>
                <span className="ov-therapy-line__label">{line.label}</span>
              </div>
              {line.goalSummary ? (
                <p className="ov-therapy-line__goal">{line.goalSummary}</p>
              ) : null}
              {line.nextSessionLabel ? (
                <p className="ov-therapy-line__next">{line.nextSessionLabel}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  )
}
