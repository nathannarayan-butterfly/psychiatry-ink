import { useMemo, useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { ExtractedPatientIdentity } from '../../schemas/documentImport/envelope'

export interface CreatedPatientInput {
  vorname: string
  nachname: string
  geburtsdatum: string
}

export interface ExistingPatientOption {
  caseId: string
  label: string
  vorname?: string
  nachname?: string
}

interface PatientIdentityPanelProps {
  identity: ExtractedPatientIdentity | null
  existingPatients: ExistingPatientOption[]
  onConfirmCreate: (input: CreatedPatientInput) => void
  onConfirmExisting: (option: ExistingPatientOption) => void
}

/**
 * Standalone (dashboard) import step: confirm the deterministically-extracted
 * patient identity and either create a new patient or attach to an existing one.
 * Nothing is auto-applied — the clinician confirms before a patient is created
 * and before the name feeds de-identification.
 */
export function PatientIdentityPanel({
  identity,
  existingPatients,
  onConfirmCreate,
  onConfirmExisting,
}: PatientIdentityPanelProps) {
  const { t } = useTranslation()
  const hasExisting = existingPatients.length > 0
  const [mode, setMode] = useState<'create' | 'existing'>('create')
  const [vorname, setVorname] = useState(identity?.vorname ?? '')
  const [nachname, setNachname] = useState(identity?.nachname ?? '')
  const [geburtsdatum, setGeburtsdatum] = useState(identity?.geburtsdatum ?? '')
  const [selectedCaseId, setSelectedCaseId] = useState(existingPatients[0]?.caseId ?? '')

  const selected = useMemo(
    () => existingPatients.find((p) => p.caseId === selectedCaseId),
    [existingPatients, selectedCaseId],
  )

  const handleConfirm = () => {
    if (mode === 'existing') {
      if (selected) onConfirmExisting(selected)
      return
    }
    onConfirmCreate({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      geburtsdatum,
    })
  }

  const createDisabled = mode === 'create' && !vorname.trim() && !nachname.trim()
  const existingDisabled = mode === 'existing' && !selected

  return (
    <div className="doc-import-identity">
      <p className="doc-import-review__heading">{t('documentImportIdentityHeading')}</p>

      {identity ? (
        <div className="doc-import-notice doc-import-notice--info">
          {t('documentImportIdentityDetected')}
          {identity.evidence.length > 0 && (
            <span className="doc-import-identity__evidence"> {identity.evidence.join(' · ')}</span>
          )}
        </div>
      ) : (
        <div className="doc-import-notice doc-import-notice--warning">
          {t('documentImportIdentityNotFound')}
        </div>
      )}

      {hasExisting && (
        <div className="doc-import-identity__modes" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            className={`doc-import-identity__mode${mode === 'create' ? ' is-active' : ''}`}
            onClick={() => setMode('create')}
          >
            <UserPlus aria-hidden strokeWidth={1.75} />
            {t('documentImportIdentityCreateNew')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'existing'}
            className={`doc-import-identity__mode${mode === 'existing' ? ' is-active' : ''}`}
            onClick={() => setMode('existing')}
          >
            <Users aria-hidden strokeWidth={1.75} />
            {t('documentImportIdentitySelectExisting')}
          </button>
        </div>
      )}

      {mode === 'create' ? (
        <div className="doc-import-identity__form">
          <label className="doc-import-field">
            <span className="doc-import-field__label">{t('patientFirstNameLabel')}</span>
            <input
              className="doc-import-input"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              autoFocus
            />
          </label>
          <label className="doc-import-field">
            <span className="doc-import-field__label">{t('patientLastNameLabel')}</span>
            <input
              className="doc-import-input"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
            />
          </label>
          <label className="doc-import-field">
            <span className="doc-import-field__label">{t('patientFieldGeburtsdatum')}</span>
            <input
              type="date"
              className="doc-import-input"
              value={geburtsdatum}
              onChange={(e) => setGeburtsdatum(e.target.value)}
            />
          </label>
          {identity?.geburtsdatumRaw && !identity.geburtsdatum && (
            <p className="doc-import-row__location">
              {t('documentImportIdentityDobRaw')}: {identity.geburtsdatumRaw}
            </p>
          )}
        </div>
      ) : (
        <label className="doc-import-field">
          <span className="doc-import-field__label">{t('documentImportIdentitySelectExisting')}</span>
          <select
            className="doc-import-select"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
          >
            {existingPatients.map((p) => (
              <option key={p.caseId} value={p.caseId}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="doc-import-identity__actions">
        <button
          type="button"
          className="doc-import-btn doc-import-btn--primary"
          onClick={handleConfirm}
          disabled={createDisabled || existingDisabled}
        >
          {mode === 'existing'
            ? t('documentImportIdentityAttach')
            : t('documentImportIdentityCreateConfirm')}
        </button>
      </div>
      <p className="doc-import-review__provenance">{t('documentImportIdentityHint')}</p>
    </div>
  )
}
