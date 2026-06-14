import { useCallback, useEffect, useState } from 'react'
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  duplicateDocumentTemplate,
  loadDocumentTemplates,
  setTemplateStatus,
  TEMPLATES_CHANGED_EVENT,
  updateDocumentTemplate,
  type CreateTemplateInput,
} from '../utils/documentTemplateStore'
import type { DocumentTemplate } from '../types/documentTemplate'
import { useEnterpriseFeatures } from './useEnterpriseFeatures'
import { usePermissions } from './permissions'

export function useDocumentTemplates() {
  const { canAccessEnterpriseUi, enterpriseSettings } = useEnterpriseFeatures()
  const { hasPermission } = usePermissions()
  const canManageOrgTemplates =
    canAccessEnterpriseUi &&
    enterpriseSettings.orgTemplatesEnabled !== false &&
    hasPermission('templates.manageOrg')
  const [templates, setTemplates] = useState<DocumentTemplate[]>(() => loadDocumentTemplates())

  const refresh = useCallback(() => {
    setTemplates(loadDocumentTemplates())
  }, [])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener(TEMPLATES_CHANGED_EVENT, handler)
    return () => window.removeEventListener(TEMPLATES_CHANGED_EVENT, handler)
  }, [refresh])

  const create = useCallback((input: CreateTemplateInput) => {
    const created = createDocumentTemplate(input)
    refresh()
    return created
  }, [refresh])

  const update = useCallback((id: string, patch: Partial<DocumentTemplate>) => {
    const updated = updateDocumentTemplate(id, patch)
    refresh()
    return updated
  }, [refresh])

  const duplicate = useCallback((id: string) => {
    const copy = duplicateDocumentTemplate(id)
    refresh()
    return copy
  }, [refresh])

  const archive = useCallback((id: string) => {
    const updated = setTemplateStatus(id, 'archived')
    refresh()
    return updated
  }, [refresh])

  const activate = useCallback((id: string) => {
    const updated = setTemplateStatus(id, 'active')
    refresh()
    return updated
  }, [refresh])

  const remove = useCallback((id: string) => {
    const ok = deleteDocumentTemplate(id)
    refresh()
    return ok
  }, [refresh])

  return { templates, refresh, create, update, duplicate, archive, activate, remove, canManageOrgTemplates }
}
