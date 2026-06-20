import { languageOptions } from '../../data/languages'
import {
  getIsdmProfileLabel,
  getLocalClinicalStandardLabel,
} from '../../data/isdmLabels'
import { useTranslation } from '../../context/TranslationContext'
import type { AssessmentStandard } from '../../types/isdm'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import {
  PRESCRIBING_COUNTRIES,
  PRESCRIBING_COUNTRY_LABELS,
  usePrescribingCountry,
} from '../../hooks/usePrescribingCountry'
import { SettingsField } from './SettingsField'
import { SettingsOptionGroup } from './SettingsOptionGroup'

function PlaceholderInput({ value }: { value: string }) {
  return (
    <input
      type="text"
      disabled
      value={value}
      className="w-full rounded-sm border border-border bg-surface-hover px-3 py-2 text-sm text-muted"
    />
  )
}

interface LanguageSectionProps {
  language: UiLanguage
  englishVariant: EnglishVariant
  onSelectLanguage: (language: UiLanguage) => void
  onSelectEnglishVariant: (variant: EnglishVariant) => void
  assessmentStandard: AssessmentStandard
  onSelectAssessmentStandard: (standard: AssessmentStandard) => void
}

export function LanguageSection({
  language,
  englishVariant,
  onSelectLanguage,
  onSelectEnglishVariant,
  assessmentStandard,
  onSelectAssessmentStandard,
}: LanguageSectionProps) {
  const { t } = useTranslation()
  const { defaultPrescribingCountry, setDefaultPrescribingCountry } = usePrescribingCountry()

  return (
    <div>
      <SettingsField label={t('settingsUiLanguageLabel')}>
        <SettingsOptionGroup
          value={language}
          options={languageOptions}
          onChange={onSelectLanguage}
        />
      </SettingsField>

      {language === 'en' ? (
        <SettingsField label={t('settingsEnglishVariantLabel')}>
          <SettingsOptionGroup
            value={englishVariant}
            options={[
              { value: 'uk', label: 'UK — Mental State Examination' },
              { value: 'us', label: 'US — Mental Status Examination' },
            ]}
            onChange={onSelectEnglishVariant}
          />
        </SettingsField>
      ) : null}

      <SettingsField label={t('settingsAssessmentStandard')}>
        <SettingsOptionGroup
          value={assessmentStandard}
          options={[
            {
              value: 'local_clinical' as const,
              label: getLocalClinicalStandardLabel(language, englishVariant),
            },
            {
              value: 'international_structured_diagnostic_mapping' as const,
              label: getIsdmProfileLabel(language, englishVariant),
            },
          ]}
          onChange={onSelectAssessmentStandard}
        />
      </SettingsField>

      <SettingsField label={t('settingsPrescribingCountryLabel')}>
        <select
          value={defaultPrescribingCountry}
          onChange={(event) =>
            setDefaultPrescribingCountry(event.target.value as typeof defaultPrescribingCountry)
          }
          className="w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink"
        >
          {PRESCRIBING_COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country} · {PRESCRIBING_COUNTRY_LABELS[country]}
            </option>
          ))}
        </select>
      </SettingsField>
    </div>
  )
}

export function AccountSection() {
  const { t } = useTranslation()

  return (
    <div>
      <SettingsField label={t('settingsAccountNameLabel')}>
        <PlaceholderInput value="Dr. —" />
      </SettingsField>

      <SettingsField label={t('settingsAccountEmailLabel')}>
        <PlaceholderInput value="arzt@klinik.example" />
      </SettingsField>

      <SettingsField label={t('settingsAccountSpecialtyLabel')}>
        <PlaceholderInput value="Psychiatrie und Psychotherapie" />
      </SettingsField>

      <SettingsField label={t('settingsAccountPasswordLabel')}>
        <button
          type="button"
          disabled
          className="rounded-sm border border-border bg-surface-hover px-3 py-2 text-xs text-muted"
        >
          {t('settingsAccountPasswordChange')}
        </button>
      </SettingsField>
    </div>
  )
}

export function AboutSection() {
  const { t } = useTranslation()

  return (
    <div>
      <SettingsField label={t('settingsAboutVersionLabel')}>
        <p className="text-sm text-ink">Psychiatry.ink</p>
      </SettingsField>

      <SettingsField label={t('settingsAboutPrivacyLabel')}>
        <p className="text-sm text-muted">{t('settingsAboutPrivacyBody')}</p>
      </SettingsField>

      <SettingsField label={t('settingsAboutSupportLabel')}>
        <p className="text-sm text-muted">{t('settingsAboutSupportBody')}</p>
      </SettingsField>
    </div>
  )
}
