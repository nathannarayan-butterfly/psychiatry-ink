import type { ReactNode } from 'react'

interface ClinicalEyebrowProps {
  children: ReactNode
  className?: string
  inline?: boolean
}

/** Uppercase section label — SICHERHEIT, DIAGNOSEN, etc. */
export function ClinicalEyebrow({ children, className, inline }: ClinicalEyebrowProps) {
  const classes = ['cm-eyebrow', inline ? 'cm-eyebrow--inline' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return <span className={classes}>{children}</span>
}
