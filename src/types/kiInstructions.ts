export const KI_DOCUMENT_TYPE_IDS = ['aufnahme', 'verlauf', 'psychopath', 'therapie-verlauf'] as const

export type KiDocumentTypeId = (typeof KI_DOCUMENT_TYPE_IDS)[number]

export type KiInstructionPresetId =
  | 'none'
  | 'legalWriter'
  | 'casualWriter'
  | 'formalClinical'
  | 'custom'

export interface KiInstructionsSettings {
  defaultInstruction: string
  preset: KiInstructionPresetId
  documentOverrides: Partial<Record<KiDocumentTypeId, string>>
}

export const defaultKiInstructionsSettings: KiInstructionsSettings = {
  defaultInstruction: '',
  preset: 'none',
  documentOverrides: {},
}

export const KI_INSTRUCTION_PRESET_TEXT: Record<
  Exclude<KiInstructionPresetId, 'custom' | 'none'>,
  string
> = {
  legalWriter: 'Write as a legal documentation specialist. Use precise, formal legal phrasing.',
  casualWriter: 'Use clear, accessible language while preserving clinical accuracy.',
  formalClinical:
    'Use formal clinical psychiatric terminology. Neutral, objective tone.',
}
