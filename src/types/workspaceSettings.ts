import type { WorkspaceAiConfig } from './aiManager'

export type WorkspaceComponentIcon =
  | 'clipboard'
  | 'file-text'
  | 'brain'
  | 'flask'
  | 'activity'
  | 'mail'
  | 'pill'
  | 'message-square'

export interface WorkspaceChecklistItem {
  id: string
  label: string
  text: string
  normal?: boolean
  group?: string
  hint?: string
}

export type WorkspaceVariantMode = 'free' | 'sections' | 'checklist'

export interface WorkspaceSectionTemplate {
  id: string
  label: string
  description?: string
  exampleHint?: string
  prefilledText?: string
  checklistItems?: WorkspaceChecklistItem[]
  ai?: WorkspaceAiConfig
}

export interface WorkspaceComponentVariant {
  id: string
  label: string
  railHeading?: string
  mode: WorkspaceVariantMode
  multistage: boolean
  prefilledText?: string
  sections: WorkspaceSectionTemplate[]
  ai?: WorkspaceAiConfig
}

export interface WorkspaceComponentTemplate {
  id: string
  label: string
  toolLabelLines?: string[]
  railHeading?: string
  icon: WorkspaceComponentIcon
  multistage: boolean
  prefilledText?: string
  sections: WorkspaceSectionTemplate[]
  variants?: WorkspaceComponentVariant[]
  defaultVariantId?: string
  ai?: WorkspaceAiConfig
}

export interface WorkspaceSettings {
  components: WorkspaceComponentTemplate[]
}
