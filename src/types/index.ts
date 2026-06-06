import type { WorkspaceAiConfig } from './aiManager'

export type SectionStatus = 'empty' | 'active' | 'draft' | 'saved'

export type InputMode = 'write' | 'dictate' | 'extract'

export type AiModelTier = 'fast' | 'standard' | 'thorough'

export type AiGenerationScope = 'segment' | 'document'

export interface DocumentChecklistItem {
  id: string
  label: string
  text: string
  normal?: boolean
  group?: string
  hint?: string
}

export type DocumentVariantMode = 'free' | 'sections' | 'checklist'

export interface DocumentSection {
  id: string
  label: string
  description?: string
  exampleHint?: string
  prefilledText?: string
  checklistItems?: DocumentChecklistItem[]
  status: SectionStatus
  ai?: WorkspaceAiConfig
}

export interface DocumentTypeVariant {
  id: string
  label: string
  railHeading?: string
  mode: DocumentVariantMode
  multistage: boolean
  prefilledText?: string
  sections: DocumentSection[]
  ai?: WorkspaceAiConfig
}

export interface DocumentType {
  id: string
  label: string
  toolLabelLines?: string[]
  railHeading?: string
  icon: string
  multistage: boolean
  mode?: DocumentVariantMode
  prefilledText?: string
  sections?: DocumentSection[]
  variants?: DocumentTypeVariant[]
  defaultVariantId?: string
  ai?: WorkspaceAiConfig
}

export interface WorkspaceState {
  selectedDocumentType: string
  activeSectionId: string | null
  sections: DocumentSection[]
  editorContent: string
  generatedContent: string
  aiToolsExpanded: boolean
  aiAutoMode: boolean
  inputMode: InputMode
  lastVersion: string | null
  isGenerating: boolean
}
