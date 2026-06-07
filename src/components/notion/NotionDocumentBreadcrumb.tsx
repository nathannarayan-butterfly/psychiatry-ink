interface NotionDocumentBreadcrumbProps {
  documentLabel: string
  sectionLabel?: string
}

export function NotionDocumentBreadcrumb({
  documentLabel,
  sectionLabel,
}: NotionDocumentBreadcrumbProps) {
  return (
    <div className="notion-document-breadcrumb" aria-label={`${documentLabel}${sectionLabel ? ` — ${sectionLabel}` : ''}`}>
      <span className="notion-document-breadcrumb__item">{documentLabel}</span>
      {sectionLabel ? (
        <>
          <span className="notion-document-breadcrumb__sep" aria-hidden> — </span>
          <span className="notion-document-breadcrumb__item notion-document-breadcrumb__item--section">
            {sectionLabel}
          </span>
        </>
      ) : null}
    </div>
  )
}
