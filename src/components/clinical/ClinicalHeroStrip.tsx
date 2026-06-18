interface ClinicalHeroStripProps {
  name: string
  metaLine?: string | null
  caseId?: string | null
  thesis?: string | null
  className?: string
}

/** Typographic patient hero — name in theme accent, demographics inline, optional clinical thesis. */
export function ClinicalHeroStrip({ name, metaLine, caseId, thesis, className }: ClinicalHeroStripProps) {
  const classes = ['cm-hero', className ?? ''].filter(Boolean).join(' ')
  return (
    <header className={classes} aria-label="Patient">
      <div className="cm-hero__row">
        <h1 className="cm-hero__name">{name}</h1>
        {metaLine ? <span className="cm-hero__meta">{metaLine}</span> : null}
        {caseId ? <span className="cm-hero__case-id">{caseId}</span> : null}
      </div>
      {thesis ? <p className="cm-hero__thesis">{thesis}</p> : null}
    </header>
  )
}
