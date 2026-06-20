/**
 * Clinical Intelligence — collapsible section wrapper.
 *
 * Thin native `<details>` wrapper styled to match the clinical-minimal
 * Übersicht surface. Used for the post-graph sections (treatment,
 * missing info, exploratory, clinician review). Defaults to closed —
 * caller can pass `defaultOpen` to override per-section.
 */
import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface CiAccordionProps {
  eyebrow: string
  meta?: string | null
  defaultOpen?: boolean
  headerExtra?: ReactNode
  children: ReactNode
  /** Optional className appended to the root wrapper for variant styling. */
  className?: string
}

export function CiAccordion({
  eyebrow,
  meta,
  defaultOpen = false,
  headerExtra,
  children,
  className,
}: CiAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const classes = ['ci-accordion', open ? 'ci-accordion--open' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes} aria-label={eyebrow}>
      <header className="ci-accordion__head">
        <button
          type="button"
          className="ci-accordion__toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <ChevronDown className="ci-accordion__chev" aria-hidden strokeWidth={2} />
          ) : (
            <ChevronRight className="ci-accordion__chev" aria-hidden strokeWidth={2} />
          )}
          <span className="ci-accordion__eyebrow">{eyebrow}</span>
          {meta ? <span className="ci-accordion__meta">{meta}</span> : null}
        </button>
        {headerExtra}
      </header>
      {open ? <div className="ci-accordion__body">{children}</div> : null}
    </section>
  )
}
