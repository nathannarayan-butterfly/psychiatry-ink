import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildCentralTodoText,
  reconcileCentralTodoLink,
  type CentralTodoFields,
  type VerlaufTodoCentralContext,
} from '../verlaufTodoSync'
import { listLocalTodos, type TodoStorageScope } from '../../todos/todoStore'

const scope: TodoStorageScope = { userId: 'verlauf-user' }
const ctx: VerlaufTodoCentralContext = { caseId: 'case-7', patientLabel: 'Mustermann, Max' }

function fields(overrides: Partial<CentralTodoFields> = {}): CentralTodoFields {
  return {
    todoText: 'Labor kontrollieren',
    rangeText: 'Natrium grenzwertig',
    priority: 'high',
    dueDate: '2026-07-01',
    done: false,
    ...overrides,
  }
}

describe('verlaufTodoSync', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('quotes the anchored chart snippet for provenance', () => {
    expect(buildCentralTodoText('Labor kontrollieren', 'Natrium grenzwertig')).toBe(
      'Labor kontrollieren — „Natrium grenzwertig“',
    )
    expect(buildCentralTodoText('Nur Aufgabe', '')).toBe('Nur Aufgabe')
  })

  it('creates a central to-do when a due date is set and none is linked', async () => {
    const linkedId = await reconcileCentralTodoLink({
      scope,
      ctx,
      linkedTodoId: null,
      fields: fields(),
    })
    expect(linkedId).toBeTruthy()

    const todos = listLocalTodos(scope)
    expect(todos).toHaveLength(1)
    expect(todos[0].id).toBe(linkedId)
    expect(todos[0].dueDate).toBe('2026-07-01')
    expect(todos[0].priority).toBe('high')
    expect(todos[0].caseId).toBe('case-7')
    expect(todos[0].patientLabel).toBe('Mustermann, Max')
    expect(todos[0].text).toContain('Labor kontrollieren')
    expect(todos[0].text).toContain('Natrium grenzwertig')
  })

  it('updates the linked central to-do in place', async () => {
    const linkedId = await reconcileCentralTodoLink({
      scope,
      ctx,
      linkedTodoId: null,
      fields: fields(),
    })

    const sameId = await reconcileCentralTodoLink({
      scope,
      ctx,
      linkedTodoId: linkedId,
      fields: fields({ todoText: 'Natrium erneut messen', priority: 'low', dueDate: '2026-07-05' }),
    })

    expect(sameId).toBe(linkedId)
    const todos = listLocalTodos(scope)
    expect(todos).toHaveLength(1)
    expect(todos[0].priority).toBe('low')
    expect(todos[0].dueDate).toBe('2026-07-05')
    expect(todos[0].text).toContain('Natrium erneut messen')
  })

  it('removes the central mirror when the due date is cleared', async () => {
    const linkedId = await reconcileCentralTodoLink({
      scope,
      ctx,
      linkedTodoId: null,
      fields: fields(),
    })
    expect(listLocalTodos(scope)).toHaveLength(1)

    const cleared = await reconcileCentralTodoLink({
      scope,
      ctx,
      linkedTodoId: linkedId,
      fields: fields({ dueDate: null }),
    })

    expect(cleared).toBeNull()
    expect(listLocalTodos(scope)).toHaveLength(0)
  })

  it('does not create a mirror when there is no due date', async () => {
    const linkedId = await reconcileCentralTodoLink({
      scope,
      ctx,
      linkedTodoId: null,
      fields: fields({ dueDate: null }),
    })
    expect(linkedId).toBeNull()
    expect(listLocalTodos(scope)).toHaveLength(0)
  })

  it('links a general (no-case) to-do when there is no patient', async () => {
    const linkedId = await reconcileCentralTodoLink({
      scope,
      ctx: { caseId: null, patientLabel: null },
      linkedTodoId: null,
      fields: fields(),
    })
    const todos = listLocalTodos(scope)
    expect(todos).toHaveLength(1)
    expect(todos[0].id).toBe(linkedId)
    expect(todos[0].caseId).toBeNull()
    expect(todos[0].patientLabel).toBeNull()
  })
})
