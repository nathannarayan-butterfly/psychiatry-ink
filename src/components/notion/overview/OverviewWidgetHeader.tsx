import { ClinicalEyebrow } from '../../clinical/ClinicalEyebrow'

interface OverviewWidgetHeaderProps {
  title: string
}

/** Title block for headless overview widgets (CI, embedded panels). */
export function OverviewWidgetHeader({ title }: OverviewWidgetHeaderProps) {
  return (
    <header className="cm-section__head cm-section__head--widget">
      <div className="cm-section__title-block">
        <ClinicalEyebrow inline>{title}</ClinicalEyebrow>
      </div>
    </header>
  )
}
