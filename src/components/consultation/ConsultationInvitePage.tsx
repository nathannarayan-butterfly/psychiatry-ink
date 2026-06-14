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

interface ConsultationInvitePageProps {
  token: string
  onNavigate: (path: string) => void
}

export function ConsultationInvitePage({ token, onNavigate }: ConsultationInvitePageProps) {
  const { user, loading: authLoading, isConfigured } = useAuth()
  const [preview, setPreview] = useState<{ specialty: string; title: string; inviteeEmail: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    void previewConsultationInvite(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ungültige Einladung'))
  }, [token])

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
      setError(err instanceof Error ? err.message : 'Annahme fehlgeschlagen')
    } finally {
      setAccepting(false)
    }
  }, [token, onNavigate])

  if (!isConfigured) {
    return (
      <div className="consultation-invite">
        <p>Supabase-Authentifizierung erforderlich.</p>
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
          <h1 className="consultation-invite__title">Konsil-Einladung</h1>
          <p className="consultation-invite__meta">Bitte anmelden, um die Einladung anzunehmen.</p>
          <button
            type="button"
            className="consultation-page__create-btn"
            onClick={() => onNavigate(`/login?redirect=${redirect}`)}
          >
            Anmelden
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="consultation-invite">
      <div className="consultation-invite__card">
        <h1 className="consultation-invite__title">Konsil-Einladung</h1>
        {preview ? (
          <>
            <p className="consultation-invite__meta">
              {preview.specialty} — {preview.title}
            </p>
            <p className="consultation-invite__meta">Für: {preview.inviteeEmail}</p>
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
              Abbrechen
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
                'Einladung annehmen'
              )}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
