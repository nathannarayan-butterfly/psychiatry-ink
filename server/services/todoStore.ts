import type {
  CreateTodoInput,
  Todo,
  TodoPriority,
  TodoWithLabels,
  UpdateTodoInput,
} from '../../src/types/todo'
import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'
import { getUserProfiles, listOrganisationMembers } from './orgTeamStore'

export function isTodoStoreConfigured(): boolean {
  return isKbAdminConfigured()
}

function mapRow(row: Record<string, unknown>): Todo {
  return {
    id: String(row.id),
    text: String(row.text ?? ''),
    done: Boolean(row.done),
    dueDate: row.due_date ? String(row.due_date) : null,
    priority: row.priority ? (String(row.priority) as TodoPriority) : null,
    caseId: row.case_id ? String(row.case_id) : null,
    patientLabel: row.patient_label ? String(row.patient_label) : null,
    ownerUserId: String(row.owner_user_id),
    assignedBy: row.assigned_by ? String(row.assigned_by) : null,
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    assignedAt: row.assigned_at ? String(row.assigned_at) : null,
    orgId: row.organisation_id ? String(row.organisation_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

/**
 * Todos a user participates in within an org: entries they own, were assigned,
 * or assigned to others (so an assigner can track status).
 */
export async function listTodosForUser(
  organisationId: string,
  userId: string,
  filters: { caseId?: string | null } = {},
): Promise<Todo[]> {
  let query = getKbSupabaseAdmin()
    .from('todos')
    .select('*')
    .eq('organisation_id', organisationId)
    .or(`owner_user_id.eq.${userId},assigned_to.eq.${userId},assigned_by.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (filters.caseId) {
    query = query.eq('case_id', filters.caseId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function getTodo(organisationId: string, todoId: string): Promise<Todo | null> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('todos')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('id', todoId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapRow(data as Record<string, unknown>)
}

export async function createTodo(
  organisationId: string,
  ownerUserId: string,
  input: CreateTodoInput,
  assignment?: { assignedBy: string; assignedTo: string },
): Promise<Todo> {
  const now = new Date().toISOString()
  const { data, error } = await getKbSupabaseAdmin()
    .from('todos')
    .insert({
      organisation_id: organisationId,
      owner_user_id: ownerUserId,
      text: input.text.trim(),
      done: false,
      due_date: input.dueDate ?? null,
      priority: input.priority ?? null,
      case_id: input.caseId ?? null,
      patient_label: input.patientLabel ?? null,
      assigned_by: assignment?.assignedBy ?? null,
      assigned_to: assignment?.assignedTo ?? null,
      assigned_at: assignment ? now : null,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

export async function updateTodo(
  organisationId: string,
  todoId: string,
  patch: UpdateTodoInput,
): Promise<Todo> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.text !== undefined) updates.text = patch.text.trim()
  if (patch.done !== undefined) updates.done = patch.done
  if (patch.dueDate !== undefined) updates.due_date = patch.dueDate
  if (patch.priority !== undefined) updates.priority = patch.priority
  if (patch.caseId !== undefined) updates.case_id = patch.caseId
  if (patch.patientLabel !== undefined) updates.patient_label = patch.patientLabel

  const { data, error } = await getKbSupabaseAdmin()
    .from('todos')
    .update(updates)
    .eq('organisation_id', organisationId)
    .eq('id', todoId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

export async function deleteTodo(organisationId: string, todoId: string): Promise<void> {
  const { error } = await getKbSupabaseAdmin()
    .from('todos')
    .delete()
    .eq('organisation_id', organisationId)
    .eq('id', todoId)

  if (error) throw new Error(error.message)
}

/** Enrich assigned todos with display labels for assigner/assignee. */
export async function enrichTodos(todos: Todo[]): Promise<TodoWithLabels[]> {
  const userIds = new Set<string>()
  for (const todo of todos) {
    if (todo.assignedBy) userIds.add(todo.assignedBy)
    if (todo.assignedTo) userIds.add(todo.assignedTo)
  }
  if (userIds.size === 0) return todos

  const profiles = await getUserProfiles([...userIds])
  const label = (id: string | null | undefined): string | null => {
    if (!id) return null
    const profile = profiles[id]
    return profile?.displayName ?? profile?.email ?? null
  }

  return todos.map((todo) => ({
    ...todo,
    assignedByLabel: label(todo.assignedBy),
    assignedToLabel: label(todo.assignedTo),
  }))
}

export interface AssignableMemberRow {
  userId: string
  role: string
  displayName: string | null
  email: string | null
}

/** Active org members with resolved display profiles (assignment filtering done in route). */
export async function listOrgMemberProfiles(
  organisationId: string,
): Promise<AssignableMemberRow[]> {
  const members = await listOrganisationMembers(organisationId)
  const active = members.filter((m) => m.status === 'active')
  const profiles = await getUserProfiles(active.map((m) => m.userId))
  return active.map((member) => ({
    userId: member.userId,
    role: member.role,
    displayName: profiles[member.userId]?.displayName ?? null,
    email: profiles[member.userId]?.email ?? null,
  }))
}

export async function getMemberRole(
  organisationId: string,
  userId: string,
): Promise<string | null> {
  const members = await listOrganisationMembers(organisationId)
  return members.find((m) => m.userId === userId && m.status === 'active')?.role ?? null
}
