import { defaultWorkspaceComponents } from './defaultWorkspaceComponents'
import { toDocumentTypes } from '../utils/workspaceComponents'

export const documentTypes = toDocumentTypes(defaultWorkspaceComponents)

export function getDocumentType(id: string) {
  return documentTypes.find((type) => type.id === id)
}
