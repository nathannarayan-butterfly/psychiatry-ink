/**
 * Future role-based gate for Wissensdatenbank editing hierarchy.
 * Defaults allow all actions until org/role wiring is added.
 */
export interface KnowledgeBasePermissions {
  canEdit: boolean
  canApprove: boolean
  requiresApproval: boolean
}

export function useKnowledgeBasePermissions(): KnowledgeBasePermissions {
  return {
    canEdit: true,
    canApprove: true,
    requiresApproval: false,
  }
}
