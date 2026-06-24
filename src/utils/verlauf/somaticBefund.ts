import type { UiLanguage } from '../../types/settings'
import type { GuidedEntryAnswer, GuidedEntryFieldValues } from '../../types/guidedEntry'
import type { VerlaufFeedEntry } from '../verlaufFeed'
import {
  SOMATIC_BEFUND_PAGE_TYPE,
  SOMATIC_EXAM_SECTION_IDS,
  type SomaticBefundPayload,
  type SomaticExamFinding,
  type SomaticExamSection,
  type SomaticExamSectionId,
} from '../../types/somaticBefund'
import { translateUi, type UiTranslationKey } from '../../data/uiTranslations'

function readString(values: GuidedEntryFieldValues, fieldId: string): string {
  const raw = values[fieldId]
  if (raw === undefined || raw === null) return ''
  if (typeof raw === 'boolean' || Array.isArray(raw)) return ''
  return String(raw).trim()
}

function readFinding(values: GuidedEntryFieldValues, fieldId: string): SomaticExamFinding | '' {
  const raw = readString(values, fieldId)
  if (raw === 'normal' || raw === 'pathological' || raw === 'not_examined') return raw
  return ''
}

function readSection(values: GuidedEntryFieldValues, sectionId: SomaticExamSectionId): SomaticExamSection {
  const finding = readFinding(values, `${sectionId}Finding`)
  const note = readString(values, `${sectionId}Note`)
  return {
    finding,
    ...(note ? { note } : {}),
  }
}

export function valuesFromGuidedAnswers(answers: GuidedEntryAnswer[]): GuidedEntryFieldValues {
  const values: GuidedEntryFieldValues = {}
  for (const answer of answers) values[answer.fieldId] = answer.value
  return values
}

export function buildSomaticBefundPayload(values: GuidedEntryFieldValues): SomaticBefundPayload {
  const examDate = readString(values, 'examDate') || new Date().toISOString().slice(0, 10)
  const generalCondition = readString(values, 'generalCondition')
  const supplement = readString(values, 'supplement')

  const vitals = {
    ...(readString(values, 'bloodPressure')
      ? { bloodPressure: readString(values, 'bloodPressure') }
      : {}),
    ...(readString(values, 'pulse') ? { pulse: readString(values, 'pulse') } : {}),
    ...(readString(values, 'temperature')
      ? { temperature: readString(values, 'temperature') }
      : {}),
    ...(readString(values, 'spo2') ? { spo2: readString(values, 'spo2') } : {}),
    ...(readString(values, 'height') ? { height: readString(values, 'height') } : {}),
    ...(readString(values, 'weight') ? { weight: readString(values, 'weight') } : {}),
  }

  return {
    examDate,
    ...(generalCondition ? { generalCondition } : {}),
    vitals,
    heart: readSection(values, 'heart'),
    lungs: readSection(values, 'lungs'),
    abdomen: readSection(values, 'abdomen'),
    extremities: readSection(values, 'extremities'),
    skin: readSection(values, 'skin'),
    neurology: readSection(values, 'neurology'),
    ...(supplement ? { supplement } : {}),
  }
}

export function isSomaticBefundEntry(entry: VerlaufFeedEntry): boolean {
  return entry.pageType === SOMATIC_BEFUND_PAGE_TYPE && Boolean(entry.somaticBefund)
}

export function translateSomaticFinding(
  language: UiLanguage,
  finding: SomaticExamFinding | '',
): string {
  if (!finding) return ''
  const key: Record<SomaticExamFinding, UiTranslationKey> = {
    normal: 'guidedEntrySomaticFindingNormal',
    pathological: 'guidedEntrySomaticFindingPathological',
    not_examined: 'guidedEntrySomaticFindingNotExamined',
  }
  return translateUi(language, key[finding])
}

export function translateSomaticGeneralCondition(
  language: UiLanguage,
  value: string | undefined,
): string {
  if (!value) return ''
  const keyMap: Record<string, UiTranslationKey> = {
    unremarkable: 'guidedEntrySomaticGeneralUnremarkable',
    reduced: 'guidedEntrySomaticGeneralReduced',
    severely_reduced: 'guidedEntrySomaticGeneralSeverelyReduced',
    agitated: 'guidedEntrySomaticGeneralAgitated',
  }
  const key = keyMap[value]
  return key ? translateUi(language, key) : value
}

export interface SomaticBefundSummaryRow {
  labelKey: UiTranslationKey
  value: string
}

export function buildSomaticBefundSummaryRows(
  payload: SomaticBefundPayload,
  language: UiLanguage,
): SomaticBefundSummaryRow[] {
  const rows: SomaticBefundSummaryRow[] = []

  const general = translateSomaticGeneralCondition(language, payload.generalCondition)
  if (general) {
    rows.push({ labelKey: 'guidedEntryGenSomaticGeneral', value: general })
  }

  const vitalParts: string[] = []
  if (payload.vitals.bloodPressure) {
    vitalParts.push(
      `${translateUi(language, 'guidedEntryFieldSomaticBloodPressure')}: ${payload.vitals.bloodPressure}`,
    )
  }
  if (payload.vitals.pulse) {
    vitalParts.push(
      `${translateUi(language, 'guidedEntryFieldSomaticPulse')}: ${payload.vitals.pulse}`,
    )
  }
  if (payload.vitals.temperature) {
    vitalParts.push(
      `${translateUi(language, 'guidedEntryFieldSomaticTemperature')}: ${payload.vitals.temperature}`,
    )
  }
  if (payload.vitals.spo2) {
    vitalParts.push(
      `${translateUi(language, 'guidedEntryFieldSomaticSpo2')}: ${payload.vitals.spo2}`,
    )
  }
  if (payload.vitals.height) {
    vitalParts.push(
      `${translateUi(language, 'guidedEntryFieldSomaticHeight')}: ${payload.vitals.height}`,
    )
  }
  if (payload.vitals.weight) {
    vitalParts.push(
      `${translateUi(language, 'guidedEntryFieldSomaticWeight')}: ${payload.vitals.weight}`,
    )
  }
  if (vitalParts.length > 0) {
    rows.push({ labelKey: 'guidedEntryGenSomaticVitals', value: vitalParts.join(' · ') })
  }

  const sectionLabelKeys: Record<SomaticExamSectionId, UiTranslationKey> = {
    heart: 'guidedEntryFieldSomaticHeart',
    lungs: 'guidedEntryFieldSomaticLungs',
    abdomen: 'guidedEntryFieldSomaticAbdomen',
    extremities: 'guidedEntryFieldSomaticExtremities',
    skin: 'guidedEntryFieldSomaticSkin',
    neurology: 'guidedEntryFieldSomaticNeurology',
  }

  for (const sectionId of SOMATIC_EXAM_SECTION_IDS) {
    const section = payload[sectionId]
    if (!section.finding && !section.note) continue
    const findingLabel = translateSomaticFinding(language, section.finding)
    const value = [findingLabel, section.note].filter(Boolean).join(' — ')
    rows.push({ labelKey: sectionLabelKeys[sectionId], value })
  }

  if (payload.supplement?.trim()) {
    rows.push({
      labelKey: 'guidedEntryGenSomaticSupplement',
      value: payload.supplement.trim(),
    })
  }

  return rows
}
