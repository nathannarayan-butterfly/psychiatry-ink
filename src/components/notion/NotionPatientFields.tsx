import { Cloud, Download, HardDrive, Upload } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { EncryptionDisclaimer } from '../EncryptionDisclaimer'
import { useTranslation } from '../../context/TranslationContext'
import type { usePatientMetadata } from '../../hooks/usePatientMetadata'

type PatientMetadataState = ReturnType<typeof usePatientMetadata>

interface ClinicalAgeState {
  age: string
  setAge: (age: string) => void
  ready: boolean
}

interface NotionPatientFieldsProps {
  patient: PatientMetadataState
  clinicalAge: ClinicalAgeState
  disabled?: boolean
  onOpenPrivacySettings?: () => void
}

export function NotionPatientFields({
  patient,
  clinicalAge,
  disabled = false,
  onOpenPrivacySettings,
}: NotionPatientFieldsProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!patient.enabled || !patient.ready) return null

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      await patient.importVault(file)
    } catch {
      // import errors surface via hook error state in future; silent for MVP
    }
  }

  return (
    <div className="notion-patient-fields">
      <EncryptionDisclaimer
        section="patient"
        bodyVariant="paragraph"
        footer={
          onOpenPrivacySettings ? (
            <button
              type="button"
              className="notion-patient-fields__privacy-link"
              onClick={onOpenPrivacySettings}
            >
              {t('patientPrivacySettingsLink')}
            </button>
          ) : undefined
        }
      />

      <div className="notion-patient-fields__groups">
        <div className="notion-patient-fields__group">
          <p className="notion-patient-fields__group-label">
            <HardDrive className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            {t('patientFieldLocalOnly')}
          </p>
          <div className="notion-patient-fields__row">
            <label className="notion-patient-fields__field">
              <span className="notion-patient-fields__label">{t('patientNameLabel')}</span>
              <input
                type="text"
                className="notion-patient-fields__input"
                value={patient.name}
                onChange={(event) => patient.setName(event.target.value)}
                placeholder={t('patientNamePlaceholder')}
                disabled={disabled}
                autoComplete="off"
                aria-label={t('patientNameLabel')}
              />
            </label>
            <label className="notion-patient-fields__field notion-patient-fields__field--dob">
              <span className="notion-patient-fields__label">{t('patientFieldGeburtsdatum')}</span>
              <input
                type="date"
                className="notion-patient-fields__input notion-patient-fields__input--date"
                value={patient.geburtsdatum}
                onChange={(event) => patient.setGeburtsdatum(event.target.value)}
                disabled={disabled}
                autoComplete="off"
                aria-label={t('patientFieldGeburtsdatum')}
              />
            </label>
          </div>
        </div>

        <div className="notion-patient-fields__group">
          <p className="notion-patient-fields__group-label">
            <Cloud className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            {t('patientFieldAgeSynced')}
          </p>
          <div className="notion-patient-fields__row">
            <label className="notion-patient-fields__field notion-patient-fields__field--age">
              <span className="notion-patient-fields__label">{t('patientAgeLabel')}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="notion-patient-fields__input"
                value={clinicalAge.age}
                onChange={(event) => clinicalAge.setAge(event.target.value)}
                placeholder={t('patientAgePlaceholder')}
                disabled={disabled || !clinicalAge.ready}
                autoComplete="off"
                aria-label={t('patientAgeLabel')}
              />
            </label>
            <div className="notion-patient-fields__vault-actions">
              <button
                type="button"
                className="notion-patient-fields__vault-btn"
                onClick={() => void patient.exportVault()}
                disabled={disabled}
                title={t('patientVaultExport')}
                aria-label={t('patientVaultExport')}
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="notion-patient-fields__vault-btn"
                onClick={handleImportClick}
                disabled={disabled}
                title={t('patientVaultImport')}
                aria-label={t('patientVaultImport')}
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => void handleImportFile(event)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
