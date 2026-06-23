export type UiLanguage = 'de' | 'en' | 'fr' | 'es'

export type EnglishVariant = 'uk' | 'us'

export type { AssessmentStandard } from './isdm'

export type SettingsSectionId =
  | 'language'
  | 'appearance'
  | 'workspace'
  | 'lab'
  | 'parser-optimization'
  | 'overview-widgets'
  | 'ai'
  | 'privacy'
  | 'account'
  | 'about'
  | 'kb-admin'

export type PreferredAccentColor =
  | 'terracotta'
  | 'blue'
  | 'green'
  | 'teal'
  | 'indigo'
  | 'burgundy'
  | 'amber'
  | 'slate'
  | 'plum'
  | 'navy'
  | 'forest'
  | 'graphite'

export type FontSize = 'sm' | 'md' | 'lg'

export type FontFamily =
  | 'inter'
  | 'sourceSans'
  | 'ibmPlex'
  | 'notoSans'
  | 'publicSans'
  | 'lato'
  | 'atkinson'
  | 'literata'
  | 'merriweather'
  | 'lora'
  | 'caveat'
  | 'dancingScript'

export type WorkspaceScale = 'compact' | 'standard' | 'wide'

export type LineHeight = 'normal' | 'relaxed'

export type BorderWeight = 'thin' | 'standard'

export type PageType = 'ruled' | 'blank' | 'grid' | 'wideRuled'

export type PaperColor = 'white' | 'cream' | 'blueGrey' | 'softGreen' | 'warmGrey' | 'paleBlue'

export interface AppearanceSettings {
  preferredAccentColor: PreferredAccentColor
  fontFamily: FontFamily
  fontSize: FontSize
  workspaceScale: WorkspaceScale
  lineHeight: LineHeight
  borderWeight: BorderWeight
  showPanelGraphic: boolean
  pageType: PageType
  paperColor: PaperColor
}

export const defaultAppearanceSettings: AppearanceSettings = {
  preferredAccentColor: 'terracotta',
  fontFamily: 'inter',
  fontSize: 'md',
  workspaceScale: 'standard',
  lineHeight: 'normal',
  borderWeight: 'standard',
  showPanelGraphic: true,
  pageType: 'ruled',
  paperColor: 'white',
}

export const pageTypeIds: PageType[] = ['ruled', 'blank', 'grid', 'wideRuled']

export const paperColorIds: PaperColor[] = [
  'white',
  'cream',
  'blueGrey',
  'softGreen',
  'warmGrey',
  'paleBlue',
]

export const preferredAccentColorIds: PreferredAccentColor[] = [
  'terracotta',
  'blue',
  'green',
  'teal',
  'indigo',
  'burgundy',
  'amber',
  'slate',
  'plum',
  'navy',
  'forest',
  'graphite',
]
