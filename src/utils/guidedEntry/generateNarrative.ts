import type { UiLanguage } from '../../types/settings'
import type {
  GuidedEntryFieldValues,
  GuidedEntryGenerateResult,
  GuidedEntrySchema,
} from '../../types/guidedEntry'
import { defaultPsychopathSections } from '../../data/psychopathSections'
import {
  psychopathChecklistItemTranslations,
  translatePsychopathSectionDescription,
} from '../../data/psychopathChecklistTranslations'
import { gePpbStepTitleKey } from '../../data/guidedEntry/psychopathGuidedLabels'
import { translateUi, type UiTranslationKey } from '../../data/uiTranslations'
import { evaluateCondition } from '../documentTemplate/evaluateCondition'
import {
  generateNeuroBefundNarrative,
  generateSomaticBefundNarrative,
} from '../anamnese/befundNarrative'
import { fieldValuesToAnswers } from './stepEngine'

function formatFieldValue(
  schema: GuidedEntrySchema,
  fieldId: string,
  values: GuidedEntryFieldValues,
  language: UiLanguage,
): string {
  const field = schema.fields.find((f) => f.id === fieldId)
  const raw = values[fieldId]
  if (raw === undefined || raw === null) return ''

  if (typeof raw === 'boolean') {
    return raw
      ? translateUi(language, 'guidedEntryYes')
      : translateUi(language, 'guidedEntryNo')
  }

  if (Array.isArray(raw)) {
    if (!field?.options?.length) return raw.join(', ')
    return raw
      .map((id) => {
        const clinicalText = psychopathChecklistItemTranslations[id]?.text[language]
        if (clinicalText) return clinicalText
        const opt = field.options?.find((o) => o.id === id)
        return opt ? translateUi(language, opt.labelKey as UiTranslationKey) : id
      })
      .join(', ')
  }

  if (field?.type === 'select' || field?.type === 'radio_group') {
    const opt = field.options?.find((o) => o.id === raw)
    if (opt) return translateUi(language, opt.labelKey as UiTranslationKey)
  }

  return String(raw).trim()
}

function fieldHasContent(values: GuidedEntryFieldValues, fieldId: string): boolean {
  const raw = values[fieldId]
  if (typeof raw === 'boolean') return true
  if (Array.isArray(raw)) return raw.length > 0
  return String(raw ?? '').trim().length > 0
}

function generatePsychopathFindingNarrative(
  values: GuidedEntryFieldValues,
  language: UiLanguage,
): string {
  const blocks: string[] = []
  const examDate = String(values.examDate ?? '').trim()
  if (examDate) {
    blocks.push(
      `${translateUi(language, 'guidedEntryGenPpbExamDate')}: ${examDate}`,
    )
  }

  for (const section of defaultPsychopathSections) {
    const checklistFieldId = `ppb-${section.id}`
    const notesFieldId = `ppb-notes-${section.id}`
    const selected = values[checklistFieldId]
    const notes = String(values[notesFieldId] ?? '').trim()

    const selectedTexts = Array.isArray(selected)
      ? selected
          .map((id) => psychopathChecklistItemTranslations[id]?.text[language] ?? String(id))
          .filter(Boolean)
      : []

    if (selectedTexts.length === 0 && !notes) continue

    const sectionLabel = translateUi(language, gePpbStepTitleKey(section.id) as UiTranslationKey)
    const localizedDescription = translatePsychopathSectionDescription(
      section.id,
      section.description,
      language,
    )

    if (selectedTexts.length > 0) {
      blocks.push(`${sectionLabel}: ${selectedTexts.join(', ')}`)
    } else if (localizedDescription) {
      blocks.push(sectionLabel)
    }

    if (notes) {
      blocks.push(notes)
    }
  }

  return blocks.join('\n\n').trim()
}

/** Vital signs as readable, localized `Label: Wert` lines (Item 5). */
function generateVitalsNarrative(
  schema: GuidedEntrySchema,
  values: GuidedEntryFieldValues,
  language: UiLanguage,
): string {
  const lines: string[] = []
  for (const field of schema.fields) {
    if (field.id === 'examDate') continue
    if (!fieldHasContent(values, field.id)) continue
    const label = translateUi(language, field.labelKey as UiTranslationKey)
    const value = formatFieldValue(schema, field.id, values, language)
    if (!value) continue
    lines.push(`${label}: ${value}`)
  }
  if (lines.length === 0) return ''
  const heading = translateUi(language, 'guidedEntryGenSomaticVitals')
  return `${heading}\n${lines.join('\n')}`.trim()
}

export function generateGuidedNarrative(
  schema: GuidedEntrySchema,
  values: GuidedEntryFieldValues,
  language: UiLanguage,
): GuidedEntryGenerateResult {
  if (schema.itemType === 'vitalwerte-quick') {
    const text = generateVitalsNarrative(schema, values, language)
    return { text, answers: fieldValuesToAnswers(schema, values) }
  }

  if (schema.itemType === 'psychopath-finding') {
    const text = generatePsychopathFindingNarrative(values, language)
    return { text, answers: fieldValuesToAnswers(schema, values) }
  }

  if (schema.itemType === 'anamnese-somatic-befund') {
    const text = generateSomaticBefundNarrative(values)
    return { text, answers: fieldValuesToAnswers(schema, values) }
  }

  if (schema.itemType === 'anamnese-neuro-befund') {
    const text = generateNeuroBefundNarrative(values)
    return { text, answers: fieldValuesToAnswers(schema, values) }
  }

  const blocks: string[] = []

  for (const segment of schema.generation) {
    if (segment.showWhen && !evaluateCondition(segment.showWhen, values)) continue

    const lines = segment.lines
      .map((line) => {
        const fieldIds = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
        if (fieldIds.length > 0 && !fieldIds.some((id) => fieldHasContent(values, id))) {
          return ''
        }
        return line.replace(/\{(\w+)\}/g, (_, fieldId: string) =>
          formatFieldValue(schema, fieldId, values, language),
        )
      })
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) continue

    if (segment.headingKey) {
      blocks.push(`${translateUi(language, segment.headingKey as UiTranslationKey)}\n${lines.join('\n')}`)
    } else {
      blocks.push(lines.join('\n'))
    }
  }

  const text = blocks.join('\n\n').trim()
  const answers = fieldValuesToAnswers(schema, values)

  return { text, answers }
}
