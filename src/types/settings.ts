export type UiLanguage = 'de' | 'en' | 'fr' | 'es'

export type SettingsSectionId =
  | 'appearance'
  | 'workspace'
  | 'language'
  | 'documentation'
  | 'ai'
  | 'account'
  | 'privacy'
  | 'about'

export type PreferredAccentColor = 'brown' | 'blue' | 'green' | 'burgundy' | 'violet'

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
  preferredAccentColor: 'brown',
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
  'brown',
  'blue',
  'green',
  'burgundy',
  'violet',
]
