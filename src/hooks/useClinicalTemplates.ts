import { useCallback, useEffect, useState } from 'react'
import {
  activateClinicalTemplate,
  CLINICAL_TEMPLATES_CHANGED_EVENT,
  createClinicalTemplate,
  deleteClinicalTemplate,
  duplicateClinicalTemplate,
  loadClinicalTemplates,
  setClinicalTemplateStatus,
  updateClinicalTemplate,
  type CreateClinicalTemplateInput,
} from '../utils/clinicalTemplate/store'
import type { ClinicalTemplate } from '../types/clinicalTemplate'

export function useClinicalTemplates() {
  const [templates, setTemplates] = useState<ClinicalTemplate[]>(() => loadClinicalTemplates())

  const refresh = useCallback(() => {
    setTemplates(loadClinicalTemplates())
  }, [])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener(CLINICAL_TEMPLATES_CHANGED_EVENT, handler)
    return () => window.removeEventListener(CLINICAL_TEMPLATES_CHANGED_EVENT, handler)
  }, [refresh])

  const create = useCallback(
    (input: CreateClinicalTemplateInput) => {
      const created = createClinicalTemplate(input)
      refresh()
      return created
    },
    [refresh],
  )

  const update = useCallback(
    (id: string, patch: Partial<ClinicalTemplate>) => {
      const updated = updateClinicalTemplate(id, patch)
      refresh()
      return updated
    },
    [refresh],
  )

  const duplicate = useCallback(
    (id: string) => {
      const copy = duplicateClinicalTemplate(id)
      refresh()
      return copy
    },
    [refresh],
  )

  const archive = useCallback(
    (id: string) => {
      const updated = setClinicalTemplateStatus(id, 'archived')
      refresh()
      return updated
    },
    [refresh],
  )

  const activate = useCallback(
    (id: string) => {
      const updated = activateClinicalTemplate(id)
      refresh()
      return updated
    },
    [refresh],
  )

  const remove = useCallback(
    (id: string) => {
      const ok = deleteClinicalTemplate(id)
      refresh()
      return ok
    },
    [refresh],
  )

  return { templates, refresh, create, update, duplicate, archive, activate, remove }
}
