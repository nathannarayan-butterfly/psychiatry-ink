import type { DischargeSummaryRegion } from '../../types/dischargeSummary'

/** UK ↔ US spelling pairs applied to generated/fetched English text. */
const SPELLING_PAIRS: Array<{ uk: string; us: string }> = [
  { uk: 'behaviour', us: 'behavior' },
  { uk: 'behaviours', us: 'behaviors' },
  { uk: 'organised', us: 'organized' },
  { uk: 'organisation', us: 'organization' },
  { uk: 'organisations', us: 'organizations' },
  { uk: 'programme', us: 'program' },
  { uk: 'programmes', us: 'programs' },
  { uk: 'stabilisation', us: 'stabilization' },
  { uk: 'recognised', us: 'recognized' },
  { uk: 'recognise', us: 'recognize' },
  { uk: 'labour', us: 'labor' },
  { uk: 'centre', us: 'center' },
  { uk: 'centres', us: 'centers' },
  { uk: 'favour', us: 'favor' },
  { uk: 'favourable', us: 'favorable' },
  { uk: 'honour', us: 'honor' },
  { uk: 'colour', us: 'color' },
  { uk: 'paediatric', us: 'pediatric' },
  { uk: 'anaesthesia', us: 'anesthesia' },
  { uk: 'oestrogen', us: 'estrogen' },
  { uk: 'synthesise', us: 'synthesize' },
  { uk: 'specialised', us: 'specialized' },
  { uk: 'specialise', us: 'specialize' },
]

function replaceWord(text: string, from: string, to: string): string {
  const re = new RegExp(`\\b${from}\\b`, 'gi')
  return text.replace(re, (match) => {
    if (match === match.toUpperCase()) return to.toUpperCase()
    if (match[0] === match[0].toUpperCase()) return to[0].toUpperCase() + to.slice(1)
    return to
  })
}

export function applyRegionSpelling(text: string, region: DischargeSummaryRegion): string {
  if (!text.trim() || region === 'international') return text
  let result = text
  for (const pair of SPELLING_PAIRS) {
    if (region === 'US') {
      result = replaceWord(result, pair.uk, pair.us)
    } else if (region === 'UK') {
      result = replaceWord(result, pair.us, pair.uk)
    }
  }
  return result
}

export function regionLocale(region: DischargeSummaryRegion): string {
  if (region === 'UK') return 'en-GB'
  if (region === 'US') return 'en-US'
  return 'en'
}

export function regionLegalStatusLabel(region: DischargeSummaryRegion): string {
  if (region === 'UK') return 'Mental Health Act / section status (if applicable)'
  if (region === 'US') return 'Involuntary hold / commitment status (if applicable)'
  return 'Involuntary treatment / legal status (if applicable)'
}

export function regionDischargeDestinationLabel(region: DischargeSummaryRegion): string {
  if (region === 'UK') return 'Discharge destination'
  return 'Discharge disposition'
}
