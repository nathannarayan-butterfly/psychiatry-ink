import { describe, expect, it } from 'vitest'
import {
  extractVisiteFromEntryText,
  formatVisiteDisplayLabel,
  parseVisiteMitHeading,
} from '../visiteParsing'

describe('parseVisiteMitHeading', () => {
  it('parses doctor name from "Visite mit Dr. Narayan"', () => {
    expect(parseVisiteMitHeading('Visite mit Dr. Narayan')).toEqual({
      sectionLabel: 'Visite',
      subheading: 'Dr. Narayan',
    })
  })

  it('parses role from "Visite mit (Arzt)"', () => {
    expect(parseVisiteMitHeading('Visite mit (Arzt)')).toEqual({
      sectionLabel: 'Visite',
      subheading: 'Arzt',
    })
  })

  it('strips trailing colon and title prefixes', () => {
    expect(parseVisiteMitHeading('Visite mit Frau Paval:')).toEqual({
      sectionLabel: 'Visite',
      subheading: 'Frau Paval',
    })
    expect(parseVisiteMitHeading('Visite mit Herrn Narayan:')).toEqual({
      sectionLabel: 'Visite',
      subheading: 'Herrn Narayan',
    })
  })

  it('returns null for unrelated headings', () => {
    expect(parseVisiteMitHeading('Verlauf')).toBeNull()
    expect(parseVisiteMitHeading('Visite: Patient stabil.')).toBeNull()
  })
})

describe('extractVisiteFromEntryText', () => {
  it('removes the leading Visite line and keeps note body', () => {
    const input = ['', 'Visite mit Dr. Narayan', '', 'Patient stabil, kooperativ.'].join('\n')
    expect(extractVisiteFromEntryText(input)).toEqual({
      sectionLabel: 'Visite',
      subheading: 'Dr. Narayan',
      text: 'Patient stabil, kooperativ.',
    })
  })
})

describe('formatVisiteDisplayLabel', () => {
  it('joins section label and subheading for review UI', () => {
    expect(formatVisiteDisplayLabel({ sectionLabel: 'Visite', subheading: 'Dr. Narayan' })).toBe(
      'Visite — Dr. Narayan',
    )
  })
})
