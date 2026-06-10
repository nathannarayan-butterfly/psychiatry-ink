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

  const selectedMethodHint = (() => {
    if (isLabImportMethodFunctional(labImport.defaultImportMethod)) {
      return t('labImportMethodPasteHint')
    }
    if (labImport.defaultImportMethod === 'hospital_feed') {
      return t('labImportMethodHospitalRequiresSetup')
    }
    return t('labImportMethodComingSoon')
  })()

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{t('settingsLab')}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">{t('labImportSectionIntro')}</p>

      <SettingsField
        label={t('labImportDefaultMethodLabel')}
        description={t('labImportDefaultMethodDescription')}
      >
        <SettingsOptionGroup
          value={labImport.defaultImportMethod}
          options={importMethodOptions}
          onChange={labImport.setDefaultImportMethod}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted">{selectedMethodHint}</p>
      </SettingsField>

      <SettingsField label={t('labImportLaborPageLinkTitle')}>
        <p className="text-xs leading-relaxed text-muted">{t('labImportLaborPageLink')}</p>
      </SettingsField>

      <SettingsField label={t('labImportZeroKnowledgeTitle')}>
        <p className="text-xs leading-relaxed text-muted">{t('labImportZeroKnowledgeNote')}</p>
      </SettingsField>

      <SettingsField
        label={t('labImportAutoMapLoincLabel')}
        description={t('labImportAutoMapLoincDescription')}
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={labImport.autoMapLoinc}
            onChange={(event) => labImport.setAutoMapLoinc(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border"
          />
          {t('labImportPlaceholderToggle')}
        </label>
      </SettingsField>

      <SettingsField
        label={t('labImportMedCorrelationLabel')}
        description={t('labImportMedCorrelationDescription')}
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={labImport.showMedLabCorrelationHints}
            onChange={(event) => labImport.setShowMedLabCorrelationHints(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border"
          />
          {t('labImportPlaceholderToggle')}
        </label>
      </SettingsField>
    </div>
  )
}
