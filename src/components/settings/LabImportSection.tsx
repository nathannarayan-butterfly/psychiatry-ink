import { useTranslation } from '../../context/TranslationContext'
import { useLabImportSettings } from '../../hooks/useLabImportSettings'
import {
  isLabImportMethodFunctional,
  LAB_IMPORT_METHOD_IDS,
  type LabImportMethod,
} from '../../types/labImportSettings'
import { SettingsField } from './SettingsField'
import { SettingsOptionGroup } from './SettingsOptionGroup'

const methodLabelKeys: Record<
  LabImportMethod,
  | 'labImportMethodPaste'
  | 'labImportMethodCsv'
  | 'labImportMethodFhir'
  | 'labImportMethodHl7'
  | 'labImportMethodHospitalFeed'
> = {
  paste: 'labImportMethodPaste',
  csv: 'labImportMethodCsv',
  fhir: 'labImportMethodFhir',
  hl7: 'labImportMethodHl7',
  hospital_feed: 'labImportMethodHospitalFeed',
}

export function LabImportSection() {
  const { t } = useTranslation()
  const labImport = useLabImportSettings()

  const importMethodOptions = LAB_IMPORT_METHOD_IDS.map((method) => ({
    value: method,
    label: t(methodLabelKeys[method]),
  }))

  const selectedMethodHint =
    !isLabImportMethodFunctional(labImport.defaultImportMethod)
      ? labImport.defaultImportMethod === 'hospital_feed'
        ? t('labImportMethodHospitalRequiresSetup')
        : t('labImportMethodComingSoon')
      : null

  return (
    <div>
      <SettingsField label={t('labImportDefaultMethodLabel')}>
        <SettingsOptionGroup
          value={labImport.defaultImportMethod}
          options={importMethodOptions}
          onChange={labImport.setDefaultImportMethod}
        />
        {selectedMethodHint ? (
          <p className="mt-2 text-xs text-muted">{selectedMethodHint}</p>
        ) : null}
      </SettingsField>

      <SettingsField label={t('labImportAutoMapLoincLabel')}>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={labImport.autoMapLoinc}
            onChange={(event) => labImport.setAutoMapLoinc(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border"
          />
          {t('labImportAutoMapLoincToggle')}
        </label>
      </SettingsField>

      <SettingsField label={t('labImportMedCorrelationLabel')}>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={labImport.showMedLabCorrelationHints}
            onChange={(event) => labImport.setShowMedLabCorrelationHints(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border"
          />
          {t('labImportMedCorrelationToggle')}
        </label>
      </SettingsField>
    </div>
  )
}
