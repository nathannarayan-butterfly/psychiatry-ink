import {
  accentColorPresets,
  borderWeightPresets,
  fontFamilyGroups,
  fontFamilyPresets,
  fontSizePresets,
  lineHeightPresets,
  pageTypePresets,
  paperColorPresets,
  workspaceScalePresets,
} from '../../data/appearancePresets'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { useTranslation } from '../../context/TranslationContext'
import type { PageType, PaperColor, PreferredAccentColor } from '../../types/settings'
import type { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import { loadGoogleFont } from '../../utils/googleFonts'
import { useEffect } from 'react'
import { SettingsField } from './SettingsField'
import { SettingsOptionGroup } from './SettingsOptionGroup'

const pageTypeLabelKeys: Record<PageType, UiTranslationKey> = {
  ruled: 'settingsPageTypeRuled',
  blank: 'settingsPageTypeBlank',
  grid: 'settingsPageTypeGrid',
  wideRuled: 'settingsPageTypeWideRuled',
}

const pageTypeDescriptionKeys: Record<PageType, UiTranslationKey> = {
  ruled: 'settingsPageTypeRuledDescription',
  blank: 'settingsPageTypeBlankDescription',
  grid: 'settingsPageTypeGridDescription',
  wideRuled: 'settingsPageTypeWideRuledDescription',
}

const paperColorLabelKeys: Record<PaperColor, UiTranslationKey> = {
  white: 'settingsPaperColorWhite',
  cream: 'settingsPaperColorCream',
  blueGrey: 'settingsPaperColorBlueGrey',
  softGreen: 'settingsPaperColorSoftGreen',
  warmGrey: 'settingsPaperColorWarmGrey',
  paleBlue: 'settingsPaperColorPaleBlue',
}

interface AppearanceSectionProps {
  appearance: ReturnType<typeof useAppearanceSettings>
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
  const preset = accentColorPresets[accentKey]

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
        <span className="text-xs font-medium text-ink">{preset.label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted">{preset.description}</span>
      </div>
    </button>
  )
}

function PageTypeCard({
  pageKey,
  active,
  onSelect,
}: {
  pageKey: PageType
  active: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const preset = pageTypePresets[pageKey]

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
        className="relative h-11 w-full overflow-hidden rounded-md border border-border/40"
        style={{ background: 'var(--notion-paper-bg, #fff)' }}
        aria-hidden
      >
        {pageKey === 'ruled' || pageKey === 'wideRuled' ? (
          <div
            className="absolute inset-x-2 top-2 bottom-1.5"
            style={{
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                transparent,
                transparent calc(${preset.ruleSpacing} * 0.45 - 1px),
                color-mix(in srgb, var(--accent) 18%, #e6e4df) calc(${preset.ruleSpacing} * 0.45 - 1px),
                color-mix(in srgb, var(--accent) 18%, #e6e4df) calc(${preset.ruleSpacing} * 0.45)
              )`,
            }}
          />
        ) : null}
        {pageKey === 'grid' ? (
          <div
            className="absolute inset-x-2 top-2 bottom-1.5"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  to right,
                  transparent,
                  transparent 7px,
                  color-mix(in srgb, var(--accent) 12%, #e8e6e0) 7px,
                  color-mix(in srgb, var(--accent) 12%, #e8e6e0) 8px
                ),
                repeating-linear-gradient(
                  to bottom,
                  transparent,
                  transparent 7px,
                  color-mix(in srgb, var(--accent) 12%, #e8e6e0) 7px,
                  color-mix(in srgb, var(--accent) 12%, #e8e6e0) 8px
                )`,
            }}
          />
        ) : null}
      </div>
      <div>
        <span className="text-xs font-medium text-ink">{t(pageTypeLabelKeys[pageKey])}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted">
          {t(pageTypeDescriptionKeys[pageKey])}
        </span>
      </div>
    </button>
  )
}

function PaperColorSwatch({
  colorKey,
  active,
  onSelect,
}: {
  colorKey: PaperColor
  active: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const preset = paperColorPresets[colorKey]

  return (
    <button
      type="button"
      onClick={onSelect}
      title={t(paperColorLabelKeys[colorKey])}
      aria-label={t(paperColorLabelKeys[colorKey])}
      aria-pressed={active}
      className={`flex flex-col items-center gap-1.5 rounded-md border p-2 transition-all ${
        active
          ? 'border-accent bg-surface shadow-md'
          : 'border-border/60 bg-surface hover:border-border-strong'
      }`}
    >
      <span
        className="h-9 w-full rounded-sm border border-black/8 shadow-inner"
        style={{ background: preset.bg }}
        aria-hidden
      />
      <span className="text-[10px] font-medium text-ink">{t(paperColorLabelKeys[colorKey])}</span>
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
      <span className="text-[11px] leading-snug text-muted">{preset.description}</span>
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
    setPageType,
    setPaperColor,
    resetAppearance,
  } = appearance

  useEffect(() => {
    for (const preset of Object.values(fontFamilyPresets)) {
      if (preset.googleFont) loadGoogleFont(preset.googleFont)
    }
  }, [])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">Darstellung</h2>
          <p className="mt-1 text-sm text-muted">
            Weiße Arbeitsflächen. Akzentfarbe nur in der Dokument-Kopfzeile und für Auswahlrahmen.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAppearance}
          className="shrink-0 self-start rounded-md border border-border/60 bg-surface px-3 py-1.5 text-xs text-ink transition-colors hover:bg-surface-hover"
        >
          Zurücksetzen
        </button>
      </div>

      <SettingsField
        label="Akzentfarbe"
        description="Färbt die Dokument-Kopfzeile (Titel und Fortschrittszeile) sowie Auswahlrahmen — nicht Abschnitts- oder Seitenleisten-Kopfzeilen."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

      <SettingsField label={t('settingsPageType')} description={t('settingsPageTypeDescription')}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(pageTypePresets) as PageType[]).map((key) => (
            <PageTypeCard
              key={key}
              pageKey={key}
              active={settings.pageType === key}
              onSelect={() => setPageType(key)}
            />
          ))}
        </div>
      </SettingsField>

      <SettingsField label={t('settingsPaperColor')} description={t('settingsPaperColorDescription')}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(paperColorPresets) as PaperColor[]).map((key) => (
            <PaperColorSwatch
              key={key}
              colorKey={key}
              active={settings.paperColor === key}
              onSelect={() => setPaperColor(key)}
            />
          ))}
        </div>
      </SettingsField>

      <SettingsField
        label="Schriftart"
        description="Kostenlose Schriften (Google Fonts) für die gesamte Oberfläche."
      >
        <div className="space-y-4">
          {fontFamilyGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {group.label}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

      <SettingsField label="Schriftgröße" description="Größe des Textes im Dokumentbereich.">
        <SettingsOptionGroup
          value={settings.fontSize}
          options={Object.entries(fontSizePresets).map(([value, preset]) => ({
            value: value as keyof typeof fontSizePresets,
            label: preset.label,
          }))}
          onChange={setFontSize}
        />
      </SettingsField>

      <SettingsField
        label="Arbeitsbereich-Breite"
        description="Wie breit der zentrale Dokumentbereich dargestellt wird."
      >
        <SettingsOptionGroup
          value={settings.workspaceScale}
          options={Object.entries(workspaceScalePresets).map(([value, preset]) => ({
            value: value as keyof typeof workspaceScalePresets,
            label: preset.label,
          }))}
          onChange={setWorkspaceScale}
        />
      </SettingsField>

      <SettingsField label="Zeilenabstand" description="Abstand zwischen den Textzeilen im Editor.">
        <SettingsOptionGroup
          value={settings.lineHeight}
          options={Object.entries(lineHeightPresets).map(([value, preset]) => ({
            value: value as keyof typeof lineHeightPresets,
            label: preset.label,
          }))}
          onChange={setLineHeight}
        />
      </SettingsField>

      <SettingsField label="Rahmenstärke" description="Dicke der Rahmen um Arbeitsbereich und Panels.">
        <SettingsOptionGroup
          value={settings.borderWeight}
          options={Object.entries(borderWeightPresets).map(([value, preset]) => ({
            value: value as keyof typeof borderWeightPresets,
            label: preset.label,
          }))}
          onChange={setBorderWeight}
        />
      </SettingsField>

      <SettingsField
        label="Grafik im Bedienfeld"
        description="Zeigt eine dezente Lottie-Animation rechts im unteren Bedienfeld."
      >
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={settings.showPanelGraphic}
            onChange={(event) => setShowPanelGraphic(event.target.checked)}
            className="h-4 w-4 rounded-sm border-2 border-border accent-accent"
          />
          Grafik anzeigen
        </label>
      </SettingsField>
    </div>
  )
}
