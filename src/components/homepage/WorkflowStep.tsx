interface WorkflowStepProps {
  index: number
  title: string
  description: string
}

export function WorkflowStep({ index, title, description }: WorkflowStepProps) {
  return (
    <li className="hp-workflow-step">
      <span className="hp-workflow-step__index" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="hp-workflow-step__content">
        <h3 className="hp-workflow-step__title">{title}</h3>
        <p className="hp-workflow-step__body">{description}</p>
      </div>
    </li>
  )
}
