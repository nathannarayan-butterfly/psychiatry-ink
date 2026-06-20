interface SecurityPrincipleCardProps {
  title: string
  description: string
}

export function SecurityPrincipleCard({ title, description }: SecurityPrincipleCardProps) {
  return (
    <article className="hp-card hp-card--security">
      <h3 className="hp-card__title">{title}</h3>
      <p className="hp-card__body">{description}</p>
    </article>
  )
}
