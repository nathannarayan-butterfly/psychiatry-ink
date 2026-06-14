import { useEffect, useState } from 'react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type { DiscussInvitePreview } from '../../services/discussCaseApi'
import { acceptDiscussInvite, previewDiscussInvite } from '../../services/discussCaseApi'
import type { DiscussPackageContent } from '../../types/discussCase'
import {
  decryptJson,
  isEncryptedEnvelope,
  readKeyFromFragment,
  importKeyFromBase64Url,
} from '../../utils/e2ee'
import { DiscussCaseView } from './DiscussCaseView'

interface DiscussCaseInvitePageProps {
  token: string
  onNavigate?: (path: string) => void
}

type PreviewState = {
  meta: DiscussInvitePreview
  sections: { id: string; label: string }[]
  /** True when identified content exists but could not be shown (no key). */
  identifiedHidden: boolean
}

const CONSENT_NOTE =
  'Mit dem Bestätigen erhalten Sie Zugriff auf die freigegebenen Fallunterlagen zur kollegialen ' +
  'Besprechung. Externe Teilnehmer sehen ausschließlich de-identifizierte Inhalte. Die Inhalte ' +
  'dürfen nur im Rahmen der fachlichen Beratung verwendet und nicht weitergegeben werden.'

export function DiscussCaseInvitePage({ token, onNavigate }: DiscussCaseInvitePageProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [discussionId, setDiscussionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const meta = await previewDiscussInvite(token)
        if (cancelled) return

        let sections: { id: string; label: string }[] = []
        let identifiedHidden = false

        if (isEncryptedEnvelope(meta.package)) {
          // Internal invite: identified content is encrypted. Attempt to read
          // the key from the link fragment to show a preview; otherwise show
          // metadata only.
          const keyB64 = readKeyFromFragment()
          if (keyB64) {
            try {
              const key = await importKeyFromBase64Url(keyB64)
              const decrypted = await decryptJson<DiscussPackageContent>(key, meta.package)
              sections = decrypted.sections.map((s) => ({ id: s.id, label: s.label }))
            } catch {
              identifiedHidden = true
            }
          } else {
            identifiedHidden = true
          }
        } else {
          sections = (meta.package as DiscussPackageContent).sections.map((s) => ({
            id: s.id,
            label: s.label,
          }))
        }

        if (!cancelled) setPreview({ meta, sections, identifiedHidden })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Einladung ungültig')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleAccept = async () => {
    if (accepting) return
    setAccepting(true)
    setError(null)
    try {
      const result = await acceptDiscussInvite(token)
      setDiscussionId(result.discussion.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annahme fehlgeschlagen')
    } finally {
      setAccepting(false)
    }
  }

  // Access granted → render the workspace. The decryption key (if any) is still
  // present in the URL fragment and is resolved by the view.
  if (discussionId) {
    return (
      <div className="discuss-case-invite">
        <DiscussCaseView discussionId={discussionId} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="discuss-case-invite">
        <ClinicalLoading />
      </div>
    )
  }

  if (error && !preview) {
    return <div className="discuss-case-invite discuss-case-invite--error">{error}</div>
  }

  if (!preview) return null

  const isExternal = preview.meta.inviteType === 'external'

  return (
    <div className="discuss-case-invite">
      <div className="discuss-case-consent">
        <h1 className="discuss-case-consent__title">DiscussCase — Einladung</h1>
        <p className="discuss-case-consent__subtitle">{preview.meta.discussion.title}</p>

        <div className="discuss-case-consent__badge-row">
          <span className="discuss-case-consent__badge">
            {isExternal ? 'Externer Zugang · de-identifiziert' : 'Interner Zugang'}
          </span>
        </div>

        <section className="discuss-case-consent__section">
          <h2 className="discuss-case-consent__section-title">Was wird geteilt</h2>
          {preview.identifiedHidden ? (
            <p className="discuss-case-consent__note">
              Diese Einladung enthält identifizierte Patientendaten. Eine Vorschau ist nur über den
              vollständigen Einladungslink (mit Schlüssel) möglich.
            </p>
          ) : preview.sections.length === 0 ? (
            <p className="discuss-case-consent__note">Keine Abschnitte freigegeben.</p>
          ) : (
            <ul className="discuss-case-consent__list">
              {preview.sections.map((s) => (
                <li key={s.id}>{s.label}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="discuss-case-consent__section">
          <h2 className="discuss-case-consent__section-title">Zweck</h2>
          <p className="discuss-case-consent__note">
            Kollegiale Fallbesprechung{isExternal ? ' mit de-identifizierten Unterlagen' : ''}.
          </p>
        </section>

        <section className="discuss-case-consent__section">
          <h2 className="discuss-case-consent__section-title">Hinweis</h2>
          <p className="discuss-case-consent__note">{CONSENT_NOTE}</p>
        </section>

        {error ? <p className="discuss-case-page__error">{error}</p> : null}

        <div className="discuss-case-consent__actions">
          <button
            type="button"
            className="discuss-case-builder__secondary clinical-back-link"
            onClick={() => onNavigate?.('/')}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="discuss-case-builder__primary"
            disabled={accepting}
            onClick={() => void handleAccept()}
          >
            {accepting ? (
              <span className="clinical-loading__spinner" aria-hidden="true" />
            ) : (
              'Zugriff bestätigen'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
