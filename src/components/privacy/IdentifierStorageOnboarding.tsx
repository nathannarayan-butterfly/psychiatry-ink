import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { markIdentifierStorageAcknowledged } from '../../utils/identifierStorage'
import type { CaseFileStorageMode } from '../../utils/caseFileStorageMode'
import { CaseFileStorageCards } from './CaseFileStorageCards'

interface IdentifierStorageOnboardingProps {
  initialMode: CaseFileStorageMode
  onConfirm: (mode: CaseFileStorageMode) => void
  onDismiss: () => void
}

export function IdentifierStorageOnboarding({
  initialMode,
  onConfirm,
  onDismiss,
}: IdentifierStorageOnboardingProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<CaseFileStorageMode>(initialMode)

  const handleConfirm = () => {
    markIdentifierStorageAcknowledged()
    onConfirm(mode)
    onDismiss()
  }

  return (
    <div className="identifier-onboarding-backdrop" role="presentation">
      <div
        className="identifier-onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="identifier-onboarding-title"
      >
        <header className="identifier-onboarding-dialog__header">
          <h2 id="identifier-onboarding-title" className="identifier-onboarding-dialog__title">
            {t('identifierStorageOnboardingTitle')}
          </h2>
          <button
            type="button"
            className="identifier-onboarding-dialog__close"
            onClick={onDismiss}
            aria-label={t('settingsClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>
        <p className="identifier-onboarding-dialog__lead">{t('identifierStorageOnboardingLead')}</p>

        <CaseFileStorageCards
          mode={mode}
          onChange={setMode}
          showStatus
          allowAdvanced
          name="onboarding-case-file-storage-mode"
        />

        <div className="identifier-onboarding-dialog__actions">
          <button
            type="button"
            className="landing-btn landing-btn--primary"
            onClick={handleConfirm}
          >
            {t('identifierStorageOnboardingConfirm')}
          </button>
          <button type="button" className="landing-btn landing-btn--ghost" onClick={onDismiss}>
            {t('identifierStorageOnboardingLater')}
          </button>
        </div>
        <p className="identifier-onboarding-dialog__footer">{t('identifierStorageCanChangeLater')}</p>
      </div>
    </div>
  )
}
