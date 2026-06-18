interface ClinicalPageEyebrowProps {
  label: string
}

/** Page-level eyebrow with extending hairline rule (ÜBERSICHT, MEDIKATION …). */
export function ClinicalPageEyebrow({ label }: ClinicalPageEyebrowProps) {
  return (
    <div className="cm-page-eyebrow" aria-hidden={false}>
      <h2 className="cm-page-eyebrow__label">{label}</h2>
      <hr className="cm-page-eyebrow__rule" />
    </div>
  )
}
