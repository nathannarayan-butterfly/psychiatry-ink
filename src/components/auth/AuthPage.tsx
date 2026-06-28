import { useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { AppLogo } from '../AppLogo'
import { SignupWizard } from './SignupWizard'
import { ResendConfirmation } from './ResendConfirmation'
import { PasswordInput } from './PasswordInput'

type AuthMode = 'login' | 'signup'

interface AuthPageProps {
  mode: AuthMode
  onBack: () => void
  onSuccess: () => void
  onSwitchMode: (mode: AuthMode) => void
}

export function AuthPage({ mode, onBack, onSuccess, onSwitchMode }: AuthPageProps) {
  const { t } = useTranslation()
  const { signIn, isConfigured, configError, configDiagnostics } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (mode === 'signup') {
    return (
      <SignupWizard
        onBack={onBack}
        onSuccess={onSuccess}
        onSwitchToLogin={() => onSwitchMode('login')}
      />
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setNeedsConfirmation(false)
    setSubmitting(true)

    try {
      const result = await signIn(email.trim(), password)
      if (result.error) {
        setError(result.error)
        setNeedsConfirmation(result.needsConfirmation)
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
        <div className="auth-card">
          <h1>{t('authLoginTitle')}</h1>
          <p className="auth-card__lead">{t('authLoginLead')}</p>

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
              <PasswordInput
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!isConfigured || submitting}
              />
            </label>

            {error ? (
              <p className="auth-form__error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="landing-btn landing-btn--primary auth-form__submit"
              disabled={!isConfigured || submitting}
            >
              {submitting ? t('authPleaseWait') : t('authLoginSubmit')}
            </button>
          </form>

          {needsConfirmation ? <ResendConfirmation email={email.trim()} lockEmail /> : null}

          <p className="auth-card__switch">
            {t('authNoAccountYet')}{' '}
            <button
              type="button"
              className="auth-card__switch-link"
              onClick={() => onSwitchMode('signup')}
            >
              {t('authSwitchToSignup')}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
