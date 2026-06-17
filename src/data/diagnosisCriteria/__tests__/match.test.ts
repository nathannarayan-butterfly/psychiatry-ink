import { describe, expect, it } from 'vitest'
import { matchDisorderToCodes } from '../match'

describe('matchDisorderToCodes', () => {
  it('matches an entered ICD-10 sub-code to its authored disorder', () => {
    expect(matchDisorderToCodes('F10.2')?.id).toBe('alcohol_dependence')
    expect(matchDisorderToCodes('F41.1')?.id).toBe('generalized_anxiety_disorder')
    expect(matchDisorderToCodes('F41.0')?.id).toBe('panic_disorder')
  })

  it('matches a stem-anchored disorder for any sub-code sharing the stem', () => {
    expect(matchDisorderToCodes('F32')?.id).toBe('depressive_episode')
    expect(matchDisorderToCodes('F32.1')?.id).toBe('depressive_episode')
    expect(matchDisorderToCodes('F32.9')?.id).toBe('depressive_episode')
    expect(matchDisorderToCodes('F20.0')?.id).toBe('schizophrenia')
  })

  it('does NOT cross-match neighbouring sub-codes (F41.0 vs F41.1)', () => {
    expect(matchDisorderToCodes('F41.1')?.id).not.toBe('panic_disorder')
    expect(matchDisorderToCodes('F41.0')?.id).not.toBe('generalized_anxiety_disorder')
    // A bare ambiguous stem F41 should not silently pick a specific sub-code disorder.
    expect(matchDisorderToCodes('F41')).toBeUndefined()
  })

  it('returns undefined for a diagnosis with no authored criteria set', () => {
    // F99 (unspecified mental disorder) is intentionally not operationalized, and
    // somatic codes (epilepsy, diabetes) lie entirely outside the criteria pack.
    expect(matchDisorderToCodes('F99')).toBeUndefined()
    expect(matchDisorderToCodes('G40.9')).toBeUndefined()
    expect(matchDisorderToCodes('E11.9')).toBeUndefined()
    expect(matchDisorderToCodes('')).toBeUndefined()
  })

  it('matches by ICD-11 code when ICD-10 is absent', () => {
    expect(matchDisorderToCodes('', '6A70')?.id).toBe('depressive_episode')
    expect(matchDisorderToCodes(undefined, '6C40.2')?.id).toBe('alcohol_dependence')
    expect(matchDisorderToCodes(undefined, '6A20')?.id).toBe('schizophrenia')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(matchDisorderToCodes(' f10.2 ')?.id).toBe('alcohol_dependence')
  })
})
