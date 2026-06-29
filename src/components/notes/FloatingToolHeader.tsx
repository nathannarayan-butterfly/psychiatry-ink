import type { ReactNode } from 'react'

interface FloatingToolHeaderProps {
  /** Brand/identity mark shown on the left (a lucide icon). */
  icon: ReactNode
  /** Panel title text. */
  title: string
  /** Optional id wired to the dialog's aria-labelledby. */
  titleId?: string
  /** Optional secondary line (e.g. scope chip / context). */
  subtitle?: ReactNode
  /** Control buttons rendered on the right — move/dock/close, in order. */
  actions: ReactNode
}

/**
 * The single shared floating-tool header: `[icon] → [title (+subtitle)] → [actions]`.
 *
 * This is the exact markup + CSS classes the Notizen dock/float panels use (via
 * `NotizenPanel`) and the Ask-Butterfly dock chrome, extracted so the Kommentare
 * panel is visually identical 1:1 instead of carrying a divergent custom header.
 */
export function FloatingToolHeader({ icon, title, titleId, subtitle, actions }: FloatingToolHeaderProps) {
  return (
    <header className="ask-butterfly-dialog__header">
      <div className="ask-butterfly-dialog__title-wrap">
        <span className="ask-butterfly-dialog__mark notizen-dialog__mark">{icon}</span>
        <div>
          <h2 id={titleId} className="ask-butterfly-dialog__title">
            {title}
          </h2>
          {subtitle != null ? <p className="ask-butterfly-dialog__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <div className="ask-butterfly-dialog__header-actions">{actions}</div>
    </header>
  )
}
