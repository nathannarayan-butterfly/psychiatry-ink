interface FeatureCardProps {
  title: string
  description: string
}

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="hp-card">
      <h3 className="hp-card__title">{title}</h3>
      <p className="hp-card__body">{description}</p>
    </article>
  )
}
