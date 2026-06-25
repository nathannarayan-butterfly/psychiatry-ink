import type { ReactNode } from 'react'
import { ClinicalEyebrow } from './ClinicalEyebrow'

export interface ClinicalSectionAction {
  label: string
  onClick: () => void
}

interface ClinicalSectionProps {
  eyebrow: string
  /** Optional supporting line beneath the eyebrow title. */
  subtitle?: string | null
  meta?: string | null
  action?: ClinicalSectionAction
  headerExtra?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
  'aria-label'?: string
}

/** Flat clinical section — eyebrow header, no card chrome. */
export function ClinicalSection({
  eyebrow,
  subtitle,
  meta,
  action,
  headerExtra,
  className,
  bodyClassName,
  children,
  'aria-label': ariaLabel,
}: ClinicalSectionProps) {
  const classes = ['cm-section', className ?? ''].filter(Boolean).join(' ')
  const bodyClasses = ['cm-section__body', bodyClassName ?? ''].filter(Boolean).join(' ')
  return (
    <section className={classes} aria-label={ariaLabel ?? eyebrow}>
      <header className="cm-section__head">
        <div className="cm-section__title-block">
          <ClinicalEyebrow inline>{eyebrow}</ClinicalEyebrow>
          {subtitle ? <p className="cm-section__subtitle">{subtitle}</p> : null}
        </div>
        {meta ? <span className="cm-section__meta">{meta}</span> : null}
        <span className="cm-section__head-spacer" aria-hidden />
        {headerExtra}
        {action ? (
          <button type="button" className="cm-section__action" onClick={action.onClick}>
            {action.label}
            <span aria-hidden>→</span>
          </button>
        ) : null}
      </header>
      <div className={bodyClasses}>{children}</div>
    </section>
  )
}

interface ClinicalEmptyProps {
  children: ReactNode
}

export function ClinicalEmpty({ children }: ClinicalEmptyProps) {
  return <p className="cm-empty">{children}</p>
}
