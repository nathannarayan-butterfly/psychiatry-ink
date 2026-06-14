import { useCallback, useMemo, useState } from 'react'
import type { ClinicalWorkspacePayload } from '../../utils/workspaceVault'
import type {
  ConsultationAccessType,
  ConsultationSectionKey,
  ConsultationUrgency,
  PatientIdentifierMode,
} from '../../types/consultation'
import {
  ALL_CONSULTATION_SECTION_KEYS,
  CONSULTATION_SECTION_LABELS,
} from '../../types/consultation'
import { buildConsultationSharedItems } from '../../utils/consultation/buildPackage'
import { createConsultation } from '../../services/consultationApi'
import {
  buildKeyFragment,
  encryptJson,
  exportKeyToBase64Url,
  generatePackageKey,
  konsilKeyStorageId,
  persistKeyBase64Url,
} from '../../utils/e2ee'
import {
  formatConsultationCaseRef,
  printConsultationDocument,
} from '../../utils/consultation/printConsultation'

interface ConsultationRequestBuilderProps {
  caseId: string
  payload: ClinicalWorkspacePayload
  patientName?: string
  onBack: () => void
  onCreated: (requestId: string, inviteToken?: string) => void
}

const SPECIALTIES = [
  'Psychiatrie',
  'Psychosomatik',
  'Forensische Psychiatrie',
  'Suchtmedizin',
  'Geriatrie',
  'Neurologie',
  'Innere Medizin',
  'Kardiologie',
  'Nephrologie',
  'Endokrinologie',
  'Gynäkologie',
  'Pädiatrie',
  'Radiologie',
  'Pathologie',
  'Laboratoriumsmedizin',
  'Pharmakologie',
  'Rechtsmedizin',
  'Sozialmedizin',
  'Palliativmedizin',
  'Allgemeinmedizin',
  'Sonstige / Freitext',
]

export function ConsultationRequestBuilder({
  caseId,
  payload,
  patientName,
  onBack,
  onCreated,
}: ConsultationRequestBuilderProps) {
  const [specialty, setSpecialty] = useState('Psychiatrie')
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [consultantEmail, setConsultantEmail] = useState('')
  const [consultantUserId, setConsultantUserId] = useState('')
  const [accessType, setAccessType] = useState<ConsultationAccessType>('external_consultant')
  const [urgency, setUrgency] = useState<ConsultationUrgency>('routine')
  const [title, setTitle] = useState('')
  const [clinicalQuestion, setClinicalQuestion] = useState('')
  const [kurzanamnese, setKurzanamnese] = useState('')
  const [examinationRequested, setExaminationRequested] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [legalConsentNote, setLegalConsentNote] = useState('')
  const [identifierMode, setIdentifierMode] = useState<PatientIdentifierMode>('deidentified')
  const [customText, setCustomText] = useState('')
  const [selectedSections, setSelectedSections] = useState<Set<ConsultationSectionKey>>(
    () => new Set(['diagnosis', 'anamnesis', 'medication']),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const resolvedSpecialty = specialty === 'Sonstige / Freitext' ? customSpecialty.trim() : specialty

  const sharedItems = useMemo(
    () =>
      buildConsultationSharedItems({
        caseId,
        payload,
        selectedSections: [...selectedSections],
        patientName,
        patientLabel: 'Patient',
        identifierMode,
        customText,
      }),
    [caseId, payload, selectedSections, patientName, identifierMode, customText],
  )

  const toggleSection = useCallback((key: ConsultationSectionKey) => {
    setSelectedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handlePrintPreview = useCallback(() => {
    printConsultationDocument({
      caseRef: formatConsultationCaseRef(caseId),
      specialty: resolvedSpecialty || '—',
      title: title.trim() || 'Konsilanfrage',
      clinicalQuestion: clinicalQuestion.trim(),
      kurzanamnese: kurzanamnese.trim(),
      urgency,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      examinationRequested,
      legalConsentNote: legalConsentNote.trim() || null,
      sharedSectionLabels: sharedItems.map((item) => item.label),
    })
  }, [
    caseId,
    resolvedSpecialty,
    title,
    clinicalQuestion,
    kurzanamnese,
    urgency,
    deadline,
    examinationRequested,
    legalConsentNote,
    sharedItems,
  ])

  const handleSubmit = useCallback(
    async (saveAsDraft: boolean) => {
      setError(null)
      if (!resolvedSpecialty) {
        setError('Fachrichtung angeben.')
        return
      }
      if (!title.trim() || !clinicalQuestion.trim()) {
        setError('Titel und Fragestellung sind erforderlich.')
        return
      }
      if (!saveAsDraft && !consultantEmail.trim() && !consultantUserId.trim()) {
        setError('Konsiliar-E-Mail oder Benutzer-ID angeben.')
        return
      }
      if (sharedItems.length === 0) {
        setError('Mindestens einen Abschnitt freigeben.')
        return
      }

      setLoading(true)
      try {
        // E2EE: encrypt each shared item's content client-side with a random
        // per-request key. Only ciphertext is uploaded; the key is delivered to
        // the consultant out-of-band via the invite-link fragment.
        const key = await generatePackageKey()
        const keyB64 = await exportKeyToBase64Url(key)
        const encryptedItems = await Promise.all(
          sharedItems.map(async (item) => ({
            ...item,
            content: JSON.stringify(await encryptJson(key, item.content)),
          })),
        )

        const result = await createConsultation({
          caseId,
          specialty: resolvedSpecialty,
          consultantUserId: consultantUserId.trim() || undefined,
          consultantEmail: consultantEmail.trim() || undefined,
          accessType,
          urgency,
          title: title.trim(),
          clinicalQuestion: clinicalQuestion.trim(),
          kurzanamnese: kurzanamnese.trim(),
          examinationRequested,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          legalConsentNote: legalConsentNote.trim() || null,
          patientIdentifierMode: identifierMode,
          sharedItems: encryptedItems,
          saveAsDraft,
        })

        // Retain the key locally for the clinician (keyed by request id).
        persistKeyBase64Url(konsilKeyStorageId(result.request.id), keyB64)

        // When an invite link is generated, keep the clinician on this screen so
        // they can copy the link (with the embedded decryption key) and send it
        // to the consultant. Otherwise (the consultant is already linked by user
        // id, or this is a draft) continue straight to the request overview.
        if (result.inviteToken) {
          setInviteLink(
            `${window.location.origin}/consultant/invite/${result.inviteToken}${buildKeyFragment(keyB64)}`,
          )
          setCreatedRequestId(result.request.id)
        } else {
          onCreated(result.request.id, result.inviteToken)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Senden fehlgeschlagen')
      } finally {
        setLoading(false)
      }
    },
    [
      resolvedSpecialty,
      title,
      clinicalQuestion,
      consultantEmail,
      consultantUserId,
      sharedItems,
      caseId,
      accessType,
      urgency,
      kurzanamnese,
      examinationRequested,
      deadline,
      legalConsentNote,
      identifierMode,
      onCreated,
    ],
  )

  if (inviteLink && createdRequestId) {
    return (
      <div className="consultation-builder">
        <header className="consultation-builder__header">
          <div>
            <button
              type="button"
              className="consultation-builder__back clinical-back-link"
              onClick={() => onCreated(createdRequestId)}
            >
              ← Zur Übersicht
            </button>
            <h1 className="consultation-builder__title">Konsil gesendet</h1>
            <p className="consultation-builder__subtitle">
              Senden Sie diesen Link an den Konsiliar. Er ist nur einmal gültig.
            </p>
          </div>
        </header>
        <div className="consultation-builder__body">
          <div className="consultation-builder__invite-success">
            <code className="consultation-builder__invite-link-code">{inviteLink}</code>
            <div className="consultation-builder__actions">
              <button
                type="button"
                className="consultation-builder__secondary"
                onClick={handlePrintPreview}
              >
                Drucken
              </button>
              <button
                type="button"
                className="consultation-builder__secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? 'Kopiert' : 'Link kopieren'}
              </button>
              <button
                type="button"
                className="consultation-builder__primary"
                onClick={() => onCreated(createdRequestId)}
              >
                Zur Übersicht
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="consultation-builder">
      <header className="consultation-builder__header">
        <div>
          <button type="button" className="consultation-builder__back clinical-back-link" onClick={onBack}>
            ← Zurück
          </button>
          <h1 className="consultation-builder__title">Konsil anfordern</h1>
          <p className="consultation-builder__subtitle">Konsilanfrage erstellen und Unterlagen freigeben</p>
        </div>
      </header>

      {error ? <p className="consultation-builder__error">{error}</p> : null}

      <div className="consultation-builder__layout">
        <div className="consultation-builder__main">
        <section className="consultation-builder__section">
          <h2 className="consultation-builder__section-title">Konsiliar & Fachrichtung</h2>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-specialty">
              Fachrichtung
            </label>
            <select
              id="ks-specialty"
              className="consultation-builder__select"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {specialty === 'Sonstige / Freitext' ? (
            <div className="consultation-builder__field">
              <label className="consultation-builder__label" htmlFor="ks-custom-specialty">
                Eigene Fachrichtung
              </label>
              <input
                id="ks-custom-specialty"
                className="consultation-builder__input"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
              />
            </div>
          ) : null}
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-email">
              Konsiliar E-Mail
            </label>
            <input
              id="ks-email"
              type="email"
              className="consultation-builder__input"
              value={consultantEmail}
              onChange={(e) => setConsultantEmail(e.target.value)}
            />
          </div>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-user-id">
              Konsiliar Benutzer-ID (für registrierte Nutzer)
            </label>
            <input
              id="ks-user-id"
              className="consultation-builder__input"
              value={consultantUserId}
              onChange={(e) => setConsultantUserId(e.target.value)}
              placeholder="UUID des Konsiliar-Benutzers"
            />
          </div>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-access">
              Zugriffsart
            </label>
            <select
              id="ks-access"
              className="consultation-builder__select"
              value={accessType}
              onChange={(e) => setAccessType(e.target.value as ConsultationAccessType)}
            >
              <option value="internal_consultant">Interner Konsiliar</option>
              <option value="external_consultant">Externer Konsiliar</option>
              <option value="one_time_external">Einmaliger externer Zugang</option>
            </select>
          </div>
        </section>

        <section className="consultation-builder__section">
          <h2 className="consultation-builder__section-title">Fragestellung</h2>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-title">
              Titel
            </label>
            <input
              id="ks-title"
              className="consultation-builder__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Konsilanfrage"
            />
          </div>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-urgency">
              Dringlichkeit
            </label>
            <select
              id="ks-urgency"
              className="consultation-builder__select"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as ConsultationUrgency)}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Dringend</option>
              <option value="emergency">Notfall</option>
            </select>
          </div>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-question">
              Fragestellung
            </label>
            <textarea
              id="ks-question"
              className="consultation-builder__textarea consultation-builder__textarea--large"
              value={clinicalQuestion}
              onChange={(e) => setClinicalQuestion(e.target.value)}
              rows={6}
            />
          </div>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-kurz">
              Kurzanamnese
            </label>
            <textarea
              id="ks-kurz"
              className="consultation-builder__textarea consultation-builder__textarea--large"
              value={kurzanamnese}
              onChange={(e) => setKurzanamnese(e.target.value)}
              rows={5}
            />
          </div>
          <label className="consultation-builder__checkbox">
            <input
              type="checkbox"
              checked={examinationRequested}
              onChange={(e) => setExaminationRequested(e.target.checked)}
            />
            Direkte Patientenuntersuchung angefordert
          </label>
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-deadline">
              Frist (optional)
            </label>
            <input
              id="ks-deadline"
              type="date"
              className="consultation-builder__input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </section>

        <section className="consultation-builder__section">
          <h2 className="consultation-builder__section-title">Freigegebene Unterlagen</h2>
          {accessType !== 'internal_consultant' ? (
            <p className="consultation-builder__warning">
              Externer Konsiliarzugang: Patientenkennzeichen werden gemäß gewähltem Modus reduziert.
            </p>
          ) : null}
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-id-mode">
              Kennzeichnungsmodus
            </label>
            <select
              id="ks-id-mode"
              className="consultation-builder__select"
              value={identifierMode}
              onChange={(e) => setIdentifierMode(e.target.value as PatientIdentifierMode)}
            >
              <option value="deidentified">De-identifiziert</option>
              <option value="pseudonymized">Pseudonymisiert</option>
              <option value="full">Vollständig (nur intern)</option>
            </select>
          </div>
          <div className="consultation-builder__checkboxes">
            {ALL_CONSULTATION_SECTION_KEYS.map((key) => (
              <label key={key} className="consultation-builder__checkbox">
                <input
                  type="checkbox"
                  checked={selectedSections.has(key)}
                  onChange={() => toggleSection(key)}
                />
                {CONSULTATION_SECTION_LABELS[key]}
              </label>
            ))}
            <label className="consultation-builder__checkbox">
              <input
                type="checkbox"
                checked={selectedSections.has('custom_text')}
                onChange={() => toggleSection('custom_text')}
              />
              {CONSULTATION_SECTION_LABELS.custom_text}
            </label>
          </div>
          {selectedSections.has('custom_text') ? (
            <div className="consultation-builder__field">
              <textarea
                className="consultation-builder__textarea"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Zusätzlicher Freitext…"
              />
            </div>
          ) : null}
        </section>

        <section className="consultation-builder__section">
          <div className="consultation-builder__field">
            <label className="consultation-builder__label" htmlFor="ks-consent">
              Rechtliches / Einwilligung (optional)
            </label>
            <textarea
              id="ks-consent"
              className="consultation-builder__textarea"
              value={legalConsentNote}
              onChange={(e) => setLegalConsentNote(e.target.value)}
            />
          </div>
        </section>

        <div className="consultation-builder__actions">
          <button
            type="button"
            className="consultation-builder__secondary"
            disabled={loading}
            onClick={handlePrintPreview}
          >
            Drucken
          </button>
          <button
            type="button"
            className="consultation-builder__secondary"
            disabled={loading}
            onClick={() => void handleSubmit(true)}
          >
            Entwurf speichern
          </button>
          <button
            type="button"
            className="consultation-builder__primary"
            disabled={loading}
            onClick={() => void handleSubmit(false)}
          >
            {loading ? 'Senden…' : 'Konsil anfordern'}
          </button>
        </div>
        </div>

        <aside className="consultation-builder__preview">
          <h2 className="consultation-builder__preview-title">Vorschau — Freigabe</h2>
          <p className="consultation-builder__preview-hint">
            Diese Abschnitte werden dem Konsiliar übermittelt.
          </p>
          {sharedItems.length === 0 ? (
            <p className="clinical-empty-state">Noch keine Abschnitte ausgewählt.</p>
          ) : (
            <ul className="consultation-builder__preview-list">
              {sharedItems.map((item, index) => (
                <li key={`${item.itemKey}-${index}`} className="consultation-builder__preview-item">
                  <span className="consultation-builder__preview-item-label">{item.label}</span>
                  <p className="consultation-builder__preview-item-snippet">
                    {item.content.slice(0, 180)}
                    {item.content.length > 180 ? '…' : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
