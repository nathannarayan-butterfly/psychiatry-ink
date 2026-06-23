interface TierCardProps {
  name: string
  price: string
  description: string
  features: readonly string[]
  cta: string
  featured?: boolean
  note?: string
  onCta: () => void
}

export function TierCard({
  name,
  price,
  description,
  features,
  cta,
  featured,
  note,
  onCta,
}: TierCardProps) {
  return (
    <article className={`hp-tier${featured ? ' hp-tier--featured' : ''}`}>
      {featured ? <span className="hp-tier__badge hp-tier__badge--floating">Recommended</span> : null}
      <h3 className="hp-tier__name">{name}</h3>
      <p className="hp-tier__price">{price}</p>
      <p className="hp-tier__description">{description}</p>
      <ul className="hp-tier__features">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button
        type="button"
        className={`hp-btn${featured ? ' hp-btn--primary' : ' hp-btn--ghost'} hp-tier__cta`}
        onClick={onCta}
      >
        {cta}
      </button>
      {note ? <p className="hp-tier__note">{note}</p> : null}
    </article>
  )
}
