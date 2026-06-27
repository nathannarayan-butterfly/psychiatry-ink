import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { AppLogo } from '../AppLogo'
import { LegalConsentModal } from './LegalConsentModal'
import { SignupStorageCards } from './SignupStorageCards'
import { setupAccountCloudBackup } from '../../utils/accountBackup'
import { markIdentifierStorageAcknowledged } from '../../utils/identifierStorage'
import type { IdentifierStorageMode } from '../../utils/identifierStorage'
import { markPendingSignupPassphrase } from '../../utils/pendingSignupPassphrase'
import {
  MAX_PASSPHRASE_LENGTH,
  MIN_PASSPHRASE_LENGTH,
  isPassphraseBlank,
  isPassphraseTooShortForSetup,
} from '../../utils/passphrasePolicy'
import { downloadPassphraseBackupFile } from '../../utils/passphraseRecovery'

const STEPS = ['credentials', 'storage', 'passphrase', 'terms', 'review'] as const
type SignupStep = (typeof STEPS)[number]

const STEP_LABEL_KEYS: Record<
  SignupStep,
  | 'signupWizardStepCredentials'
  | 'signupWizardStepStorage'
  | 'signupWizardStepPassphrase'
  | 'signupWizardStepTerms'
  | 'signupWizardStepReview'
> = {
  credentials: 'signupWizardStepCredentials',
  storage: 'signupWizardStepStorage',
  passphrase: 'signupWizardStepPassphrase',
  terms: 'signupWizardStepTerms',
  review: 'signupWizardStepReview',
}

interface SignupWizardProps {
  onBack: () => void
  onSuccess: () => void
  onSwitchToLogin: () => void
}

export function SignupWizard({ onBack, onSuccess, onSwitchToLogin }: SignupWizardProps) {
  const { t, language } = useTranslation()
  const { signUp, isConfigured, configError, configDiagnostics } = useAuth()
  const { identifierStorage, setIdentifierStorage } = usePrivacySettings()

  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [storageMode, setStorageMode] = useState<IdentifierStorageMode>(identifierStorage)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [legalModalOpen, setLegalModalOpen] = useState(false)
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy')

  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openLegalModal = (tab: 'privacy' | 'terms') => {
    setLegalModalTab(tab)
    setLegalModalOpen(true)
  }

  const validateStep = (targetStep: SignupStep): string | null => {
    switch (targetStep) {
      case 'credentials': {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) return t('signupWizardEmailRequired')
        if (password.length < 8) return t('signupWizardPasswordTooShort')
        if (password !== confirmPassword) return t('signupWizardPasswordMismatch')
        return null
      }
      case 'storage':
        return null
      case 'passphrase': {
        if (isPassphraseBlank(passphrase)) return t('signupWizardPassphraseRequired')
        if (isPassphraseTooShortForSetup(passphrase)) {
          return t('workspacePassphraseTooShort').replace('{min}', String(MIN_PASSPHRASE_LENGTH))
        }
        if (passphrase !== confirmPassphrase) return t('workspacePassphraseMismatch')
        return null
      }
      case 'terms':
        if (!acceptedTerms) return t('authSignupTermsRequiredError')
        return null
      case 'review':
        return null
      default:
        return null
    }
  }

  const goNext = () => {
    setError(null)
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((index) => index + 1)
    }
  }

  const goBack = () => {
    setError(null)
    if (stepIndex > 0) {
      setStepIndex((index) => index - 1)
    } else {
      onBack()
    }
  }

  const handleCreateAccount = async () => {
    setError(null)
    setInfo(null)

    for (const s of STEPS.slice(0, 4)) {
      const validationError = validateStep(s)
      if (validationError) {
        setError(validationError)
        setStepIndex(STEPS.indexOf(s))
        return
      }
    }

    setSubmitting(true)
    try {
      setIdentifierStorage(storageMode)
      markIdentifierStorageAcknowledged()

      const result = await signUp(email.trim(), password, { acceptedTerms, locale: language })
      if (result.error) {
        setError(result.error)
        return
      }

      if (result.needsConfirmation) {
        markPendingSignupPassphrase(passphrase)
        setInfo(t('authSignupConfirmEmail'))
        return
      }

      try {
        const backup = await setupAccountCloudBackup(passphrase)
        downloadPassphraseBackupFile(backup)
      } catch {
        markPendingSignupPassphrase(passphrase)
      }

      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const stepLead = () => {
    switch (step) {
      case 'credentials':
        return t('signupWizardCredentialsLead')
      case 'storage':
        return t('signupWizardStorageLead')
      case 'passphrase':
        return t('signupWizardPassphraseLead')
      case 'terms':
        return t('signupWizardTermsLead')
      case 'review':
        return t('signupWizardReviewLead')
      default:
        return ''
    }
  }

  const storageLabel =
    storageMode === 'device' ? t('identifierStorageDeviceTitle') : t('identifierStorageAccountTitle')

  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <button type="button" className="auth-page__back" onClick={goBack} aria-label={t('authBack')}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <AppLogo />
      </header>

      <main className="auth-page__main">
        <div className="auth-card auth-card--wide signup-wizard">
          <h1>{t('authSignupTitle')}</h1>
          <p className="auth-card__lead">{stepLead()}</p>

          <nav className="signup-wizard__progress" aria-label={t('signupWizardProgressLabel')}>
            {STEPS.map((s, index) => {
              const done = index < stepIndex
              const current = index === stepIndex
              return (
                <div
                  key={s}
                  className={`signup-wizard__step${current ? ' signup-wizard__step--current' : ''}${done ? ' signup-wizard__step--done' : ''}`}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className="signup-wizard__step-marker" aria-hidden>
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
                  </span>
                  <span className="signup-wizard__step-label">{t(STEP_LABEL_KEYS[s])}</span>
                </div>
              )
            })}
          </nav>

          {configError ? (
            <p className="auth-card__warn" role="alert">
              {configError}
            </p>
          ) : null}
          {import.meta.env.DEV && configDiagnostics ? (
            <p className="auth-card__diag" role="status">
              {configDiagnostics}
            </p>
          ) : null}

          <div className="signup-wizard__panel">
            {step === 'credentials' ? (
              <div className="auth-form">
                <label className="auth-form__field">
                  <span>{t('authEmailLabel')}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={!isConfigured || submitting}
                  />
                </label>
                <label className="auth-form__field">
                  <span>{t('authPasswordLabel')}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={!isConfigured || submitting}
                  />
                </label>
                <label className="auth-form__field">
                  <span>{t('signupWizardPasswordConfirmLabel')}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={!isConfigured || submitting}
                  />
                </label>
              </div>
            ) : null}

            {step === 'storage' ? (
              <SignupStorageCards
                value={storageMode}
                onChange={setStorageMode}
                disabled={!isConfigured || submitting}
              />
            ) : null}

            {step === 'passphrase' ? (
              <div className="auth-form">
                <label className="auth-form__field">
                  <span>{t('workspacePassphraseTitle')}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    maxLength={MAX_PASSPHRASE_LENGTH}
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    placeholder={t('workspacePassphrasePlaceholder')}
                    disabled={!isConfigured || submitting}
                  />
                </label>
                <label className="auth-form__field">
                  <span>{t('signupWizardPassphraseConfirmLabel')}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    maxLength={MAX_PASSPHRASE_LENGTH}
                    value={confirmPassphrase}
                    onChange={(event) => setConfirmPassphrase(event.target.value)}
                    placeholder={t('workspacePassphraseConfirmPlaceholder')}
                    disabled={!isConfigured || submitting}
                  />
                </label>
                <p className="signup-wizard__hint">
                  {t('workspacePassphraseMinLengthHint').replace('{min}', String(MIN_PASSPHRASE_LENGTH))}
                </p>
              </div>
            ) : null}

            {step === 'terms' ? (
              <div className="signup-wizard__terms">
                <p className="signup-wizard__terms-intro">{t('signupWizardTermsIntro')}</p>
                <div className="signup-wizard__terms-links">
                  <button
                    type="button"
                    className="signup-wizard__legal-link"
                    onClick={() => openLegalModal('privacy')}
                  >
                    {t('authSignupPrivacyLink')}
                  </button>
                  <span aria-hidden> · </span>
                  <button
                    type="button"
                    className="signup-wizard__legal-link"
                    onClick={() => openLegalModal('terms')}
                  >
                    {t('authSignupTermsLink')}
                  </button>
                </div>
                <label className="auth-form__consent">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    disabled={!isConfigured || submitting}
                  />
                  <span className="auth-form__consent-text">{t('signupWizardTermsCheckbox')}</span>
                </label>
              </div>
            ) : null}

            {step === 'review' ? (
              <div className="signup-wizard__review">
                <dl className="signup-wizard__summary">
                  <div>
                    <dt>{t('signupWizardReviewEmail')}</dt>
                    <dd>{email.trim()}</dd>
                  </div>
                  <div>
                    <dt>{t('signupWizardReviewStorage')}</dt>
                    <dd>{storageLabel}</dd>
                  </div>
                  <div>
                    <dt>{t('signupWizardReviewPassphrase')}</dt>
                    <dd>{t('signupWizardReviewPassphraseSet')}</dd>
                  </div>
                </dl>

                <div className="signup-wizard__warnings" role="note">
                  <p className="signup-wizard__warnings-title">{t('signupWizardReviewWarningTitle')}</p>
                  <ul>
                    <li>{t('signupWizardReviewWarningStore')}</li>
                    <li>{t('signupWizardReviewWarningUnrecoverable')}</li>
                    <li>{t('signupWizardReviewWarningNoRestore')}</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="auth-form__info" role="status">
              {info}
            </p>
          ) : null}

          <div className="signup-wizard__nav">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="landing-btn landing-btn--ghost"
                onClick={goBack}
                disabled={submitting}
              >
                {t('signupWizardBack')}
              </button>
            ) : (
              <span />
            )}
            {step !== 'review' ? (
              <button
                type="button"
                className="landing-btn landing-btn--primary"
                onClick={goNext}
                disabled={!isConfigured || submitting}
              >
                {t('signupWizardNext')}
              </button>
            ) : (
              <button
                type="button"
                className="landing-btn landing-btn--primary signup-wizard__create"
                onClick={() => void handleCreateAccount()}
                disabled={!isConfigured || submitting}
              >
                {submitting ? t('authPleaseWait') : t('authSignupSubmit')}
              </button>
            )}
          </div>

          <p className="auth-card__switch">
            {t('authAlreadyRegistered')}{' '}
            <button type="button" className="auth-card__switch-link" onClick={onSwitchToLogin}>
              {t('authSwitchToLogin')}
            </button>
          </p>
        </div>
      </main>

      <LegalConsentModal
        open={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  )
}
