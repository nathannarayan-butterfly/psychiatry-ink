/** To-Do / Aufgaben domain types. */

export type TodoPriority = 'low' | 'normal' | 'high'

/**
 * A single to-do entry.
 *
 * Personal entries are user-scoped (localStorage in single_use, or Supabase
 * owner-only rows in small_praxis). Assigned entries always live server-side so
 * the assignee sees them on another device.
 */
export interface Todo {
  id: string
  text: string
  done: boolean
  /** ISO date (YYYY-MM-DD) — optional due date. */
  dueDate?: string | null
  priority?: TodoPriority | null
  /** Linked patient case id (real caseId) — null/absent = general to-do. */
  caseId?: string | null
  /** Human-readable patient label for display (no stored PHI beyond this label). */
  patientLabel?: string | null
  ownerUserId: string
  /** Assigning user id (higher-order org member) — null when self-created. */
  assignedBy?: string | null
  /** Assignee user id — null when not assigned. */
  assignedTo?: string | null
  assignedAt?: string | null
  orgId?: string | null
  createdAt: string
  updatedAt: string
}

/** Display labels resolved for assigner/assignee (server-enriched, optional). */
export interface TodoActorLabels {
  assignedByLabel?: string | null
  assignedToLabel?: string | null
}

/** Todo plus optional resolved actor labels for assigned entries. */
export type TodoWithLabels = Todo & TodoActorLabels

export interface CreateTodoInput {
  text: string
  dueDate?: string | null
  priority?: TodoPriority | null
  caseId?: string | null
  patientLabel?: string | null
  /** Assign to another org member (requires hierarchy permission). */
  assignedTo?: string | null
}

export interface UpdateTodoInput {
  text?: string
  done?: boolean
  dueDate?: string | null
  priority?: TodoPriority | null
  caseId?: string | null
  patientLabel?: string | null
}

/** Dashboard view grouping. */
export type TodoView = 'day' | 'week' | 'open' | 'all'

/** Member the current user is allowed to assign tasks to. */
export interface AssignableMember {
  userId: string
  role: string
  displayName: string | null
  email: string | null
}
