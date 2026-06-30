import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import {
  isUserNotesStoreConfigured,
  listKbPharmaComments,
  softDeleteKbPharmaComment,
  upsertKbPharmaComment,
} from '../services/userNotesStore'

export const kbPharmaCommentsRouter: Router = createRouter()

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Anmeldung erforderlich' })
    return null
  }
  return userId
}

function requireStore(res: Response): boolean {
  if (!isUserNotesStoreConfigured()) {
    res.status(503).json({
      error: 'Kommentare benötigen Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

kbPharmaCommentsRouter.get('/', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId || !requireStore(res)) return
  try {
    const comments = await listKbPharmaComments(userId)
    res.json({ comments })
  } catch (error) {
    console.error('[kb-pharma-comments] list failed', error)
    res.status(500).json({ error: 'Kommentare konnten nicht geladen werden' })
  }
})

kbPharmaCommentsRouter.post('/', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId || !requireStore(res)) return
  const body = (req.body ?? {}) as Record<string, unknown>
  const medicationId = typeof body.medicationId === 'string' ? body.medicationId.trim() : ''
  const sectionId = typeof body.sectionId === 'string' ? body.sectionId.trim() : ''
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const ciphertext = typeof body.ciphertext === 'string' ? body.ciphertext : undefined
  const iv = typeof body.iv === 'string' ? body.iv : undefined
  const wrappedKey = typeof body.wrappedKey === 'string' ? body.wrappedKey : undefined
  const payloadVersion =
    typeof body.payloadVersion === 'number' ? body.payloadVersion : undefined
  const hasCiphertext = Boolean(ciphertext && iv && wrappedKey)
  if (!medicationId || !sectionId) {
    res.status(400).json({ error: 'medicationId and sectionId required' })
    return
  }
  // SECURITY: refuse mixed writes (Design D quick-win for kb_pharma_comments).
  if (hasCiphertext && text) {
    res.status(400).json({
      error: 'ciphertext and plaintext text are mutually exclusive — send one or the other',
    })
    return
  }
  if (!hasCiphertext && !text) {
    res.status(400).json({ error: 'text or ciphertext required' })
    return
  }
  try {
    const comment = await upsertKbPharmaComment(userId, {
      id: typeof body.id === 'string' ? body.id : undefined,
      medicationId,
      sectionId,
      text,
      highlightId: typeof body.highlightId === 'string' ? body.highlightId : null,
      ciphertext,
      iv,
      wrappedKey,
      payloadVersion,
    })
    res.json({ comment })
  } catch (error) {
    console.error('[kb-pharma-comments] upsert failed', error)
    res.status(500).json({ error: 'Kommentar konnte nicht gespeichert werden' })
  }
})

kbPharmaCommentsRouter.delete('/:id', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId || !requireStore(res)) return
  try {
    await softDeleteKbPharmaComment(userId, req.params.id)
    res.json({ ok: true })
  } catch (error) {
    console.error('[kb-pharma-comments] delete failed', error)
    res.status(500).json({ error: 'Kommentar konnte nicht gelöscht werden' })
  }
})
