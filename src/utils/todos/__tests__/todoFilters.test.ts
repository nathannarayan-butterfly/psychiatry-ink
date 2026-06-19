import { describe, expect, it } from 'vitest'
import type { Todo } from '../../../types/todo'
import {
  countOpenTodos,
  dueDateKey,
  endOfWeek,
  filterTodos,
  isInWeek,
  isOverdue,
  isSameDay,
  sortTodos,
  startOfWeek,
  toDateKey,
} from '../todoFilters'

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    text: overrides.text ?? 'Task',
    done: overrides.done ?? false,
    dueDate: overrides.dueDate ?? null,
    priority: overrides.priority ?? null,
    caseId: overrides.caseId ?? null,
    patientLabel: overrides.patientLabel ?? null,
    ownerUserId: overrides.ownerUserId ?? 'u1',
    assignedBy: overrides.assignedBy ?? null,
    assignedTo: overrides.assignedTo ?? null,
    assignedAt: overrides.assignedAt ?? null,
    orgId: overrides.orgId ?? null,
    createdAt: overrides.createdAt ?? '2026-06-01T08:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-06-01T08:00:00.000Z',
  }
}

describe('todo date helpers', () => {
  it('produces local date keys without timezone drift', () => {
    const date = new Date(2026, 5, 19, 23, 30) // 19 Jun 2026 local
    expect(toDateKey(date)).toBe('2026-06-19')
  })

  it('parses both date-only and ISO due dates', () => {
    expect(dueDateKey('2026-06-19')).toBe('2026-06-19')
    expect(dueDateKey('2026-06-19T10:00:00.000Z')).not.toBeNull()
    expect(dueDateKey(null)).toBeNull()
    expect(dueDateKey('not-a-date')).toBeNull()
  })

  it('computes Monday-based week bounds', () => {
    const wednesday = new Date(2026, 5, 17) // Wed 17 Jun 2026
    expect(toDateKey(startOfWeek(wednesday))).toBe('2026-06-15') // Monday
    expect(toDateKey(endOfWeek(wednesday))).toBe('2026-06-21') // Sunday
  })

  it('isSameDay / isInWeek match the reference date', () => {
    const reference = new Date(2026, 5, 17)
    expect(isSameDay('2026-06-17', reference)).toBe(true)
    expect(isSameDay('2026-06-18', reference)).toBe(false)
    expect(isInWeek('2026-06-21', reference)).toBe(true)
    expect(isInWeek('2026-06-22', reference)).toBe(false)
  })

  it('flags overdue only for open todos', () => {
    const reference = new Date(2026, 5, 17)
    expect(isOverdue(makeTodo({ dueDate: '2026-06-10' }), reference)).toBe(true)
    expect(isOverdue(makeTodo({ dueDate: '2026-06-10', done: true }), reference)).toBe(false)
    expect(isOverdue(makeTodo({ dueDate: '2026-06-20' }), reference)).toBe(false)
    expect(isOverdue(makeTodo({ dueDate: null }), reference)).toBe(false)
  })
})

describe('filterTodos', () => {
  const reference = new Date(2026, 5, 17) // Wed 17 Jun 2026

  const todayDue = makeTodo({ id: 'today', dueDate: '2026-06-17' })
  const inWeekDue = makeTodo({ id: 'week', dueDate: '2026-06-19' })
  const overdue = makeTodo({ id: 'overdue', dueDate: '2026-06-01' })
  const future = makeTodo({ id: 'future', dueDate: '2026-07-15' })
  const undated = makeTodo({ id: 'undated', dueDate: null })
  const doneToday = makeTodo({ id: 'done', dueDate: '2026-06-17', done: true })

  const all = [todayDue, inWeekDue, overdue, future, undated, doneToday]

  it('day view: today + overdue + undated open, excludes done by default', () => {
    const ids = filterTodos(all, { view: 'day', reference }).map((t) => t.id)
    expect(ids).toContain('today')
    expect(ids).toContain('overdue')
    expect(ids).toContain('undated')
    expect(ids).not.toContain('future')
    expect(ids).not.toContain('done')
  })

  it('week view: items due this week + overdue + undated open', () => {
    const ids = filterTodos(all, { view: 'week', reference }).map((t) => t.id)
    expect(ids).toContain('today')
    expect(ids).toContain('week')
    expect(ids).toContain('overdue')
    expect(ids).toContain('undated')
    expect(ids).not.toContain('future')
  })

  it('open view: every not-done entry', () => {
    const ids = filterTodos(all, { view: 'open', reference }).map((t) => t.id)
    expect(ids).toContain('future')
    expect(ids).not.toContain('done')
  })

  it('all view: everything including done', () => {
    expect(filterTodos(all, { view: 'all', reference })).toHaveLength(all.length)
  })

  it('filters by patient case id', () => {
    const patientTodo = makeTodo({ id: 'p', caseId: 'case-1', dueDate: '2026-06-17' })
    const generalTodo = makeTodo({ id: 'g', caseId: null, dueDate: '2026-06-17' })
    const result = filterTodos([patientTodo, generalTodo], {
      view: 'day',
      reference,
      caseId: 'case-1',
    })
    expect(result.map((t) => t.id)).toEqual(['p'])
  })
})

describe('sortTodos / countOpenTodos', () => {
  it('orders open before done, then by due date and priority', () => {
    const done = makeTodo({ id: 'done', done: true, dueDate: '2026-06-01' })
    const earlier = makeTodo({ id: 'earlier', dueDate: '2026-06-10' })
    const later = makeTodo({ id: 'later', dueDate: '2026-06-20' })
    const undatedHigh = makeTodo({ id: 'undatedHigh', dueDate: null, priority: 'high' })

    const sorted = sortTodos([done, later, undatedHigh, earlier]).map((t) => t.id)
    expect(sorted[0]).toBe('earlier')
    expect(sorted[1]).toBe('later')
    expect(sorted[2]).toBe('undatedHigh')
    expect(sorted[sorted.length - 1]).toBe('done')
  })

  it('counts only open todos', () => {
    expect(
      countOpenTodos([makeTodo({ done: false }), makeTodo({ done: true }), makeTodo({ done: false })]),
    ).toBe(2)
  })
})
