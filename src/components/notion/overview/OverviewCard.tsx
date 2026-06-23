import type { ReactNode } from 'react'
import { ClinicalSection, ClinicalEmpty, type ClinicalSectionAction } from '../../clinical/ClinicalSection'

/** Semantic tone used by status pills and the safety card. Distinct from the area accent. */
export type SemanticTone = 'high' | 'moderate' | 'low' | 'info' | 'ok' | 'neutral'

export interface OverviewCardAction {
  label: string
  onClick: () => void
}

export interface OverviewCardProps {
  title: string
  /** Optional supporting line beneath the section title. */
  subtitle?: string | null
  /** Optional right-aligned meta line in the section header. */
  meta?: string | null
  /** Small leading glyph (lucide icon element). Ignored in flat minimal layout. */
  icon?: ReactNode
  /** `safety` uses quiet-strip styling via the card consumer; `default` is flat. */
  variant?: 'default' | 'safety'
  /** Overall tone for safety/emphasis. */
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

function badgeMeta(badge?: { label: string; tone?: SemanticTone }): string | null {
  return badge?.label ?? null
}

/**
 * Flat clinical section shell for the Übersicht dashboard. Replaces the former
 * heavy card chrome with typographic eyebrows and generous whitespace.
 */
export function OverviewCard({
  title,
  subtitle,
  meta,
  variant: _variant = 'default',
  action,
  badge,
  headerExtra,
  className,
  bodyClassName,
  children,
}: OverviewCardProps) {
  const sectionAction: ClinicalSectionAction | undefined = action
    ? { label: action.label, onClick: action.onClick }
    : undefined
  const headerMeta = meta ?? badgeMeta(badge)

  return (
    <ClinicalSection
      eyebrow={title}
      subtitle={subtitle}
      meta={headerMeta}
      action={sectionAction}
      headerExtra={headerExtra}
      className={className}
      bodyClassName={bodyClassName}
    >
      {children}
    </ClinicalSection>
  )
}

interface OverviewCardShellProps {
  className?: string
  children: ReactNode
}

/**
 * Headless flat surface for reused widgets that render their own section headers
 * (Diagnosen, Spiegelwerte).
 */
export function OverviewCardShell({ className, children }: OverviewCardShellProps) {
  return <div className={['cm-section cm-section--embedded', className ?? ''].filter(Boolean).join(' ')}>{children}</div>
}

interface OverviewEmptyProps {
  children: ReactNode
}

/** Consistent muted empty-state line used inside sections when a data source is absent. */
export function OverviewEmpty({ children }: OverviewEmptyProps) {
  return <ClinicalEmpty>{children}</ClinicalEmpty>
}
