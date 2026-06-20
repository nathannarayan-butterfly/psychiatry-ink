import { ButterflyLogo } from '../ButterflyLogo'
import { useHomepageContent } from '../../hooks/useHomepageContent'

interface PoweredByLineProps {
  className?: string
}

export function PoweredByLine({ className }: PoweredByLineProps) {
  const { poweredBy } = useHomepageContent()

  return (
    <p className={['hp-powered-by', className].filter(Boolean).join(' ')}>
      <ButterflyLogo variant="grey" size={12} />
      <span>{poweredBy.label}</span>
    </p>
  )
}
