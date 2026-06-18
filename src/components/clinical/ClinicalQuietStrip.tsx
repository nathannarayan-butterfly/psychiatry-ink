import type { ReactNode } from 'react'
import { ClinicalEyebrow } from './ClinicalEyebrow'

interface ClinicalQuietStripProps {
  eyebrow: string
  headline: string
  detail?: string | null
  tone?: 'high' | 'moderate' | 'info' | 'ok' | 'low' | 'neutral'
  children?: ReactNode
  className?: string
  'aria-label'?: string
}

/** Left-border authority strip — safety and similar high-signal blocks without loud tiles. */
export function ClinicalQuietStrip({
  eyebrow,
  headline,
  detail,
  tone = 'neutral',
  children,
  className,
  'aria-label': ariaLabel,
}: ClinicalQuietStripProps) {
  const classes = ['cm-quiet-strip', `cm-quiet-strip--tone-${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <section className={classes} aria-label={ariaLabel ?? eyebrow}>
      <ClinicalEyebrow>{eyebrow}</ClinicalEyebrow>
      <p className="cm-quiet-strip__headline">{headline}</p>
      {detail ? <p className="cm-quiet-strip__detail">{detail}</p> : null}
      {children}
    </section>
  )
}
