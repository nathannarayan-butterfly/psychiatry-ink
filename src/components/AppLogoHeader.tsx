import type { ReactNode } from 'react'
import { AppLogo } from './AppLogo'

interface AppLogoHeaderProps {
  onNavigateHome?: () => void
}

export function AppLogoHeader({ onNavigateHome }: AppLogoHeaderProps) {
  return (
    <header className="app-logo-header">
      <AppLogo onClick={onNavigateHome} />
    </header>
  )
}

interface ClinicalFullPageLayoutProps {
  onNavigateHome?: () => void
  children: ReactNode
}

export function ClinicalFullPageLayout({ onNavigateHome, children }: ClinicalFullPageLayoutProps) {
  return (
    <div className="clinical-full-page">
      <AppLogoHeader onNavigateHome={onNavigateHome} />
      <div className="clinical-full-page__body">{children}</div>
    </div>
  )
}
