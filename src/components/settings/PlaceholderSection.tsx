import { type FormEvent, useEffect, useRef, useState } from 'react'
import { languageOptions } from '../../data/languages'
import {
  getIsdmProfileLabel,
  getLocalClinicalStandardLabel,
} from '../../data/isdmLabels'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { getSupabase } from '../../lib/supabase'
import { useAccountProfile } from '../../hooks/useAccountDisplayName'
import type { AssessmentStandard } from '../../types/isdm'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import { PRESCRIBING_COUNTRIES, usePrescribingCountry } from '../../hooks/usePrescribingCountry'
import type { PrescribingCountryCode } from '../../types/knowledgeBase'
import { CountryCombobox } from './CountryCombobox'
import { SettingsField } from './SettingsField'

/** German-speaking + UK markets pinned to the top of the country list. */
const PRESCRIBING_PRIORITY_CODES = ['DE', 'AT', 'CH', 'LI', 'UK'] as const
import { SettingsOptionGroup } from './SettingsOptionGroup'

const ACCOUNT_NAME_PLACEHOLDER = 'Dr. —'

// Common academic / honorific prefixes to skip when deriving a given name —
// mirrors the Workspace Launcher so `first_name` metadata stays consistent.
const NAME_TITLES = new Set([
  'dr',
  'dr.',
  'prof',
  'prof.',
  'med',
  'med.',
  'dipl',
  'dipl.',
  'mag',
  'mag.',
  'mr',
  'mr.',
  'mrs',
  'mrs.',
  'ms',
  'ms.',
  'herr',
  'frau',
])

/** First usable given-name token from a full name, skipping honorifics. */
function firstNameFromFull(full: string): string | null {
  const trimmed = full.trim()
  if (!trimmed) return null
  const firstReal = trimmed
    .split(/\s+/)
    .find((token) => !NAME_TITLES.has(token.toLowerCase()))
  return firstReal ?? null
}

function metadataString(
  metadata: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const ACCOUNT_INPUT_CLASS =
  'w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink'

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
        <CountryCombobox
          value={defaultPrescribingCountry}
          onChange={(code) => setDefaultPrescribingCountry(code as PrescribingCountryCode)}
          codes={PRESCRIBING_COUNTRIES}
          language={language}
          ariaLabel={t('settingsPrescribingCountryLabel')}
          placeholder={t('countrySearchPlaceholder')}
          noResultsLabel={t('countrySearchNoResults')}
          priorityCodes={PRESCRIBING_PRIORITY_CODES}
          id="settings-prescribing-country"
        />
      </SettingsField>
    </div>
  )
}

export function AccountSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { profile, saveProfile } = useAccountProfile()

  const authMetadata = user?.user_metadata as Record<string, unknown> | undefined
  const metaName = metadataString(authMetadata, 'full_name', 'name', 'display_name')
  const metaSpecialty = metadataString(authMetadata, 'specialty')

  const storedName =
    profile.name && profile.name !== ACCOUNT_NAME_PLACEHOLDER ? profile.name : ''
  const initialName = storedName || metaName
  const initialSpecialty = profile.specialty ?? metaSpecialty
  const email = user?.email ?? profile.email ?? ''

  const [name, setName] = useState(initialName)
  const [specialty, setSpecialty] = useState(initialSpecialty)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  // Don't clobber in-progress edits when auth/profile data arrives asynchronously.
  const edited = useRef(false)

  useEffect(() => {
    if (edited.current) return
    setName(initialName)
    setSpecialty(initialSpecialty)
  }, [initialName, initialSpecialty])

  const handleChange = (setter: (value: string) => void) => (value: string) => {
    edited.current = true
    setSaved(false)
    setter(value)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedSpecialty = specialty.trim()

    if (!trimmedName) {
      setValidationError(t('settingsAccountNameRequired'))
      setSaved(false)
      return
    }

    setValidationError(null)
    setSyncWarning(null)
    setSaving(true)

    // 1. Local store first — greeting/dashboard update immediately and this
    //    must not depend on the network call below succeeding.
    saveProfile({
      name: trimmedName,
      email: email || undefined,
      specialty: trimmedSpecialty || undefined,
    })
    edited.current = false

    // 2. Best-effort durable mirror to Supabase auth metadata.
    const supabase = getSupabase()
    if (supabase && user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            first_name: firstNameFromFull(trimmedName) ?? trimmedName,
            specialty: trimmedSpecialty || null,
          },
        })
        if (error) setSyncWarning(t('settingsAccountSyncWarning'))
      } catch {
        setSyncWarning(t('settingsAccountSyncWarning'))
      }
    }

    setSaving(false)
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SettingsField
        label={t('settingsAccountNameLabel')}
        description={t('settingsAccountNameDescription')}
      >
        <input
          type="text"
          value={name}
          onChange={(event) => handleChange(setName)(event.target.value)}
          placeholder={t('settingsAccountNamePlaceholder')}
          aria-label={t('settingsAccountNameLabel')}
          aria-invalid={validationError ? true : undefined}
          autoComplete="name"
          className={ACCOUNT_INPUT_CLASS}
        />
        {validationError ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]" role="alert">
            {validationError}
          </p>
        ) : null}
      </SettingsField>

      <SettingsField label={t('settingsAccountEmailLabel')}>
        <PlaceholderInput value={email || 'arzt@klinik.example'} />
      </SettingsField>

      <SettingsField label={t('settingsAccountSpecialtyLabel')}>
        <input
          type="text"
          value={specialty}
          onChange={(event) => handleChange(setSpecialty)(event.target.value)}
          placeholder={t('settingsAccountSpecialtyPlaceholder')}
          aria-label={t('settingsAccountSpecialtyLabel')}
          className={ACCOUNT_INPUT_CLASS}
        />
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

      <SettingsField label="">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm border-2 border-ink bg-ink px-4 py-2 text-sm text-surface transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t('settingsAccountSaving') : t('settingsAccountSave')}
          </button>
          {saved && !syncWarning ? (
            <span className="text-xs text-[var(--status-success)]" role="status">
              {t('settingsAccountSaved')}
            </span>
          ) : null}
          {syncWarning ? (
            <span className="text-xs text-muted" role="status">
              {syncWarning}
            </span>
          ) : null}
        </div>
      </SettingsField>
    </form>
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
