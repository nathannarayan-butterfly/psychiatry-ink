import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { languageOptions } from '../../data/languages'
import { localizedPath, type PublicPageKey } from '../../public-site/publicRoutes'
import { APP_VERSION, LOADED_BUILD_ID } from '../../utils/buildVersion'
import type { UiTranslationKey } from '../../data/uiTranslations'
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
import { PasswordInput } from '../auth/PasswordInput'
import {
  ACCOUNT_PASSWORD_MIN_LENGTH,
  changeAccountPassword,
} from '../../utils/accountPassword'
import { mapSupabaseAuthError } from '../../lib/supabase'

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
  const { user, signIn } = useAuth()
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

  // --- Change-password sub-form (account login password, NOT the encryption
  //     passphrase — the two are intentionally independent). ---
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setPwError(null)
  }

  const handleTogglePasswordForm = () => {
    setShowPasswordForm((open) => {
      const next = !open
      if (!next) resetPasswordForm()
      else setPwSuccess(false)
      return next
    })
  }

  const handlePasswordChange = async () => {
    const supabase = getSupabase()
    if (!supabase || !user?.email) {
      setPwError(t('settingsAccountPasswordUpdateFailed'))
      return
    }

    setPwError(null)
    setPwSuccess(false)
    setPwSaving(true)

    const result = await changeAccountPassword({
      email: user.email,
      currentPassword,
      newPassword,
      confirmPassword: confirmNewPassword,
      reauthenticate: async (email, password) => {
        const { error } = await signIn(email, password)
        return { error }
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password })
        return { error: mapSupabaseAuthError(error?.message) }
      },
    })

    setPwSaving(false)

    if (result.ok) {
      resetPasswordForm()
      setShowPasswordForm(false)
      setPwSuccess(true)
      return
    }

    if (result.kind === 'validation') {
      if (result.error === 'currentRequired') {
        setPwError(t('settingsAccountPasswordCurrentRequired'))
      } else if (result.error === 'tooShort') {
        setPwError(t('signupWizardPasswordTooShort'))
      } else {
        setPwError(t('signupWizardPasswordMismatch'))
      }
      return
    }

    if (result.kind === 'reauth') {
      setPwError(t('settingsAccountPasswordCurrentIncorrect'))
      return
    }

    setPwError(result.message || t('settingsAccountPasswordUpdateFailed'))
  }

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
          onClick={handleTogglePasswordForm}
          aria-expanded={showPasswordForm}
          className="rounded-sm border-2 border-border bg-surface px-3 py-2 text-xs text-ink transition-colors hover:border-ink"
        >
          {showPasswordForm
            ? t('settingsAccountPasswordCancel')
            : t('settingsAccountPasswordChange')}
        </button>
        {pwSuccess && !showPasswordForm ? (
          <p className="mt-2 text-xs text-[var(--status-success)]" role="status">
            {t('settingsAccountPasswordUpdated')}
          </p>
        ) : null}

        {showPasswordForm ? (
          <div
            className="auth-form mt-3 flex flex-col gap-3 rounded-sm border-2 border-border bg-surface-hover p-3"
            onKeyDown={(e) => {
              // These inputs live inside the profile <form>; stop Enter from
              // submitting the profile save and run the password flow instead.
              if (e.key === 'Enter') {
                e.preventDefault()
                if (!pwSaving) void handlePasswordChange()
              }
            }}
          >
            <label className="flex flex-col gap-1 text-xs text-muted">
              <span>{t('settingsAccountPasswordCurrentLabel')}</span>
              <PasswordInput
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={pwSaving}
                className={ACCOUNT_INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              <span>{t('settingsAccountPasswordNewLabel')}</span>
              <PasswordInput
                autoComplete="new-password"
                minLength={ACCOUNT_PASSWORD_MIN_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={pwSaving}
                className={ACCOUNT_INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              <span>{t('settingsAccountPasswordConfirmLabel')}</span>
              <PasswordInput
                autoComplete="new-password"
                minLength={ACCOUNT_PASSWORD_MIN_LENGTH}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={pwSaving}
                className={ACCOUNT_INPUT_CLASS}
              />
            </label>
            <p className="text-xs text-muted">
              {t('settingsAccountPasswordHint').replace(
                '{min}',
                String(ACCOUNT_PASSWORD_MIN_LENGTH),
              )}
            </p>
            {pwError ? (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {pwError}
              </p>
            ) : null}
            <div>
              <button
                type="button"
                onClick={() => void handlePasswordChange()}
                disabled={pwSaving}
                className="rounded-sm border-2 border-ink bg-ink px-4 py-2 text-sm text-surface transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pwSaving
                  ? t('settingsAccountPasswordSaving')
                  : t('settingsAccountPasswordSubmit')}
              </button>
            </div>
          </div>
        ) : null}
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

// Canonical general/support inbox. Mirrors `CONTACT.generalEmail` in
// `public-site/legalContent.ts` and the contact API's `CONTACT_TO` default
// (the form's "Support" category routes here). Duplicated as a literal so the
// settings bundle doesn't pull in the large legal-content module. There is no
// separate `help@` alias; `hello@` is the established support address.
const SUPPORT_EMAIL = 'hello@psychiatry.ink'

const ABOUT_LINK_CLASS =
  'text-[var(--color-accent)] underline underline-offset-2 transition-colors hover:text-[var(--color-accent-hover)] focus-visible:underline focus-visible:outline-none'

/** Legal/trust documents linked from the About section, in display order. */
const ABOUT_LEGAL_LINKS: ReadonlyArray<{ key: PublicPageKey; labelKey: UiTranslationKey }> = [
  { key: 'privacy', labelKey: 'settingsAboutLinkPrivacy' },
  { key: 'terms', labelKey: 'settingsAboutLinkTerms' },
  { key: 'impressum', labelKey: 'settingsAboutLinkImprint' },
  { key: 'cookies', labelKey: 'settingsAboutLinkCookies' },
  { key: 'dpa', labelKey: 'settingsAboutLinkDpa' },
  { key: 'subprocessors', labelKey: 'settingsAboutLinkSubprocessors' },
  { key: 'securityOverview', labelKey: 'settingsAboutLinkSecurityOverview' },
]

function AboutGroupHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wide text-muted first:mt-0">
      {children}
    </p>
  )
}

/**
 * Opens public marketing/legal/contact pages in a new tab. Those routes are
 * served by the same SPA bundle, so an in-tab navigation would unload the
 * authenticated app — `target="_blank"` keeps the user's session intact.
 */
function AboutExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={ABOUT_LINK_CLASS}>
      {children}
    </a>
  )
}

export function AboutSection() {
  const { t, language } = useTranslation()

  const isDevBuild = LOADED_BUILD_ID === 'dev' || LOADED_BUILD_ID === 'test'
  // Deep-link the contact form with the Support category preselected.
  const contactHref = `${localizedPath('contact', language)}?category=support`

  return (
    <div>
      <AboutGroupHeading>{t('settingsAboutGroupApplication')}</AboutGroupHeading>

      <SettingsField label={t('settingsAboutVersionLabel')}>
        <p className="text-sm text-ink">
          Psychiatry.ink <span className="text-muted">v{APP_VERSION}</span>
        </p>
      </SettingsField>

      <SettingsField label={t('settingsAboutBuildLabel')}>
        <p className="text-sm text-muted">
          {isDevBuild ? (
            t('settingsAboutBuildDev')
          ) : (
            <span className="font-mono">{LOADED_BUILD_ID}</span>
          )}
        </p>
      </SettingsField>

      <AboutGroupHeading>{t('settingsAboutGroupCompany')}</AboutGroupHeading>

      <SettingsField label={t('settingsAboutCompanyLabel')}>
        <div className="text-sm text-ink">
          <p className="font-medium">Psychiatry Ink Ltd</p>
          <p className="mt-1 text-muted">{t('settingsAboutCompanyRegistration')}</p>
          <p className="text-muted">{t('settingsAboutCompanyAddress')}</p>
          <p className="mt-2">
            <AboutExternalLink href={localizedPath('impressum', language)}>
              {t('settingsAboutLinkImprint')}
            </AboutExternalLink>
          </p>
        </div>
      </SettingsField>

      <AboutGroupHeading>{t('settingsAboutGroupPrivacy')}</AboutGroupHeading>

      <SettingsField label={t('settingsAboutPrivacyLabel')}>
        <div className="text-sm text-muted">
          <p className="text-ink">{t('settingsAboutPrivacyBody')}</p>
          <p className="mt-1">{t('settingsAboutPrivacyExpanded')}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <AboutExternalLink href={localizedPath('privacy', language)}>
              {t('settingsAboutLinkPrivacy')}
            </AboutExternalLink>
            <AboutExternalLink href={localizedPath('security', language)}>
              {t('settingsAboutLinkSecurity')}
            </AboutExternalLink>
          </p>
        </div>
      </SettingsField>

      <AboutGroupHeading>{t('settingsAboutGroupSupport')}</AboutGroupHeading>

      <SettingsField label={t('settingsAboutSupportLabel')}>
        <div className="text-sm text-muted">
          <p>{t('settingsAboutSupportBody')}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <AboutExternalLink href={contactHref}>
              {t('settingsAboutContactFormLink')}
            </AboutExternalLink>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={ABOUT_LINK_CLASS}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </SettingsField>

      <SettingsField label={t('settingsAboutDataResidencyLabel')}>
        <p className="text-sm text-muted">{t('settingsAboutDataResidencyBody')}</p>
      </SettingsField>

      <AboutGroupHeading>{t('settingsAboutGroupLegal')}</AboutGroupHeading>

      <SettingsField label={t('settingsAboutLegalLabel')}>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {ABOUT_LEGAL_LINKS.map(({ key, labelKey }) => (
            <AboutExternalLink key={key} href={localizedPath(key, language)}>
              {t(labelKey)}
            </AboutExternalLink>
          ))}
        </div>
      </SettingsField>
    </div>
  )
}
