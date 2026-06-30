import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import {
  isUserNotesStoreConfigured,
  listUserNotes,
  softDeleteUserNote,
  upsertUserNote,
} from '../services/userNotesStore'

export const userNotesRouter: Router = createRouter()

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
      error: 'Notizen benötigen Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

userNotesRouter.get('/', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId || !requireStore(res)) return
  try {
    const notes = await listUserNotes(userId)
    res.json({ notes })
  } catch (error) {
    console.error('[user-notes] list failed', error)
    res.status(500).json({ error: 'Notizen konnten nicht geladen werden' })
  }
})

userNotesRouter.post('/', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId || !requireStore(res)) return
  const body = (req.body ?? {}) as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title : ''
  const content = typeof body.content === 'string' ? body.content : ''
  if (!content.trim() && !title.trim()) {
    res.status(400).json({ error: 'title or content required' })
    return
  }
  try {
    const note = await upsertUserNote(userId, {
      id: typeof body.id === 'string' ? body.id : undefined,
      title,
      content,
      kind: typeof body.kind === 'string' ? body.kind : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      pageType: typeof body.pageType === 'string' ? body.pageType : undefined,
    })
    res.json({ note })
  } catch (error) {
    console.error('[user-notes] upsert failed', error)
    res.status(500).json({ error: 'Notiz konnte nicht gespeichert werden' })
  }
})

userNotesRouter.delete('/:id', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId || !requireStore(res)) return
  try {
    await softDeleteUserNote(userId, req.params.id)
    res.json({ ok: true })
  } catch (error) {
    console.error('[user-notes] delete failed', error)
    res.status(500).json({ error: 'Notiz konnte nicht gelöscht werden' })
  }
})
