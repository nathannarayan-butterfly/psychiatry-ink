interface ModulePreviewCardProps {
  label: string
  title: string
  description: string
}

export function ModulePreviewCard({ label, title, description }: ModulePreviewCardProps) {
  return (
    <article className="hp-module-card">
      <div className="hp-module-card__header">
        <span className="hp-module-card__label" aria-hidden>
          {label}
        </span>
      </div>
      <h3 className="hp-module-card__title">{title}</h3>
      <p className="hp-module-card__body">{description}</p>
    </article>
  )
}
