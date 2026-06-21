/**
 * Verlauf → central To-do bridge.
 *
 * A `todo` annotation in Gesamtes Verlauf is mirrored into the central to-do
 * list (the same store the TodoPage / dashboard read) whenever it carries a due
 * date. The annotation keeps the mirrored entry's id (`linkedTodoId`) so the two
 * copies stay in sync on edit and delete.
 *
 * Provenance: the mirrored entry is linked to the patient case (caseId +
 * patientLabel) and its text quotes the anchored chart snippet, making it clear
 * the task originated from the Verlauf.
 */

import type { TodoPriority } from '../../types/todo'
import {
  createTodoApi,
  deleteTodoApi,
  updateTodoApi,
  type TodoStorageScope,
} from '../../services/todoApi'

export interface CentralTodoFields {
  /** The task description typed by the clinician. */
  todoText: string
  /** The anchored chart text the todo refers to (used for provenance context). */
  rangeText: string
  priority: TodoPriority
  dueDate: string | null
  done: boolean
}

export interface VerlaufTodoCentralContext {
  caseId: string | null
  patientLabel: string | null
}

/**
 * Human-readable text for the mirrored central entry. Includes the anchored
 * chart snippet so the origin (Verlauf) is obvious in the central to-do list.
 * Deterministic in `(todoText, rangeText)` so updates stay idempotent.
 */
export function buildCentralTodoText(todoText: string, rangeText: string): string {
  const task = todoText.trim()
  const snippet = rangeText.trim()
  if (!snippet) return task
  return `${task} — „${snippet}“`
}

export async function createCentralTodo(
  scope: TodoStorageScope,
  fields: CentralTodoFields,
  ctx: VerlaufTodoCentralContext,
): Promise<string> {
  const todo = await createTodoApi(scope, {
    text: buildCentralTodoText(fields.todoText, fields.rangeText),
    dueDate: fields.dueDate,
    priority: fields.priority,
    caseId: ctx.caseId,
    patientLabel: ctx.caseId ? ctx.patientLabel : null,
  })
  return todo.id
}

export async function updateCentralTodo(
  scope: TodoStorageScope,
  todoId: string,
  fields: CentralTodoFields,
): Promise<void> {
  await updateTodoApi(scope, todoId, {
    text: buildCentralTodoText(fields.todoText, fields.rangeText),
    dueDate: fields.dueDate,
    priority: fields.priority,
  })
}

export async function deleteCentralTodo(
  scope: TodoStorageScope,
  todoId: string,
): Promise<void> {
  await deleteTodoApi(scope, todoId)
}

export async function setCentralTodoDone(
  scope: TodoStorageScope,
  todoId: string,
  done: boolean,
): Promise<void> {
  await updateTodoApi(scope, todoId, { done })
}

/**
 * Reconciles the central mirror with the annotation's current state and returns
 * the `linkedTodoId` to persist back on the annotation:
 *
 * - due date present + already linked → update the mirror (recreate if it was
 *   removed remotely), keep the id
 * - due date present + not linked → create the mirror, return its id
 * - no due date → drop the mirror if one exists, return null
 */
export async function reconcileCentralTodoLink(params: {
  scope: TodoStorageScope
  ctx: VerlaufTodoCentralContext
  linkedTodoId: string | null
  fields: CentralTodoFields
}): Promise<string | null> {
  const { scope, ctx, linkedTodoId, fields } = params
  const hasDate = Boolean(fields.dueDate)

  if (hasDate) {
    if (linkedTodoId) {
      try {
        await updateCentralTodo(scope, linkedTodoId, fields)
        return linkedTodoId
      } catch {
        // The mirror was removed elsewhere — recreate it.
        return await createCentralTodo(scope, fields, ctx)
      }
    }
    return await createCentralTodo(scope, fields, ctx)
  }

  if (linkedTodoId) {
    try {
      await deleteCentralTodo(scope, linkedTodoId)
    } catch {
      // Already gone — nothing to clean up.
    }
  }
  return null
}
