import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'

/** Seconds the button stays disabled after a send, to respect Supabase rate limits. */
const RESEND_COOLDOWN_SECONDS = 45

interface ResendConfirmationProps {
  /** Email captured from the signup/login flow; prefills (and may hide) the input. */
  email?: string
  /**
   * When true the email is taken from props and no input is shown (signup flow,
   * where we already know the address). When false a small input is rendered so
   * the user can supply the address (login flow).
   */
  lockEmail?: boolean
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function ResendConfirmation({ email = '', lockEmail = false }: ResendConfirmationProps) {
  const { t } = useTranslation()
  const { resendConfirmation, isConfigured } = useAuth()

  const [emailValue, setEmailValue] = useState(email)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (email) setEmailValue(email)
  }, [email])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown((value) => {
        if (value <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return value - 1
      })
    }, 1000)
  }, [])

  const handleResend = useCallback(async () => {
    const target = (lockEmail ? email : emailValue).trim()
    if (!target) {
      setStatus('error')
      setMessage(t('authResendConfirmationEmailRequired'))
      return
    }

    setStatus('sending')
    setMessage(null)
    const result = await resendConfirmation(target)

    if (result.rateLimited) {
      setStatus('error')
      setMessage(t('authResendConfirmationRateLimited'))
      startCooldown()
      return
    }
    if (result.error) {
      setStatus('error')
      setMessage(result.error)
      return
    }

    setStatus('sent')
    setMessage(t('authResendConfirmationSent'))
    startCooldown()
  }, [email, emailValue, lockEmail, resendConfirmation, startCooldown, t])

  const onCooldown = cooldown > 0
  const disabled = !isConfigured || status === 'sending' || onCooldown

  const buttonLabel = (() => {
    if (status === 'sending') return t('authResendConfirmationSending')
    if (onCooldown) return t('authResendConfirmationCooldown').replace('{seconds}', String(cooldown))
    return t('authResendConfirmationButton')
  })()

  return (
    <div className="auth-resend">
      <p className="auth-resend__prompt">{t('authResendConfirmationPrompt')}</p>

      {!lockEmail ? (
        <label className="auth-form__field auth-resend__field">
          <span>{t('authEmailLabel')}</span>
          <input
            type="email"
            autoComplete="email"
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
            disabled={!isConfigured || status === 'sending'}
          />
        </label>
      ) : null}

      <button
        type="button"
        className="landing-btn landing-btn--ghost auth-resend__button"
        onClick={() => void handleResend()}
        disabled={disabled}
      >
        {buttonLabel}
      </button>

      {message ? (
        <p
          className={status === 'error' ? 'auth-form__error' : 'auth-form__info'}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
