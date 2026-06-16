import type { ReactNode } from 'react'

/** Semantic tone used by status pills and the safety card. Distinct from the area accent. */
export type SemanticTone = 'high' | 'moderate' | 'low' | 'info' | 'ok' | 'neutral'

export interface OverviewCardAction {
  label: string
  onClick: () => void
}

export interface OverviewCardProps {
  title: string
  /** Small leading glyph (lucide icon element). */
  icon?: ReactNode
  /** `safety` draws a semantic emphasis frame; `default` uses the subtle area-accent stripe. */
  variant?: 'default' | 'safety'
  /** Overall tone for the safety/emphasis frame. */
  tone?: SemanticTone
  /** Bento span hint — combined with grid placement in the dashboard stylesheet. */
  span?: 'normal' | 'wide' | 'tall'
  /** Primary text link rendered in the header (uses theme accent). */
  action?: OverviewCardAction
  /** Optional pill rendered next to the title (count / status). */
  badge?: { label: string; tone?: SemanticTone }
  /** Extra header controls rendered on the right (before the action link). */
  headerExtra?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/**
 * Shared bento card shell for the Übersicht dashboard. Owns the card surface,
 * elevation, header (title + optional badge + action link) and the subtle
 * area-accent top stripe. Semantic emphasis (`variant="safety"`) is reserved
 * for the safety / alerts card — everything else leans on the neutral surface
 * with the per-area accent only as a subtle tint, per the theme contract.
 */
export function OverviewCard({
  title,
  icon,
  variant = 'default',
  tone = 'neutral',
  span = 'normal',
  action,
  badge,
  headerExtra,
  className,
  bodyClassName,
  children,
}: OverviewCardProps) {
  const classes = [
    'ov-card',
    `ov-card--${variant}`,
    variant === 'safety' ? `ov-card--tone-${tone}` : '',
    span !== 'normal' ? `ov-card--${span}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      <header className="ov-card__head">
        <div className="ov-card__title-wrap">
          {icon ? (
            <span className="ov-card__icon" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h3 className="ov-card__title">{title}</h3>
          {badge ? (
            <span className={`ov-pill ov-pill--${badge.tone ?? 'neutral'}`}>{badge.label}</span>
          ) : null}
        </div>
        <div className="ov-card__head-actions">
          {headerExtra}
          {action ? (
            <button type="button" className="ov-card__action" onClick={action.onClick}>
              {action.label}
              <span aria-hidden>→</span>
            </button>
          ) : null}
        </div>
      </header>
      <div className={['ov-card__body', bodyClassName ?? ''].filter(Boolean).join(' ')}>
        {children}
      </div>
    </section>
  )
}

interface OverviewCardShellProps {
  className?: string
  children: ReactNode
}

/**
 * Headless card surface (same chrome + area-accent stripe as {@link OverviewCard}
 * but no standardized header). Used to host reused widgets that already render
 * their own functional header/title (Diagnosen, Spiegelwerte) so their titles
 * are not duplicated and their inline controls stay intact.
 */
export function OverviewCardShell({ className, children }: OverviewCardShellProps) {
  return (
    <section className={['ov-card', className ?? ''].filter(Boolean).join(' ')}>
      <div className="ov-card__body ov-card__body--headless">{children}</div>
    </section>
  )
}

interface OverviewEmptyProps {
  children: ReactNode
}

/** Consistent muted empty-state line used inside cards when a data source is absent. */
export function OverviewEmpty({ children }: OverviewEmptyProps) {
  return <p className="ov-empty">{children}</p>
}
