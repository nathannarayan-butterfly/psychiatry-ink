import { useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { usePrivacySettings } from '../../hooks/usePrivacySettings'
import { IdentifierStorageChoice } from '../privacy/IdentifierStorageChoice'
import { AppLogo } from '../AppLogo'
import { markIdentifierStorageAcknowledged } from '../../utils/identifierStorage'
import type { IdentifierStorageMode } from '../../utils/identifierStorage'
import { localizedPath } from '../../public-site/publicRoutes'

type AuthMode = 'login' | 'signup'

interface AuthPageProps {
  mode: AuthMode
  onBack: () => void
  onSuccess: () => void
  onSwitchMode: (mode: AuthMode) => void
}

export function AuthPage({ mode, onBack, onSuccess, onSwitchMode }: AuthPageProps) {
  const { t, language } = useTranslation()
  const { signIn, signUp, isConfigured, configError, configDiagnostics } = useAuth()
  const { identifierStorage, setIdentifierStorage } = usePrivacySettings()
  const [signupIdentifierMode, setSignupIdentifierMode] = useState<IdentifierStorageMode>(identifierStorage)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isLogin = mode === 'login'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    try {
      if (isLogin) {
        const result = await signIn(email.trim(), password)
        if (result.error) {
          setError(result.error)
          return
        }
        onSuccess()
        return
      }

      if (!acceptedTerms) {
        setError(t('authSignupTermsRequiredError'))
        return
      }

      setIdentifierStorage(signupIdentifierMode)
      markIdentifierStorageAcknowledged()

      const result = await signUp(email.trim(), password, { acceptedTerms, locale: language })
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.needsConfirmation) {
        setInfo(t('authSignupConfirmEmail'))
        return
      }
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <button type="button" className="auth-page__back" onClick={onBack} aria-label={t('authBack')}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <AppLogo />
      </header>

      <main className="auth-page__main">
        <div className={`auth-card${isLogin ? '' : ' auth-card--wide'}`}>
          <h1>{isLogin ? t('authLoginTitle') : t('authSignupTitle')}</h1>
          <p className="auth-card__lead">
            {isLogin ? t('authLoginLead') : t('authSignupLead')}
          </p>

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

          {!isLogin ? (
            <div className="auth-card__privacy-block">
              <IdentifierStorageChoice
                value={signupIdentifierMode}
                onChange={setSignupIdentifierMode}
                variant="signup"
              />
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-form__field">
              <span>{t('authEmailLabel')}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!isConfigured || submitting}
              />
            </label>
            <label className="auth-form__field">
              <span>{t('authPasswordLabel')}</span>
              <input
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!isConfigured || submitting}
              />
            </label>

            {!isLogin ? (
              <label className="auth-form__consent">
                <input
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  disabled={!isConfigured || submitting}
                />
                <span className="auth-form__consent-text">
                  {t('authSignupAcceptTermsPrefix')}
                  <a
                    href={localizedPath('privacy', language)}
                    target="_blank"
                    rel="noreferrer"
                    className="auth-form__consent-link"
                  >
                    {t('authSignupPrivacyLink')}
                  </a>
                  {t('authSignupAcceptTermsConnector')}
                  <a
                    href={localizedPath('terms', language)}
                    target="_blank"
                    rel="noreferrer"
                    className="auth-form__consent-link"
                  >
                    {t('authSignupTermsLink')}
                  </a>
                </span>
              </label>
            ) : null}

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

            <button
              type="submit"
              className="landing-btn landing-btn--primary auth-form__submit"
              disabled={!isConfigured || submitting || (!isLogin && !acceptedTerms)}
            >
              {submitting ? t('authPleaseWait') : isLogin ? t('authLoginSubmit') : t('authSignupSubmit')}
            </button>
          </form>

          <p className="auth-card__switch">
            {isLogin ? t('authNoAccountYet') : t('authAlreadyRegistered')}{' '}
            <button
              type="button"
              className="auth-card__switch-link"
              onClick={() => onSwitchMode(isLogin ? 'signup' : 'login')}
            >
              {isLogin ? t('authSwitchToSignup') : t('authSwitchToLogin')}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
