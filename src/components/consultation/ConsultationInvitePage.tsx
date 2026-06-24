import { useCallback, useEffect, useState } from 'react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { useAuth } from '../../context/AuthContext'
import {
  acceptConsultationInvite,
  previewConsultationInvite,
} from '../../services/consultationApi'
import {
  konsilKeyStorageId,
  persistKeyBase64Url,
  readKeyFromFragment,
} from '../../utils/e2ee'
import { useTranslation } from '../../context/TranslationContext'
import { translateConsultationUi } from '../../data/consultationUiTranslations'

interface ConsultationInvitePageProps {
  token: string
  onNavigate: (path: string) => void
}

export function ConsultationInvitePage({ token, onNavigate }: ConsultationInvitePageProps) {
  const { language } = useTranslation()
  const { user, loading: authLoading, isConfigured } = useAuth()
  const [preview, setPreview] = useState<{ specialty: string; title: string; inviteeEmail: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    void previewConsultationInvite(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errInvalidInvite')))
  }, [token, language])

  const handleAccept = useCallback(async () => {
    setAccepting(true)
    setError(null)
    try {
      const result = await acceptConsultationInvite(token)
      // Persist the E2EE key from the link fragment before navigating away
      // (the fragment is lost once we change routes).
      const keyB64 = readKeyFromFragment()
      if (keyB64) {
        persistKeyBase64Url(konsilKeyStorageId(result.request.id), keyB64)
      }
      onNavigate(`/consultant/requests/${encodeURIComponent(result.request.id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errAcceptFailed'))
    } finally {
      setAccepting(false)
    }
  }, [token, onNavigate, language])

  if (!isConfigured) {
    return (
      <div className="consultation-invite">
        <p>{translateConsultationUi(language, 'supabaseAuthRequired')}</p>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="consultation-invite">
        <ClinicalLoading />
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(window.location.pathname)
    return (
      <div className="consultation-invite">
        <div className="consultation-invite__card">
          <h1 className="consultation-invite__title">{translateConsultationUi(language, 'inviteTitle')}</h1>
          <p className="consultation-invite__meta">{translateConsultationUi(language, 'inviteLoginPrompt')}</p>
          <button
            type="button"
            className="consultation-page__create-btn"
            onClick={() => onNavigate(`/login?redirect=${redirect}`)}
          >
            {translateConsultationUi(language, 'signIn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="consultation-invite">
      <div className="consultation-invite__card">
        <h1 className="consultation-invite__title">{translateConsultationUi(language, 'inviteTitle')}</h1>
        {preview ? (
          <>
            <p className="consultation-invite__meta">
              {preview.specialty} — {preview.title}
            </p>
            <p className="consultation-invite__meta">{translateConsultationUi(language, 'inviteFor')}: {preview.inviteeEmail}</p>
          </>
        ) : error ? (
          <p className="consultation-page__error">{error}</p>
        ) : (
          <ClinicalLoading variant="compact" />
        )}
        {error && preview ? <p className="consultation-page__error">{error}</p> : null}
        {preview ? (
          <>
            <button
              type="button"
              className="consultation-page__back clinical-back-link"
              style={{ marginBottom: '0.75rem' }}
              onClick={() => onNavigate('/dashboard')}
            >
              {translateConsultationUi(language, 'cancel')}
            </button>
            <button
              type="button"
              className="consultation-page__create-btn"
              disabled={accepting}
              onClick={() => void handleAccept()}
            >
              {accepting ? (
                <span className="clinical-loading__spinner" aria-hidden="true" />
              ) : (
                translateConsultationUi(language, 'acceptInvite')
              )}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
