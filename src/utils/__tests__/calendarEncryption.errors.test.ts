import { describe, expect, it } from 'vitest'
import {
  formatCalendarCryptoError,
  isCalendarCryptoOperationError,
  OrgCalendarKeySetupError,
} from '../calendarEncryption'

describe('calendarEncryption crypto errors', () => {
  it('detects browser OperationError messages', () => {
    const error = new DOMException(
      'The operation failed for an operation-specific reason',
      'OperationError',
    )
    expect(isCalendarCryptoOperationError(error)).toBe(true)
  })

  it('maps unwrap crypto failures to actionable German text', () => {
    const error = new DOMException(
      'The operation failed for an operation-specific reason',
      'OperationError',
    )
    const message = formatCalendarCryptoError(error, 'unwrap')
    expect(message).toContain('Kalender-Verschlüsselungsschlüssel')
    expect(message).not.toContain('operation-specific reason')
  })

  it('maps decrypt crypto failures to actionable German text', () => {
    const error = new DOMException(
      'The operation failed for an operation-specific reason',
      'OperationError',
    )
    const message = formatCalendarCryptoError(error, 'decrypt')
    expect(message).toContain('Kalender-Einträge konnten nicht entschlüsselt werden')
    expect(message).not.toContain('operation-specific reason')
  })

  it('preserves OrgCalendarKeySetupError messages', () => {
    const error = new OrgCalendarKeySetupError('Bereits übersetzte Meldung')
    expect(formatCalendarCryptoError(error, 'unwrap')).toBe('Bereits übersetzte Meldung')
  })
})
