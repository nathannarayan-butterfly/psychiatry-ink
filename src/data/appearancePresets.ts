import {
  defaultAppearanceSettings,
  pageTypeIds,
  paperColorIds,
  type AppearanceSettings,
  type BorderWeight,
  type FontFamily,
  type FontSize,
  type LineHeight,
  type PageType,
  type PaperColor,
  type PreferredAccentColor,
  type WorkspaceScale,
} from '../types/settings'
import { loadGoogleFont } from '../utils/googleFonts'

export interface AccentColorPreset {
  label: string
  description: string
  hex: string
}

export const accentColorPresets: Record<PreferredAccentColor, AccentColorPreset> = {
  terracotta: {
    label: 'Terrakotta',
    description: 'Warmer Ton, erdig — Standard',
    hex: '#A0573F',
  },
  blue: {
    label: 'Klinisches Blau',
    description: 'Sachlich und ruhig',
    hex: '#3E6478',
  },
  green: {
    label: 'Tiefgrün',
    description: 'Natürlich-klinisch',
    hex: '#3F7A5F',
  },
  teal: {
    label: 'Petrol',
    description: 'Kühles Blaugrün, klar',
    hex: '#2F7474',
  },
  indigo: {
    label: 'Indigo',
    description: 'Tiefes Violettblau',
    hex: '#4F4E8A',
  },
  burgundy: {
    label: 'Bordeaux',
    description: 'Gedämpftes Weinrot',
    hex: '#8B4351',
  },
  amber: {
    label: 'Bernstein',
    description: 'Warmes Ockergold',
    hex: '#9A7330',
  },
  slate: {
    label: 'Schiefer',
    description: 'Ruhiges Stahlgrau',
    hex: '#556373',
  },
}

/** Maps retired full-theme ids to nearest accent. */
const legacyColorSchemeToAccent: Record<string, PreferredAccentColor> = {
  classic: 'green',
  warm: 'terracotta',
  cool: 'blue',
  contrast: 'terracotta',
  salbei: 'green',
  lavendel: 'indigo',
  ozean: 'blue',
  rose: 'burgundy',
  schiefer: 'slate',
  koralle: 'terracotta',
  komplement: 'terracotta',
  nacht: 'indigo',
  graphit: 'slate',
  wald: 'green',
  himmel: 'blue',
  sandstein: 'amber',
  bernstein: 'amber',
  brown: 'terracotta',
  violet: 'indigo',
}

export function migratePreferredAccentColor(
  value: unknown,
  legacyColorScheme?: unknown,
): PreferredAccentColor {
  if (typeof value === 'string' && value in accentColorPresets) {
    return value as PreferredAccentColor
  }
  if (typeof value === 'string' && value in legacyColorSchemeToAccent) {
    return legacyColorSchemeToAccent[value]
  }
  if (typeof legacyColorScheme === 'string' && legacyColorScheme in legacyColorSchemeToAccent) {
    return legacyColorSchemeToAccent[legacyColorScheme]
  }
  return defaultAppearanceSettings.preferredAccentColor
}

export const fontSizePresets: Record<FontSize, { label: string; size: string }> = {
  sm: { label: 'Klein', size: '14px' },
  md: { label: 'Mittel', size: '15px' },
  lg: { label: 'Groß', size: '17px' },
}

export interface FontFamilyPreset {
  label: string
  description: string
  category: 'sans' | 'serif'
  googleFont: string | null
  cssFamily: string
}

export const fontFamilyPresets: Record<FontFamily, FontFamilyPreset> = {
  inter: {
    label: 'Inter',
    description: 'Modern, neutral — Standard',
    category: 'sans',
    googleFont: 'Inter',
    cssFamily: '"Inter", system-ui, -apple-system, sans-serif',
  },
  sourceSans: {
    label: 'Source Sans 3',
    description: 'Klar und professionell',
    category: 'sans',
    googleFont: 'Source Sans 3',
    cssFamily: '"Source Sans 3", system-ui, sans-serif',
  },
  ibmPlex: {
    label: 'IBM Plex Sans',
    description: 'Sachlich, klinisch wirkend',
    category: 'sans',
    googleFont: 'IBM Plex Sans',
    cssFamily: '"IBM Plex Sans", system-ui, sans-serif',
  },
  notoSans: {
    label: 'Noto Sans',
    description: 'Breite Zeichenunterstützung',
    category: 'sans',
    googleFont: 'Noto Sans',
    cssFamily: '"Noto Sans", system-ui, sans-serif',
  },
  publicSans: {
    label: 'Public Sans',
    description: 'Ruhig und gut lesbar',
    category: 'sans',
    googleFont: 'Public Sans',
    cssFamily: '"Public Sans", system-ui, sans-serif',
  },
  lato: {
    label: 'Lato',
    description: 'Freundlich und ausgewogen',
    category: 'sans',
    googleFont: 'Lato',
    cssFamily: '"Lato", system-ui, sans-serif',
  },
  atkinson: {
    label: 'Atkinson Hyperlegible',
    description: 'Hohe Lesbarkeit, barrierefreundlich',
    category: 'sans',
    googleFont: 'Atkinson Hyperlegible',
    cssFamily: '"Atkinson Hyperlegible", system-ui, sans-serif',
  },
  literata: {
    label: 'Literata',
    description: 'Serifenschrift für langes Lesen',
    category: 'serif',
    googleFont: 'Literata',
    cssFamily: '"Literata", Georgia, "Times New Roman", serif',
  },
  merriweather: {
    label: 'Merriweather',
    description: 'Klassische Serifenschrift',
    category: 'serif',
    googleFont: 'Merriweather',
    cssFamily: '"Merriweather", Georgia, serif',
  },
  lora: {
    label: 'Lora',
    description: 'Elegante Serifenschrift',
    category: 'serif',
    googleFont: 'Lora',
    cssFamily: '"Lora", Georgia, serif',
  },
}

export const fontFamilyGroups: { label: string; fonts: FontFamily[] }[] = [
  {
    label: 'Sans-serif',
    fonts: ['inter', 'sourceSans', 'ibmPlex', 'notoSans', 'publicSans', 'lato', 'atkinson'],
  },
  {
    label: 'Serif',
    fonts: ['literata', 'merriweather', 'lora'],
  },
]

export function migrateFontFamily(value: unknown): FontFamily {
  if (typeof value === 'string' && value in fontFamilyPresets) return value as FontFamily
  return defaultAppearanceSettings.fontFamily
}

export const workspaceScalePresets: Record<
  WorkspaceScale,
  { label: string; min: string; fluid: string; max: string }
> = {
  compact: { label: 'Kompakt', min: '32rem', fluid: '62vw', max: '64rem' },
  standard: { label: 'Standard', min: '36rem', fluid: '70vw', max: '76rem' },
  wide: { label: 'Breit', min: '40rem', fluid: '76vw', max: '88rem' },
}

export const lineHeightPresets: Record<LineHeight, { label: string; value: string }> = {
  normal: { label: 'Normal', value: '1.65' },
  relaxed: { label: 'Entspannt', value: '1.85' },
}

export const borderWeightPresets: Record<BorderWeight, { label: string; width: string }> = {
  thin: { label: 'Dünn', width: '1.5px' },
  standard: { label: 'Standard', width: '2px' },
}

export interface PageTypePreset {
  ruleSpacing: string
}

export const pageTypePresets: Record<PageType, PageTypePreset> = {
  ruled: { ruleSpacing: '1.65rem' },
  blank: { ruleSpacing: '1.65rem' },
  grid: { ruleSpacing: '1.65rem' },
  wideRuled: { ruleSpacing: '2rem' },
}

export interface PaperColorPreset {
  bg: string
  borderTone: string
}

export const paperColorPresets: Record<PaperColor, PaperColorPreset> = {
  white: { bg: '#FFFFFF', borderTone: '#DDD9D2' },
  cream: { bg: '#FAF8F3', borderTone: '#E8E4D8' },
  blueGrey: { bg: '#F5F7F9', borderTone: '#D8DDE3' },
  softGreen: { bg: '#F6F9F6', borderTone: '#DDE5DD' },
  warmGrey: { bg: '#F7F5F3', borderTone: '#E0DCD6' },
  paleBlue: { bg: '#F3F7FA', borderTone: '#D5DFE8' },
}

/** Page/paper background options are muted until re-enabled in settings UI. */
export const fixedWorkspacePageBackground = {
  pageType: 'blank' as PageType,
  paperColor: 'white' as PaperColor,
}

export function migratePageType(value: unknown): PageType {
  if (typeof value === 'string' && pageTypeIds.includes(value as PageType)) {
    return value as PageType
  }
  return defaultAppearanceSettings.pageType
}

export function migratePaperColor(value: unknown): PaperColor {
  if (typeof value === 'string' && paperColorIds.includes(value as PaperColor)) {
    return value as PaperColor
  }
  return defaultAppearanceSettings.paperColor
}

function applyAccentTokens(root: HTMLElement, accent: string) {
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-hover', `color-mix(in srgb, ${accent} 85%, black)`)
  root.style.setProperty('--accent-soft', `color-mix(in srgb, ${accent} 14%, white)`)
  root.style.setProperty('--accent-ultrasoft', `color-mix(in srgb, ${accent} 7%, white)`)
  root.style.setProperty('--header-bg', `color-mix(in srgb, ${accent} 12%, white)`)
  root.style.setProperty('--header-bg-strong', `color-mix(in srgb, ${accent} 18%, white)`)
  root.style.setProperty('--border-strong', '#C8C4BE')

  root.style.setProperty('--app-bg', '#FFFFFF')
  root.style.setProperty('--surface', '#FFFFFF')
  root.style.setProperty('--surface-raised', '#FFFFFF')
  root.style.setProperty('--border-soft', '#E8E4DF')
  root.style.setProperty('--text-main', '#24211E')
  root.style.setProperty('--text-secondary', '#6D655C')
  root.style.setProperty('--text-muted', '#91887E')

  root.style.setProperty('--color-page', '#FFFFFF')
  root.style.setProperty('--color-surface-raised', '#FFFFFF')
  root.style.setProperty('--color-editor-surface', '#FFFFFF')
  root.style.setProperty('--color-soft-surface', '#FFFFFF')
  root.style.setProperty('--color-muted-surface', '#FFFFFF')
  root.style.setProperty('--color-ink', '#24211E')
  root.style.setProperty('--color-secondary', '#6D655C')
  root.style.setProperty('--color-muted', '#91887E')
  root.style.setProperty('--color-border', '#E8E4DF')
  root.style.setProperty('--color-border-strong', '#C8C4BE')
  root.style.setProperty('--color-surface-hover', '#F5F5F5')
  root.style.setProperty('--color-surface-active', '#F0F0F0')
  root.style.setProperty('--color-accent', accent)
  root.style.setProperty('--color-accent-hover', `color-mix(in srgb, ${accent} 85%, black)`)
  root.style.setProperty('--color-accent-muted', `color-mix(in srgb, ${accent} 14%, white)`)
  root.style.setProperty('--color-accent-foreground', '#FFFFFF')
  root.style.setProperty('--color-accent-secondary', accent)
  root.style.setProperty('--color-recording', '#b54548')
  root.style.setProperty('--gradient-accent-spot', '#FFFFFF')
  root.style.setProperty('--gradient-surface-spot', '#FFFFFF')

  root.style.setProperty('--glass-bg', '#FFFFFF')
  root.style.setProperty('--glass-bg-subtle', '#FFFFFF')
  root.style.setProperty('--glass-bg-header', '#FFFFFF')
  root.style.setProperty('--glass-bg-hover', '#F5F5F5')
  root.style.setProperty('--glass-bg-active', '#F0F0F0')
  root.style.setProperty('--glass-border', '#E8E4DF')
  root.style.setProperty('--glass-overlay', '#FFFFFF')
}

export function applyAppearanceSettings(settings: AppearanceSettings) {
  const root = document.documentElement
  const accentPreset =
    accentColorPresets[settings.preferredAccentColor] ?? accentColorPresets.terracotta
  const font = fontSizePresets[settings.fontSize]
  const fontFamily = fontFamilyPresets[settings.fontFamily] ?? fontFamilyPresets.inter
  const workspace = workspaceScalePresets[settings.workspaceScale]
  const lineHeight = lineHeightPresets[settings.lineHeight]
  const border = borderWeightPresets[settings.borderWeight]

  applyAccentTokens(root, accentPreset.hex)

  root.style.setProperty('--workspace-min', workspace.min)
  root.style.setProperty('--workspace-fluid', workspace.fluid)
  root.style.setProperty('--workspace-max', workspace.max)

  if (fontFamily.googleFont) {
    loadGoogleFont(fontFamily.googleFont)
  }

  root.style.setProperty('--font-sans', fontFamily.cssFamily)
  root.style.setProperty('--editor-font-size', font.size)
  root.style.setProperty('--editor-line-height', lineHeight.value)
  root.style.setProperty('--border-width', border.width)

  const pageType =
    pageTypePresets[fixedWorkspacePageBackground.pageType] ?? pageTypePresets.blank
  const paper =
    paperColorPresets[fixedWorkspacePageBackground.paperColor] ?? paperColorPresets.white

  root.style.setProperty('--notion-paper-bg', paper.bg)
  root.style.setProperty('--notion-paper-border-tone', paper.borderTone)
  root.style.setProperty('--notion-rule', pageType.ruleSpacing)
  root.style.setProperty(
    '--notion-rule-color',
    `color-mix(in srgb, ${accentPreset.hex} 14%, #e6e4df)`,
  )

  root.dataset.accentColor = settings.preferredAccentColor
  root.dataset.fontFamily = settings.fontFamily
  root.dataset.fontSize = settings.fontSize
  root.dataset.workspaceScale = settings.workspaceScale
  root.dataset.pageType = fixedWorkspacePageBackground.pageType
  root.dataset.paperColor = fixedWorkspacePageBackground.paperColor
  root.dataset.themeMode = 'light'
  delete root.dataset.colorScheme
}
