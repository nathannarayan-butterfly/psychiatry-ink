import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, Eye, Send, Users } from 'lucide-react'
import type { ClinicalWorkspacePayload } from '../../utils/workspaceVault'
import type { DiscussPackageContent, DiscussPackageSectionKey } from '../../types/discussCase'
import { DISCUSS_PACKAGE_SECTION_LABELS } from '../../types/discussCase'
import {
  ALL_PACKAGE_SECTION_KEYS,
  buildDiscussionPackage,
} from '../../utils/discussCase/buildPackage'
import {
  createDiscussion,
  createDiscussInvite,
  previewPackageAsViewer,
} from '../../services/discussCaseApi'
import {
  buildKeyFragment,
  discussKeyStorageId,
  encryptJson,
  exportKeyToBase64Url,
  generatePackageKey,
  persistKeyBase64Url,
} from '../../utils/e2ee'
import { DiscussCaseDocumentViewer } from './DiscussCaseDocumentViewer'

interface DiscussCasePackageBuilderProps {
  caseId: string
  payload: ClinicalWorkspacePayload
  patientName?: string
  onBack: () => void
  onCreated: (discussionId: string) => void
}

type BuilderStep = 'select' | 'preview' | 'invite'

export function DiscussCasePackageBuilder({
  caseId,
  payload,
  patientName,
  onBack,
  onCreated,
}: DiscussCasePackageBuilderProps) {
  const [step, setStep] = useState<BuilderStep>('select')
  const [selectedSections, setSelectedSections] = useState<Set<DiscussPackageSectionKey>>(
    () => new Set(['diagnosis', 'anamnesis', 'therapie-verlauf']),
  )
  const [title, setTitle] = useState('Fallbesprechung')
  const [previewAs, setPreviewAs] = useState<'internal' | 'external'>('internal')
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [inviteType, setInviteType] = useState<'internal' | 'external'>('internal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdDiscussionId, setCreatedDiscussionId] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [packageKeyB64, setPackageKeyB64] = useState<string | null>(null)

  const packages = useMemo(
    () =>
      buildDiscussionPackage({
        caseId,
        payload,
        selectedSections: [...selectedSections],
        patientName,
        patientLabel: 'Patient',
      }),
    [caseId, payload, selectedSections, patientName],
  )

  const previewPackage: DiscussPackageContent = useMemo(
    () => (previewAs === 'internal' ? packages.identified : packages.deidentified),
    [packages, previewAs],
  )

  const toggleSection = useCallback((key: DiscussPackageSectionKey) => {
    setSelectedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleCreateAndPreview = useCallback(async () => {
    setError(null)
    if (selectedSections.size === 0) {
      setError('Mindestens einen Abschnitt auswählen.')
      return
    }
    setStep('preview')
  }, [selectedSections.size])

  const handleCreateDiscussion = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // E2EE: encrypt the identified package in the browser with a random key.
      // Only ciphertext is uploaded; the key is kept locally + delivered to
      // invitees out-of-band via the invite-link fragment.
      const key = await generatePackageKey()
      const keyB64 = await exportKeyToBase64Url(key)
      const encryptedIdentified = await encryptJson(key, packages.identified)

      const result = await createDiscussion({
        caseId,
        title,
        sections: [...selectedSections],
        packageContent: encryptedIdentified,
        deidentifiedPackageContent: packages.deidentified,
      })

      persistKeyBase64Url(discussKeyStorageId(result.discussion.id), keyB64)
      setPackageKeyB64(keyB64)
      setCreatedDiscussionId(result.discussion.id)
      setStep('invite')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erstellen fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [caseId, title, selectedSections, packages])

  const handleSendInvite = useCallback(async () => {
    if (!createdDiscussionId) return
    setLoading(true)
    setError(null)
    try {
      const invite = await createDiscussInvite({
        discussionId: createdDiscussionId,
        inviteeEmail: inviteeEmail.trim() || undefined,
        inviteType,
      })
      if (invite.inviteToken) {
        const base = `${window.location.origin}/discuss/invite/${invite.inviteToken}`
        // Internal invitees may view identified data and therefore need the
        // decryption key appended to the link fragment. External invitees only
        // ever receive the plaintext de-identified package — no key required.
        const link =
          inviteType === 'internal' && packageKeyB64
            ? `${base}${buildKeyFragment(packageKeyB64)}`
            : base
        setInviteLink(link)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Einladung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [createdDiscussionId, inviteeEmail, inviteType, packageKeyB64])

  const handlePreviewAsInvited = useCallback(async () => {
    setPreviewAs((prev) => (prev === 'internal' ? 'external' : 'internal'))
    try {
      await previewPackageAsViewer({
        identifiedContent: packages.identified,
        deidentifiedPackageContent: packages.deidentified,
        viewAs: previewAs === 'internal' ? 'external' : 'internal',
      })
    } catch {
      // Local preview fallback is sufficient
    }
  }, [packages, previewAs])

  return (
    <div className="discuss-case-builder">
      <header className="discuss-case-builder__header">
        <button type="button" className="discuss-case-builder__back clinical-back-link" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Zurück
        </button>
        <h1 className="discuss-case-builder__title">DiscussCase — Paket erstellen</h1>
        <p className="discuss-case-builder__subtitle">
          Abschnitte auswählen, Vorschau prüfen, dann einladen.
        </p>
      </header>

      {error ? <p className="discuss-case-builder__error">{error}</p> : null}

      {step === 'select' ? (
        <div className="discuss-case-builder__body">
          <div className="discuss-case-builder__form">
            <label className="discuss-case-builder__label">
              Titel
              <input
                type="text"
                className="discuss-case-builder__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <fieldset className="discuss-case-builder__sections">
              <legend className="discuss-case-builder__legend">Klinische Abschnitte</legend>
              {ALL_PACKAGE_SECTION_KEYS.map((key) => (
                <label key={key} className="discuss-case-builder__checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSections.has(key)}
                    onChange={() => toggleSection(key)}
                  />
                  {DISCUSS_PACKAGE_SECTION_LABELS[key as DiscussPackageSectionKey]}
                </label>
              ))}
            </fieldset>

            <button
              type="button"
              className="discuss-case-builder__primary"
              onClick={() => void handleCreateAndPreview()}
            >
              Vorschau
            </button>
          </div>

          <div className="discuss-case-builder__preview-pane">
            <DiscussCaseDocumentViewer
              packageContent={previewPackage}
              annotations={[]}
              canHighlight={false}
              canComment={false}
              canCopy={false}
              canQuote={false}
            />
          </div>
        </div>
      ) : null}

      {step === 'preview' ? (
        <div className="discuss-case-builder__body discuss-case-builder__body--preview">
          <div className="discuss-case-builder__preview-toolbar">
            <button
              type="button"
              className="discuss-case-builder__secondary"
              onClick={() => setStep('select')}
            >
              Abschnitte ändern
            </button>
            <button
              type="button"
              className="discuss-case-builder__secondary"
              onClick={() => void handlePreviewAsInvited()}
            >
              <Eye className="h-4 w-4" strokeWidth={1.75} />
              {previewAs === 'internal' ? 'Als externer Nutzer' : 'Als interner Nutzer'}
            </button>
            <button
              type="button"
              className="discuss-case-builder__primary"
              disabled={loading}
              onClick={() => void handleCreateDiscussion()}
            >
              Paket speichern &amp; einladen
            </button>
          </div>
          <div className="discuss-case-builder__preview-pane">
            <DiscussCaseDocumentViewer
              packageContent={previewPackage}
              annotations={[]}
              canHighlight={false}
              canComment={false}
              canCopy={previewAs === 'internal'}
              canQuote={false}
            />
          </div>
        </div>
      ) : null}

      {step === 'invite' && createdDiscussionId ? (
        <div className="discuss-case-builder__invite">
          <h2 className="discuss-case-builder__invite-title">
            <Users className="h-5 w-5" strokeWidth={1.75} />
            Teilnehmer einladen
          </h2>

          <label className="discuss-case-builder__label">
            E-Mail / Benutzername
            <input
              type="text"
              className="discuss-case-builder__input"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              placeholder="kollege@klinik.de"
            />
          </label>

          <div className="discuss-case-builder__invite-type">
            <label>
              <input
                type="radio"
                name="inviteType"
                checked={inviteType === 'internal'}
                onChange={() => setInviteType('internal')}
              />
              Intern (Org)
            </label>
            <label>
              <input
                type="radio"
                name="inviteType"
                checked={inviteType === 'external'}
                onChange={() => setInviteType('external')}
              />
              Extern (de-identifiziert)
            </label>
          </div>

          <div className="discuss-case-builder__invite-actions">
            <button
              type="button"
              className="discuss-case-builder__primary"
              disabled={loading || !inviteeEmail.trim()}
              onClick={() => void handleSendInvite()}
            >
              <Send className="h-4 w-4" strokeWidth={1.75} />
              Einladung senden
            </button>
            <button
              type="button"
              className="discuss-case-builder__secondary"
              onClick={() => onCreated(createdDiscussionId)}
            >
              Zur Besprechung
            </button>
          </div>

          {inviteLink ? (
            <p className="discuss-case-builder__invite-link">
              Einladungslink: <code>{inviteLink}</code>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
