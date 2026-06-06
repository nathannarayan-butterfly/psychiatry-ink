import { languageOptions } from '../../data/languages'
import type { UiLanguage } from '../../types/settings'
import { SettingsField } from './SettingsField'
import { SettingsOptionGroup } from './SettingsOptionGroup'

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
  onSelectLanguage: (language: UiLanguage) => void
}

export function LanguageSection({ language, onSelectLanguage }: LanguageSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Sprache</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Sprache der Benutzeroberfläche und Dokumentation.</p>

      <SettingsField label="Oberflächensprache">
        <SettingsOptionGroup
          value={language}
          options={languageOptions}
          onChange={onSelectLanguage}
        />
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
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Dokumentation</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Standardwerte für neue Dokumente.</p>

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
