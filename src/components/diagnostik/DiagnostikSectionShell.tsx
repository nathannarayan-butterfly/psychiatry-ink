import type { ReactNode } from 'react'

interface DiagnostikSectionShellProps {
  /** Section title shown top-left. */
  title: string
  /** Optional "Anfordern" action shown top-right. */
  requestLabel?: string
  onRequest?: () => void
  children: ReactNode
}

/**
 * Canonical chrome for every patient-context Diagnostik section (EKG, EEG,
 * Bildgebung, …): a consistent header (title + optional order action) above the
 * section body. Sections compose their content — structured befund panels or
 * free-text panels — inside this shell so layout, spacing and the order button
 * stay identical across the subsystem.
 */
export function DiagnostikSectionShell({
  title,
  requestLabel,
  onRequest,
  children,
}: DiagnostikSectionShellProps) {
  return (
    <div className="labor-page__content diagnostik-freetext diagnostik-section">
      <header className="diagnostik-freetext__section-head">
        <h2 className="diagnostik-freetext__section-title">{title}</h2>
        {onRequest && requestLabel ? (
          <button
            type="button"
            className="diagnostik-befunde__action-btn diagnostik-befunde__action-btn--request"
            onClick={onRequest}
            title={requestLabel}
          >
            {requestLabel}
          </button>
        ) : null}
      </header>
      {children}
    </div>
  )
}
