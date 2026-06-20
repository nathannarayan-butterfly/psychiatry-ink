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
    // Sub-codes resolve to their specific disorder, not the F41 stem anchor.
    expect(matchDisorderToCodes('F41.0')?.id).toBe('panic_disorder')
    expect(matchDisorderToCodes('F41.1')?.id).toBe('generalized_anxiety_disorder')
  })

  it('matches crosswalk parent stems (e.g. F41) to stem-anchor disorders', () => {
    expect(matchDisorderToCodes('F41')?.id).toBe('other_anxiety_disorders_stem')
    expect(matchDisorderToCodes('F40')?.id).toBe('phobic_anxiety_disorders_stem')
    expect(matchDisorderToCodes('F19')?.id).toBe('multiple_substances_stem')
  })

  it('matches F19.2 multiple-substance dependence', () => {
    expect(matchDisorderToCodes('F19.2')?.id).toBe('multiple_substances_dependence')
    expect(matchDisorderToCodes(undefined, '6C4E.2')?.id).toBe('multiple_substances_dependence')
  })

  it('returns undefined for a diagnosis with no authored criteria set', () => {
    // Somatic codes (epilepsy, diabetes) lie entirely outside the criteria pack.
    expect(matchDisorderToCodes('G40.9')).toBeUndefined()
    expect(matchDisorderToCodes('E11.9')).toBeUndefined()
    expect(matchDisorderToCodes('')).toBeUndefined()
  })

  it('matches F99 unspecified mental disorder', () => {
    expect(matchDisorderToCodes('F99')?.id).toBe('unspecified_mental_disorder')
  })

  it('matches by ICD-11 code when ICD-10 is absent', () => {
    expect(matchDisorderToCodes('', '6A70')?.id).toBe('depressive_episode')
    expect(matchDisorderToCodes(undefined, '6C40.2')?.id).toBe('alcohol_dependence')
    expect(matchDisorderToCodes(undefined, '6A20')?.id).toBe('schizophrenia')
  })

  it('matches ICD-11 block headers to a block tree (6C40 → alcohol block)', () => {
    expect(matchDisorderToCodes(undefined, '6C40')?.id).toBe('alcohol_dependence')
    expect(matchDisorderToCodes(undefined, '6A00')?.id).toBe('intellectual_disability_mild')
  })

  it('matches ICD-11 bipolar type II codes via native ICD-11 criteria anchors (6A61)', () => {
    expect(matchDisorderToCodes(undefined, '6A61')?.id).toBe('bipolar_affective_disorder')
    expect(matchDisorderToCodes(undefined, '6A61.0')?.id).toBe('bipolar_affective_disorder')
  })

  it('matches ICD-11 residual block codes to the block tree (.Y / .0 / .7)', () => {
    expect(matchDisorderToCodes(undefined, '6C40.Y')?.id).toBe('alcohol_dependence')
    expect(matchDisorderToCodes(undefined, '6C40.0')?.id).toBe('alcohol_dependence')
    expect(matchDisorderToCodes(undefined, '6C43.Y')?.id).toBe('opioids_acute_intoxication')
  })

  it('does NOT cross-match ICD-11 sibling categories (6C40.1 vs 6C40.2)', () => {
    expect(matchDisorderToCodes(undefined, '6C40.1')?.id).toBe('alcohol_harmful_use')
    expect(matchDisorderToCodes(undefined, '6C40.1')?.id).not.toBe('alcohol_dependence')
    expect(matchDisorderToCodes(undefined, '6C43.1')?.id).toBe('opioids_harmful_use')
    expect(matchDisorderToCodes(undefined, '6C43.2')?.id).toBe('opioids_dependence')
  })

  it('matches new ICD-11 substance blocks (6C47–6C4G)', () => {
    expect(matchDisorderToCodes(undefined, '6C48.1')?.id).toBe('caffeine_harmful_use')
    expect(matchDisorderToCodes(undefined, '6C48.2')?.id).toBe('caffeine_dependence')
    expect(matchDisorderToCodes(undefined, '6C47.2')?.id).toBe('synthetic_cathinones_dependence')
    expect(matchDisorderToCodes(undefined, '6C4C.1')?.id).toBe('mdma_related_harmful_use')
    expect(matchDisorderToCodes(undefined, '6C4H.1Z')?.id).toBe('non_dependence_substance_abuse')
  })

  it('matches ICD-11 psychotic symptom specifiers (6A25.x)', () => {
    expect(matchDisorderToCodes(undefined, '6A25.0')?.id).toBe('psychotic_positive_symptoms')
    expect(matchDisorderToCodes(undefined, '6A25.5')?.id).toBe('psychotic_cognitive_symptoms')
  })

  it('does NOT match partial ICD-11 block prefixes (6C4)', () => {
    expect(matchDisorderToCodes(undefined, '6C4')).toBeUndefined()
  })

  it('matches bare ICD-10 category stems to block trees (F10, F60, F78)', () => {
    expect(matchDisorderToCodes('F10')?.id).toBe('alcohol_dependence')
    expect(matchDisorderToCodes('F11')?.id).toBe('opioids_acute_intoxication')
    expect(matchDisorderToCodes('F60')?.id).toBe('icd11_dimensional_personality_disorder')
    expect(matchDisorderToCodes('F78')?.id).toBe('intellectual_disability_mild')
    expect(matchDisorderToCodes('F79')?.id).toBe('intellectual_disability_mild')
  })

  it('matches F07 category stem to organic personality block tree', () => {
    expect(matchDisorderToCodes('F07')?.id).toBe('organic_personality_disorder')
  })

  it('still avoids F41 sibling cross-match after stem rules', () => {
    expect(matchDisorderToCodes('F41.1')?.id).not.toBe('panic_disorder')
    expect(matchDisorderToCodes('F41.0')?.id).toBe('panic_disorder')
    expect(matchDisorderToCodes('F41')?.id).toBe('other_anxiety_disorders_stem')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(matchDisorderToCodes(' f10.2 ')?.id).toBe('alcohol_dependence')
  })
})
