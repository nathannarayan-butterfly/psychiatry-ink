import { useState } from 'react'
import { languageOptions } from '../../data/languages'
import {
  getIsdmProfileLabel,
  getLocalClinicalStandardLabel,
} from '../../data/isdmLabels'
import { useTranslation } from '../../context/TranslationContext'
import type { AssessmentStandard } from '../../types/isdm'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import { readPomodoroDuration, savePomodoroDuration } from '../../hooks/usePomodoroTimer'
import {
  PRESCRIBING_COUNTRIES,
  PRESCRIBING_COUNTRY_LABELS,
  usePrescribingCountry,
} from '../../hooks/usePrescribingCountry'
import { SettingsField } from './SettingsField'
import { SettingsOptionGroup } from './SettingsOptionGroup'

function PlaceholderOption({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-sm border-2 border-border bg-surface-hover px-3 py-1.5 text-xs text-muted"
    >
      {label}
    </button>
  )
}

function PlaceholderInput({ value }: { value: string }) {
  return (
    <input
      type="text"
      disabled
      value={value}
      className="w-full rounded-sm border-2 border-border bg-surface-hover px-3 py-2 text-sm text-muted"
    />
  )
}

function PlaceholderSelect({ value, options }: { value: string; options: string[] }) {
  return (
    <select
      disabled
      value={value}
      className="w-full rounded-sm border-2 border-border bg-surface-hover px-3 py-2 text-sm text-muted"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
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
      <h2 className="text-lg font-semibold text-ink">{t('settingsLanguage')}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">
        {language === 'de'
          ? 'Sprache der Benutzeroberfläche und Dokumentation.'
          : t('settingsAssessmentStandardDescription')}
      </p>

      <SettingsField label="Oberflächensprache">
        <SettingsOptionGroup
          value={language}
          options={languageOptions}
          onChange={onSelectLanguage}
        />
      </SettingsField>

      {language === 'en' ? (
        <SettingsField
          label="Englische Variante"
          description="Unterschiedliche Bezeichnungen für psychopathologische Befunde (MSE)."
        >
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

      <SettingsField
        label={t('settingsAssessmentStandard')}
        description={t('settingsAssessmentStandardDescription')}
      >
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
        <div className="mt-2 flex flex-wrap gap-2">
          <PlaceholderOption
            label={`DSM-5-TR / US Diagnostic Support (${t('assessmentStandardComingSoon')})`}
          />
          <PlaceholderOption label={`Research-Grade (${t('assessmentStandardComingSoon')})`} />
        </div>
      </SettingsField>

      <SettingsField
        label="Standard-Verordnungsland"
        description="Wird für verfügbare Präparate in Wissensdatenbank und Medikation vorausgewählt."
      >
        <select
          value={defaultPrescribingCountry}
          onChange={(event) => setDefaultPrescribingCountry(event.target.value as typeof defaultPrescribingCountry)}
          className="w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink"
        >
          {PRESCRIBING_COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country} · {PRESCRIBING_COUNTRY_LABELS[country]}
            </option>
          ))}
        </select>
      </SettingsField>

      <SettingsField label="Dokumentationssprache" description="Sprache für generierte Texte.">
        <PlaceholderSelect
          value={languageOptions.find((option) => option.value === language)?.label ?? 'Deutsch'}
          options={languageOptions.map((option) => option.label)}
        />
      </SettingsField>
    </div>
  )
}

export function DocumentationSection() {
  const [pomodoroDuration, setPomodoroDuration] = useState(readPomodoroDuration)

  const handleDurationChange = (value: string) => {
    const n = parseInt(value, 10)
    if (!isNaN(n) && n >= 1 && n <= 120) {
      savePomodoroDuration(n)
      setPomodoroDuration(n)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Dokumentation</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Standardwerte für neue Dokumente.</p>

      <SettingsField
        label="Pomodoro-Dauer (Minuten)"
        description="Länge eines Pomodoro-Intervalls in Minuten. Standard: 25 Minuten. Wirkt ab dem nächsten Start."
      >
        <input
          type="number"
          min={1}
          max={120}
          value={pomodoroDuration}
          onChange={(event) => handleDurationChange(event.target.value)}
          className="w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink"
        />
      </SettingsField>

      <SettingsField label="Standard-Dokumenttyp">
        <PlaceholderSelect
          value="Aufnahme"
          options={['Aufnahme', 'Verlauf', 'Psycho-pathologie', 'Therapie und Verlauf']}
        />
      </SettingsField>

      <SettingsField label="Unterschrift" description="Standard-Unterschrift in Briefen.">
        <PlaceholderInput value="Dr. med. — Psychiatrie" />
      </SettingsField>

      <SettingsField label="Klinik / Praxis">
        <PlaceholderInput value="Psychiatrische Klinik" />
      </SettingsField>
    </div>
  )
}

interface AiSectionProps {
  aiAutoMode: boolean
  onToggleAiAuto: () => void
}

export function AiSection({ aiAutoMode, onToggleAiAuto }: AiSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">KI-Einstellungen</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Verhalten der KI-gestützten Textgenerierung.</p>

      <SettingsField label="KI Auto-Modus" description="Automatische Vorschläge während des Schreibens.">
        <SettingsOptionGroup
          value={aiAutoMode ? 'on' : 'off'}
          options={[
            { value: 'off', label: 'Aus' },
            { value: 'on', label: 'Ein' },
          ]}
          onChange={(value) => {
            if ((value === 'on') !== aiAutoMode) onToggleAiAuto()
          }}
        />
      </SettingsField>

      <SettingsField label="Schreibstil">
        <PlaceholderSelect
          value="Klinisch-neutral"
          options={['Klinisch-neutral', 'Ausführlich', 'Kompakt']}
        />
      </SettingsField>

      <SettingsField label="Modell">
        <PlaceholderSelect value="Standard" options={['Standard', 'Erweitert']} />
      </SettingsField>
    </div>
  )
}

export function AccountSection() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Konto</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Ihre Kontoinformationen und Zugangsdaten.</p>

      <SettingsField label="Name">
        <PlaceholderInput value="Dr. —" />
      </SettingsField>

      <SettingsField label="E-Mail">
        <PlaceholderInput value="arzt@klinik.example" />
      </SettingsField>

      <SettingsField label="Fachrichtung">
        <PlaceholderInput value="Psychiatrie und Psychotherapie" />
      </SettingsField>

      <SettingsField label="Passwort">
        <button
          type="button"
          disabled
          className="rounded-sm border-2 border-border bg-surface-hover px-3 py-2 text-xs text-muted"
        >
          Passwort ändern
        </button>
      </SettingsField>
    </div>
  )
}

export function AboutSection() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Über Psychiatry.ink</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Versionsinformationen und rechtliche Hinweise.</p>

      <SettingsField label="Version">
        <p className="text-sm text-ink">Psychiatry.ink</p>
      </SettingsField>

      <SettingsField label="Datenschutz" description="Informationen zur Datenspeicherung und -verarbeitung.">
        <p className="text-xs text-muted">
          Klinische Inhalte werden ausschließlich auf Ihrem Gerät entschlüsselt. Psychiatry.ink hat keinen Zugriff auf Ihre Patientendaten.
        </p>
      </SettingsField>

      <SettingsField label="Support">
        <p className="text-xs text-muted">Kontakt und Hilfe über die Psychiatry.ink-Website.</p>
      </SettingsField>
    </div>
  )
}

export function PrivacySection() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Datenschutz</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Speicherung und Verarbeitung Ihrer Daten.</p>

      <SettingsField
        label="Lokale Speicherung"
        description="Einstellungen werden im Browser gespeichert."
      >
        <p className="text-xs text-muted">Aktiv — Darstellungseinstellungen werden lokal gespeichert.</p>
      </SettingsField>

      <SettingsField label="Dokumentenverlauf">
        <SettingsOptionGroup
          value="session"
          options={[
            { value: 'session', label: 'Nur Sitzung' },
            { value: 'saved', label: 'Gespeichert' },
          ]}
          onChange={() => undefined}
        />
      </SettingsField>

      <SettingsField label="Daten exportieren">
        <button
          type="button"
          disabled
          className="rounded-sm border-2 border-border bg-surface-hover px-3 py-2 text-xs text-muted"
        >
          Export anfordern
        </button>
      </SettingsField>
    </div>
  )
}
