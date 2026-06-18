import type { ReactNode } from 'react'
import { ClinicalEyebrow } from './ClinicalEyebrow'

export interface ClinicalSectionAction {
  label: string
  onClick: () => void
}

interface ClinicalSectionProps {
  eyebrow: string
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
        <ClinicalEyebrow inline>{eyebrow}</ClinicalEyebrow>
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
