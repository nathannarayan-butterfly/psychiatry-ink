import type { TemplateCondition } from '../../types/documentTemplate'

export function evaluateCondition(
  condition: TemplateCondition | undefined,
  fieldValues: Record<string, string | boolean | string[]>,
): boolean {
  if (!condition) return true

  const raw = fieldValues[condition.fieldId]
  const { operator, value } = condition

  switch (operator) {
    case 'checked':
      return raw === true
    case 'unchecked':
      return raw !== true
    case 'equals':
      if (typeof raw === 'boolean') return raw === (value === true || value === 'true')
      if (Array.isArray(raw)) return raw.includes(String(value ?? ''))
      return String(raw ?? '') === String(value ?? '')
    case 'not_equals':
      if (typeof raw === 'boolean') return raw !== (value === true || value === 'true')
      if (Array.isArray(raw)) return !raw.includes(String(value ?? ''))
      return String(raw ?? '') !== String(value ?? '')
    case 'contains': {
      const needle = String(value ?? '').toLowerCase()
      if (!needle) return false
      if (typeof raw === 'string') return raw.toLowerCase().includes(needle)
      if (Array.isArray(raw)) return raw.some((v) => v.toLowerCase().includes(needle))
      return false
    }
    case 'in': {
      const options = Array.isArray(value) ? value.map(String) : [String(value ?? '')]
      if (Array.isArray(raw)) return raw.some((v) => options.includes(String(v)))
      return options.includes(String(raw ?? ''))
    }
    default:
      return true
  }
}
