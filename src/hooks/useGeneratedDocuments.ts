import { useCallback, useEffect, useState } from 'react'
import {
  duplicateGeneratedDocument,
  GENERATED_DOCS_CHANGED_EVENT,
  loadGeneratedDocuments,
  saveGeneratedDocument,
  setGeneratedDocumentStatus,
  updateGeneratedDocument,
} from '../utils/generatedDocumentsVault'
import type { GeneratedDocument } from '../types/documentTemplate'

export function useGeneratedDocuments(caseId: string | undefined) {
  const [docs, setDocs] = useState<GeneratedDocument[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!caseId) {
      setDocs([])
      return
    }
    setLoading(true)
    try {
      const loaded = await loadGeneratedDocuments(caseId)
      setDocs(loaded)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!caseId) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === caseId) void refresh()
    }
    window.addEventListener(GENERATED_DOCS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(GENERATED_DOCS_CHANGED_EVENT, handler)
  }, [caseId, refresh])

  const save = useCallback(
    async (doc: GeneratedDocument) => {
      if (!caseId) return doc
      const saved = await saveGeneratedDocument(caseId, doc)
      await refresh()
      return saved
    },
    [caseId, refresh],
  )

  const update = useCallback(
    async (id: string, patch: Partial<GeneratedDocument>) => {
      if (!caseId) return null
      const updated = await updateGeneratedDocument(caseId, id, patch)
      await refresh()
      return updated
    },
    [caseId, refresh],
  )

  const finalize = useCallback(
    async (id: string) => {
      if (!caseId) return null
      const updated = await setGeneratedDocumentStatus(caseId, id, 'finalized')
      await refresh()
      return updated
    },
    [caseId, refresh],
  )

  const archive = useCallback(
    async (id: string) => {
      if (!caseId) return null
      const updated = await setGeneratedDocumentStatus(caseId, id, 'archived')
      await refresh()
      return updated
    },
    [caseId, refresh],
  )

  const duplicate = useCallback(
    async (id: string) => {
      if (!caseId) return null
      const copy = await duplicateGeneratedDocument(caseId, id)
      await refresh()
      return copy
    },
    [caseId, refresh],
  )

  return { docs, loading, refresh, save, update, finalize, archive, duplicate }
}
