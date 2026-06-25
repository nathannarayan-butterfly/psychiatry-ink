import {
  accentColorPresets,
  borderWeightPresets,
  fontFamilyGroups,
  fontFamilyPresets,
  fontSizePresets,
  lineHeightPresets,
  workspaceScalePresets,
} from '../../data/appearancePresets'
import type { FontFamily, PreferredAccentColor } from '../../types/settings'
import type { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import { loadGoogleFont } from '../../utils/googleFonts'
import { useEffect } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { SettingsField } from './SettingsField'
import { SettingsOptionGroup } from './SettingsOptionGroup'

interface AppearanceSectionProps {
  appearance: ReturnType<typeof useAppearanceSettings>
}

/** i18n keys for each accent colour name + one-line description. */
const accentColorI18n: Record<
  PreferredAccentColor,
  { label: UiTranslationKey; description: UiTranslationKey }
> = {
  terracotta: { label: 'accentTerracottaLabel', description: 'accentTerracottaDesc' },
  blue: { label: 'accentBlueLabel', description: 'accentBlueDesc' },
  green: { label: 'accentGreenLabel', description: 'accentGreenDesc' },
  teal: { label: 'accentTealLabel', description: 'accentTealDesc' },
  indigo: { label: 'accentIndigoLabel', description: 'accentIndigoDesc' },
  burgundy: { label: 'accentBurgundyLabel', description: 'accentBurgundyDesc' },
  amber: { label: 'accentAmberLabel', description: 'accentAmberDesc' },
  slate: { label: 'accentSlateLabel', description: 'accentSlateDesc' },
  plum: { label: 'accentPlumLabel', description: 'accentPlumDesc' },
  navy: { label: 'accentNavyLabel', description: 'accentNavyDesc' },
  forest: { label: 'accentForestLabel', description: 'accentForestDesc' },
  graphite: { label: 'accentGraphiteLabel', description: 'accentGraphiteDesc' },
}

/** i18n keys for each font's one-line description (font name stays as brand). */
const fontFamilyDescriptionI18n: Record<FontFamily, UiTranslationKey> = {
  inter: 'fontInterDesc',
  sourceSans: 'fontSourceSansDesc',
  ibmPlex: 'fontIbmPlexDesc',
  notoSans: 'fontNotoSansDesc',
  publicSans: 'fontPublicSansDesc',
  lato: 'fontLatoDesc',
  atkinson: 'fontAtkinsonDesc',
  literata: 'fontLiterataDesc',
  merriweather: 'fontMerriweatherDesc',
  lora: 'fontLoraDesc',
  caveat: 'fontCaveatDesc',
  dancingScript: 'fontDancingScriptDesc',
}

const fontGroupLabelI18n: Record<string, UiTranslationKey> = {
  'Sans-serif': 'fontGroupSansSerif',
  Serif: 'fontGroupSerif',
  Handschrift: 'fontGroupHandwriting',
}

function AccentColorCard({
  accentKey,
  active,
  onSelect,
}: {
  accentKey: PreferredAccentColor
  active: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const preset = accentColorPresets[accentKey]
  const i18n = accentColorI18n[accentKey]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col gap-2 rounded-md border p-3 text-left transition-all ${
        active
          ? 'border-accent bg-surface shadow-md'
          : 'border-border/60 bg-surface hover:border-border-strong'
      }`}
    >
        <div
          className="relative h-11 w-full overflow-hidden rounded-md border border-border/40 bg-white"
          aria-hidden
        >
          <div
            className="absolute inset-x-2 top-2 h-2.5 rounded-sm border border-black/5"
            style={{
              background: `color-mix(in srgb, ${preset.hex} 18%, white)`,
            }}
          />
          <div
            className="absolute inset-x-2 top-[1.125rem] h-2 rounded-sm border border-black/5"
            style={{
              background: `color-mix(in srgb, ${preset.hex} 12%, white)`,
            }}
          />
          <div className="absolute inset-x-2 top-[1.625rem] bottom-1.5 rounded-sm border border-black/5 bg-white" />
          <div
            className="absolute bottom-2 right-2 h-3 w-3 rounded-full border border-white/60 shadow-sm"
            style={{ background: preset.hex }}
          />
        </div>
      <div>
        <span className="text-xs font-medium text-ink">{t(i18n.label)}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{t(i18n.description)}</span>
      </div>
    </button>
  )
}

function FontFamilyCard({
  fontKey,
  active,
  onSelect,
}: {
  fontKey: keyof typeof fontFamilyPresets
  active: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const preset = fontFamilyPresets[fontKey]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-1.5 rounded-md border p-3 text-left transition-all ${
        active
          ? 'border-accent bg-surface shadow-md'
          : 'border-border/60 bg-surface hover:border-border-strong'
      }`}
    >
      <span
        className="text-base leading-snug text-ink"
        style={{ fontFamily: preset.cssFamily }}
      >
        Psychiatrie Dokumentation
      </span>
      <span className="text-xs font-medium text-ink">{preset.label}</span>
      <span className="text-[12px] leading-snug text-muted">{t(fontFamilyDescriptionI18n[fontKey])}</span>
    </button>
  )
}

export function AppearanceSection({ appearance }: AppearanceSectionProps) {
  const { t } = useTranslation()
  const {
    settings,
    setPreferredAccentColor,
    setFontFamily,
    setFontSize,
    setWorkspaceScale,
    setLineHeight,
    setBorderWeight,
    setShowPanelGraphic,
    resetAppearance,
  } = appearance

  useEffect(() => {
    for (const preset of Object.values(fontFamilyPresets)) {
      if (preset.googleFont) loadGoogleFont(preset.googleFont)
    }
  }, [])

  return (
    <div>
      <div className="settings-section-toolbar">
        <button
          type="button"
          onClick={resetAppearance}
          className="settings-section-toolbar__action"
        >
          {t('settingsReset')}
        </button>
      </div>

      <SettingsField label={t('settingsAccentColorLabel')} stack>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(Object.keys(accentColorPresets) as PreferredAccentColor[]).map((key) => (
            <AccentColorCard
              key={key}
              accentKey={key}
              active={settings.preferredAccentColor === key}
              onSelect={() => setPreferredAccentColor(key)}
            />
          ))}
        </div>
      </SettingsField>

      <SettingsField label={t('settingsFontFamilyLabel')} stack>
        <div className="space-y-4">
          {fontFamilyGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">
                {fontGroupLabelI18n[group.label] ? t(fontGroupLabelI18n[group.label]) : group.label}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.fonts.map((key) => (
                  <FontFamilyCard
                    key={key}
                    fontKey={key}
                    active={settings.fontFamily === key}
                    onSelect={() => setFontFamily(key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SettingsField>

      <SettingsField label={t('settingsFontSizeLabel')} stack>
        <SettingsOptionGroup
          value={settings.fontSize}
          options={Object.entries(fontSizePresets).map(([value, preset]) => ({
            value: value as keyof typeof fontSizePresets,
            label: preset.label,
          }))}
          onChange={setFontSize}
        />
      </SettingsField>

      <SettingsField label={t('settingsWorkspaceScaleLabel')} stack>
        <SettingsOptionGroup
          value={settings.workspaceScale}
          options={Object.entries(workspaceScalePresets).map(([value, preset]) => ({
            value: value as keyof typeof workspaceScalePresets,
            label: preset.label,
          }))}
          onChange={setWorkspaceScale}
        />
      </SettingsField>

      <SettingsField label={t('settingsLineHeightLabel')} stack>
        <SettingsOptionGroup
          value={settings.lineHeight}
          options={Object.entries(lineHeightPresets).map(([value, preset]) => ({
            value: value as keyof typeof lineHeightPresets,
            label: preset.label,
          }))}
          onChange={setLineHeight}
        />
      </SettingsField>

      <SettingsField label={t('settingsBorderWeightLabel')} stack>
        <SettingsOptionGroup
          value={settings.borderWeight}
          options={Object.entries(borderWeightPresets).map(([value, preset]) => ({
            value: value as keyof typeof borderWeightPresets,
            label: preset.label,
          }))}
          onChange={setBorderWeight}
        />
      </SettingsField>

      <SettingsField label={t('settingsPanelGraphicLabel')} stack>
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={settings.showPanelGraphic}
            onChange={(event) => setShowPanelGraphic(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border accent-accent"
          />
          {t('settingsPanelGraphicToggle')}
        </label>
      </SettingsField>
    </div>
  )
}
