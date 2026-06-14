import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { teamRoleLabelDe } from '../../data/org/teamRoles'
import { acceptOrgInvite, fetchInvitePreview } from '../../services/orgApi'
import type { InvitePreview } from '../../services/orgApi'
import { ClinicalLoading } from '../ui/ClinicalLoading'

interface TeamInvitePageProps {
  token: string
  onNavigate: (path: string) => void
}

export function TeamInvitePage({ token, onNavigate }: TeamInvitePageProps) {
  const { user, loading: authLoading } = useAuth()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchInvitePreview(token)
        if (!cancelled) setPreview(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Einladung nicht gefunden')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleAccept = useCallback(async () => {
    if (!user) {
      const redirect = encodeURIComponent(window.location.pathname)
      onNavigate(`/login?redirect=${redirect}`)
      return
    }

    setAccepting(true)
    setError(null)
    try {
      await acceptOrgInvite(token)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Einladung konnte nicht angenommen werden')
    } finally {
      setAccepting(false)
    }
  }, [onNavigate, token, user])

  if (loading || authLoading) {
    return (
      <div className="team-settings-page">
        <div className="team-settings-page__inner">
          <ClinicalLoading label="Einladung wird geladen…" />
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="team-settings-page text-ink">
        <div className="team-settings-page__inner">
          <h1 className="team-settings-page__title">Einladung angenommen</h1>
          <p className="clinical-info-text">
            Sie sind jetzt Mitglied von {preview?.organisationName ?? 'der Praxis'}.
          </p>
          <button
            type="button"
            className="team-settings-btn team-settings-btn--primary"
            style={{ marginTop: '1rem' }}
            onClick={() => onNavigate('/dashboard')}
          >
            Zum Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (error && !preview) {
    return (
      <div className="team-settings-page text-ink">
        <div className="team-settings-page__inner">
          <p className="team-settings-error">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="team-settings-page text-ink">
      <div className="team-settings-page__inner">
        <h1 className="team-settings-page__title">Team-Einladung</h1>
        {preview ? (
          <p className="clinical-info-text">
            Sie wurden eingeladen, <strong>{preview.organisationName}</strong> als{' '}
            <strong>{teamRoleLabelDe(preview.role)}</strong> beizutreten ({preview.email}).
          </p>
        ) : null}
        {error ? <p className="team-settings-error">{error}</p> : null}
        <button
          type="button"
          className="team-settings-btn team-settings-btn--primary"
          style={{ marginTop: '1rem' }}
          onClick={() => void handleAccept()}
          disabled={accepting}
        >
          {accepting ? 'Wird angenommen…' : user ? 'Einladung annehmen' : 'Anmelden und annehmen'}
        </button>
      </div>
    </div>
  )
}
