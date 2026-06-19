import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { CreateTodoInput, TodoPriority, UpdateTodoInput } from '../../src/types/todo'
import type { OrganisationRole } from '../../src/types/organisation'
import { canAssignTaskTo, isTaskAssignerRole } from '../../src/data/org/roleHierarchy'
import { resolveAccountId } from '../middleware/auth'
import {
  buildOrganisationContext,
  canViewCase,
  ORG_HEADER,
} from '../services/orgPermissions'
import {
  createTodo,
  deleteTodo,
  enrichTodos,
  getMemberRole,
  getTodo,
  isTodoStoreConfigured,
  listOrgMemberProfiles,
  listTodosForUser,
  updateTodo,
} from '../services/todoStore'

export const todosRouter: Router = createRouter()

const VALID_PRIORITIES: TodoPriority[] = ['low', 'normal', 'high']

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Anmeldung erforderlich' })
    return null
  }
  return userId
}

function requireSupabase(res: Response): boolean {
  if (!isTodoStoreConfigured()) {
    res.status(503).json({
      error: 'To-Dos benötigen Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

async function resolveOrgContext(req: Request, res: Response) {
  const userId = requireAuth(req, res)
  if (!userId) return null
  if (!requireSupabase(res)) return null

  const { organisation, role, member } = await buildOrganisationContext(
    userId,
    req.headers[ORG_HEADER],
  )
  if (!organisation || !role || !member) {
    res.status(404).json({ error: 'Organisationskontext nicht verfügbar' })
    return null
  }
  return { userId, organisation, role, member }
}

function isOwnerRole(role: string): boolean {
  return role === 'org_owner' || role === 'single_owner'
}

function normaliseDueDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed
}

function normalisePriority(value: unknown): TodoPriority | null {
  if (typeof value !== 'string') return null
  return VALID_PRIORITIES.includes(value as TodoPriority) ? (value as TodoPriority) : null
}

async function assertCaseViewAccess(
  ctx: NonNullable<Awaited<ReturnType<typeof resolveOrgContext>>>,
  caseId: string | undefined | null,
  res: Response,
): Promise<boolean> {
  if (!caseId?.trim()) return true
  const allowed = await canViewCase(ctx.userId, ctx.organisation.id, caseId.trim())
  if (!allowed) {
    res.status(403).json({ error: 'Kein Zugriff auf den verknüpften Fall' })
    return false
  }
  return true
}

// GET /api/todos?caseId=
todosRouter.get('/', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return

    const caseId = typeof req.query.caseId === 'string' ? req.query.caseId.trim() : undefined
    const todos = await listTodosForUser(ctx.organisation.id, ctx.userId, { caseId: caseId || null })
    const enriched = await enrichTodos(todos)
    res.json({ todos: enriched })
  } catch (error) {
    console.error('[todos] list failed:', error)
    res.status(500).json({ error: 'To-Dos konnten nicht geladen werden' })
  }
})

// GET /api/todos/assignable-members
todosRouter.get('/assignable-members', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return

    if (ctx.organisation.tier !== 'small_praxis' || !isTaskAssignerRole(ctx.role)) {
      res.json({ members: [] })
      return
    }

    const profiles = await listOrgMemberProfiles(ctx.organisation.id)
    const assignable = profiles
      .filter((member) => member.userId !== ctx.userId)
      .filter((member) => canAssignTaskTo(ctx.role, member.role as OrganisationRole))
    res.json({ members: assignable })
  } catch (error) {
    console.error('[todos] assignable-members failed:', error)
    res.status(500).json({ error: 'Mitglieder konnten nicht geladen werden' })
  }
})

// POST /api/todos
todosRouter.post('/', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return

    const body = (req.body ?? {}) as Record<string, unknown>
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) {
      res.status(400).json({ error: 'Text erforderlich' })
      return
    }

    const input: CreateTodoInput = {
      text,
      dueDate: normaliseDueDate(body.dueDate),
      priority: normalisePriority(body.priority),
      caseId: typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null,
      patientLabel:
        typeof body.patientLabel === 'string' && body.patientLabel.trim()
          ? body.patientLabel.trim()
          : null,
    }

    if (!(await assertCaseViewAccess(ctx, input.caseId, res))) return

    const assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo.trim() : ''

    if (assignedTo && assignedTo !== ctx.userId) {
      if (ctx.organisation.tier !== 'small_praxis') {
        res.status(400).json({ error: 'Zuweisung erfordert den Praxis-Modus' })
        return
      }
      const targetRole = await getMemberRole(ctx.organisation.id, assignedTo)
      if (!targetRole) {
        res.status(404).json({ error: 'Zielmitglied nicht gefunden' })
        return
      }
      if (!canAssignTaskTo(ctx.role, targetRole as OrganisationRole)) {
        res.status(403).json({ error: 'Zuweisung an dieses Mitglied nicht erlaubt' })
        return
      }
      const todo = await createTodo(ctx.organisation.id, ctx.userId, input, {
        assignedBy: ctx.userId,
        assignedTo,
      })
      const [enriched] = await enrichTodos([todo])
      res.status(201).json({ todo: enriched })
      return
    }

    const todo = await createTodo(ctx.organisation.id, ctx.userId, input)
    res.status(201).json({ todo })
  } catch (error) {
    console.error('[todos] create failed:', error)
    res.status(500).json({ error: 'To-Do konnte nicht erstellt werden' })
  }
})

// PATCH /api/todos/:id
todosRouter.patch('/:id', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return

    const existing = await getTodo(ctx.organisation.id, req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'To-Do nicht gefunden' })
      return
    }

    const isOwner = existing.ownerUserId === ctx.userId
    const isAssignee = existing.assignedTo === ctx.userId
    const ownerRole = isOwnerRole(ctx.role)
    const body = (req.body ?? {}) as Record<string, unknown>

    const wantsDoneOnly =
      Object.keys(body).length === 1 && Object.prototype.hasOwnProperty.call(body, 'done')

    // Assignee may only toggle completion; owner / assigner / org owner may edit all fields.
    if (!isOwner && !ownerRole) {
      if (!(isAssignee && wantsDoneOnly)) {
        res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten dieses Eintrags' })
        return
      }
    }

    const patch: UpdateTodoInput = {}
    if (typeof body.text === 'string') patch.text = body.text
    if (typeof body.done === 'boolean') patch.done = body.done
    if (body.dueDate !== undefined) patch.dueDate = normaliseDueDate(body.dueDate)
    if (body.priority !== undefined) patch.priority = normalisePriority(body.priority)
    if (body.caseId !== undefined) {
      patch.caseId = typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null
    }
    if (body.patientLabel !== undefined) {
      patch.patientLabel =
        typeof body.patientLabel === 'string' && body.patientLabel.trim()
          ? body.patientLabel.trim()
          : null
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'Keine Änderungen angegeben' })
      return
    }

    if (patch.caseId !== undefined && !(await assertCaseViewAccess(ctx, patch.caseId, res))) return

    const todo = await updateTodo(ctx.organisation.id, req.params.id, patch)
    const [enriched] = await enrichTodos([todo])
    res.json({ todo: enriched })
  } catch (error) {
    console.error('[todos] update failed:', error)
    res.status(500).json({ error: 'To-Do konnte nicht aktualisiert werden' })
  }
})

// DELETE /api/todos/:id
todosRouter.delete('/:id', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return

    const existing = await getTodo(ctx.organisation.id, req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'To-Do nicht gefunden' })
      return
    }

    const isOwner = existing.ownerUserId === ctx.userId
    if (!isOwner && !isOwnerRole(ctx.role)) {
      res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Eintrags' })
      return
    }

    await deleteTodo(ctx.organisation.id, req.params.id)
    res.json({ ok: true })
  } catch (error) {
    console.error('[todos] delete failed:', error)
    res.status(500).json({ error: 'To-Do konnte nicht gelöscht werden' })
  }
})
