interface ClinicalLoadingProps {
  variant?: 'block' | 'inline' | 'compact'
  label?: string
  className?: string
}

export function ClinicalLoading({ variant = 'block', label, className }: ClinicalLoadingProps) {
  const classes = ['clinical-loading', `clinical-loading--${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} role="status" aria-label={label ?? 'Laden'}>
      <span className="clinical-loading__spinner" aria-hidden="true" />
      {label ? <span className="clinical-info-text">{label}</span> : null}
    </div>
  )
}
