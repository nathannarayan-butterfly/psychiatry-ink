/**
 * English clinical copy for the synthetic demo patient.
 * Backward-compatible re-exports — prefer getDemoContent('en') for new code.
 */

export { demoStringsEn } from './demoContent/strings/en'
export { DEMO_ADMISSION_DATE as DEMO_ADMISSION } from './demoContent/types'
export { getDemoContent } from './demoContent'
import { getDemoContent } from './demoContent'

const en = getDemoContent('en')

export function buildDemoAufnahmeSections(): Record<string, string> {
  return en.buildAufnahmeSections()
}

export function buildDemoVerlaufFeed() {
  return en.buildVerlaufFeed()
}

export function demoLabGraphNote(parameter: string, drawIndex: number): string {
  return en.labGraphNote(parameter, drawIndex)
}

export function demoLaborBefundLabel(kind: 'admission' | 'followup' | 'anthro' | 'glucose'): string {
  return en.laborBefundLabel(kind)
}

export function demoLaborBefundHeader(date: string, label: string): string {
  return en.laborBefundHeader(date, label)
}

export function demoLabGraphTitle(): string {
  return en.labGraphTitle()
}

export function demoTimelineTitle(): string {
  return en.timelineTitle()
}

export function demoMedMarkerNote(kind: 'increased' | 'started'): string {
  return en.medMarkerNote(kind)
}
