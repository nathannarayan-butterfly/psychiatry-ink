import type { Todo, TodoWithLabels } from '../../types/todo'

export interface TodoPrintLabels {
  title: string
  generated: string
  done: string
  open: string
  dueDate: string
  priority: string
  patient: string
  assignedTo: string
  assignedBy: string
  noDueDate: string
  empty: string
  priorityLow: string
  priorityNormal: string
  priorityHigh: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(dueDate: string | null | undefined, locale: string): string {
  if (!dueDate) return ''
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? `${dueDate}T00:00:00` : dueDate)
  if (Number.isNaN(parsed.getTime())) return dueDate
  return parsed.toLocaleDateString(locale)
}

function priorityLabel(todo: Todo, labels: TodoPrintLabels): string {
  switch (todo.priority) {
    case 'high':
      return labels.priorityHigh
    case 'low':
      return labels.priorityLow
    case 'normal':
      return labels.priorityNormal
    default:
      return ''
  }
}

function row(todo: TodoWithLabels, labels: TodoPrintLabels, locale: string): string {
  const meta: string[] = []
  const due = formatDate(todo.dueDate, locale)
  if (due) meta.push(`${escapeHtml(labels.dueDate)}: ${escapeHtml(due)}`)
  const prio = priorityLabel(todo, labels)
  if (prio) meta.push(`${escapeHtml(labels.priority)}: ${escapeHtml(prio)}`)
  if (todo.patientLabel) meta.push(`${escapeHtml(labels.patient)}: ${escapeHtml(todo.patientLabel)}`)
  if (todo.assignedToLabel) {
    meta.push(`${escapeHtml(labels.assignedTo)}: ${escapeHtml(todo.assignedToLabel)}`)
  }
  if (todo.assignedByLabel) {
    meta.push(`${escapeHtml(labels.assignedBy)}: ${escapeHtml(todo.assignedByLabel)}`)
  }

  const checkbox = todo.done ? '☑' : '☐'
  const statusClass = todo.done ? 'todo-print__row--done' : ''
  return `<li class="todo-print__row ${statusClass}">
  <span class="todo-print__check" aria-hidden="true">${checkbox}</span>
  <span class="todo-print__text">${escapeHtml(todo.text)}${
    meta.length ? `<span class="todo-print__meta">${meta.join(' · ')}</span>` : ''
  }</span>
</li>`
}

export function buildTodosPrintHtml(
  todos: TodoWithLabels[],
  labels: TodoPrintLabels,
  options?: { locale?: string },
): string {
  const locale = options?.locale ?? 'de-DE'
  const body =
    todos.length === 0
      ? `<p class="todo-print__empty">${escapeHtml(labels.empty)}</p>`
      : `<ul class="todo-print__list">${todos.map((t) => row(t, labels, locale)).join('')}</ul>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(labels.title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 1.2cm; font-size: 11pt; line-height: 1.45; }
  h1 { font-size: 16pt; font-weight: 600; margin: 0 0 0.25rem; }
  .todo-print__sub { font-size: 9pt; color: #555; margin-bottom: 1rem; }
  ul.todo-print__list { list-style: none; margin: 0; padding: 0; }
  .todo-print__row { display: flex; gap: 0.5rem; align-items: baseline; padding: 0.35rem 0; border-bottom: 1px solid #e2e2dc; }
  .todo-print__check { font-size: 13pt; }
  .todo-print__text { display: flex; flex-direction: column; }
  .todo-print__meta { font-size: 8.5pt; color: #666; margin-top: 0.1rem; }
  .todo-print__row--done .todo-print__text { text-decoration: line-through; color: #888; }
  .todo-print__empty { color: #777; font-style: italic; }
  footer { margin-top: 1.5rem; font-size: 8pt; color: #777; }
  @media print { body { margin: 0.8cm; } }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(labels.title)}</h1>
  <p class="todo-print__sub">${escapeHtml(labels.generated)}: ${escapeHtml(new Date().toLocaleString(locale))}</p>
</header>
${body}
<footer>${escapeHtml(labels.generated)}: ${escapeHtml(new Date().toLocaleString(locale))}</footer>
</body>
</html>`
}

export function printTodos(
  todos: TodoWithLabels[],
  labels: TodoPrintLabels,
  options?: { locale?: string },
): void {
  if (typeof window === 'undefined') return
  const html = buildTodosPrintHtml(todos, labels, options)
  const printWindow = window.open('', '_blank', 'noopener,width=900,height=1000')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 250)
}
