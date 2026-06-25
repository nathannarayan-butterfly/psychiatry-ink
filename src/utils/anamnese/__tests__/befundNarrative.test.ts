import { describe, expect, it } from 'vitest'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import {
  generateNeuroBefundNarrative,
  generateSomaticBefundNarrative,
} from '../befundNarrative'
import {
  metadataForGeneratedContent,
  metadataForManualEdit,
} from '../befundMetadata'
import type { GuidedEntryFieldValues } from '../../../types/guidedEntry'

describe('befundNarrative', () => {
  it('generates neutral somatic prose when fields are normal', () => {
    const values: GuidedEntryFieldValues = {
      generalCondition: 'normal',
      nutritionalState: 'normal',
      currentComplaints: 'no',
      vitals: 'normal',
      heartCirculation: 'normal',
      lungs: 'normal',
      abdomen: 'normal',
    }
    const text = generateSomaticBefundNarrative(values)
    expect(text).toContain('Somatisch zeigte sich')
    expect(text).toContain('stabilem Allgemeinzustand')
    expect(text).toContain('Herz')
    expect(text).toContain('Lunge')
  })

  it('states pathological somatic findings explicitly', () => {
    const values: GuidedEntryFieldValues = {
      generalCondition: 'abnormal',
      generalConditionNote: 'Fieber 39,2 °C',
      lungs: 'abnormal',
      lungsNote: 'Rasselgeräusche basal',
    }
    const text = generateSomaticBefundNarrative(values)
    expect(text).toContain('auffälligem Allgemeinzustand')
    expect(text).toContain('Fieber 39,2 °C')
    expect(text).toContain('Lunge auffällig')
    expect(text).toContain('Rasselgeräusche basal')
  })

  it('generates neutral neuro prose when systems are normal', () => {
    const values: GuidedEntryFieldValues = {
      consciousnessOrientation: 'normal',
      speech: 'normal',
      motor: 'normal',
      sensitivity: 'normal',
      coordination: 'normal',
      gait: 'normal',
      cranialNerves: 'normal',
      reflexes: 'normal',
      focalDeficits: 'no',
    }
    const text = generateNeuroBefundNarrative(values)
    expect(text).toContain('Neurologisch')
    expect(text).toContain('keine fokalneurologischen Defizite')
    expect(text).toContain('unauffällig')
  })

  it('states extrapyramidal and focal neuro findings explicitly', () => {
    const values: GuidedEntryFieldValues = {
      motor: 'normal',
      epiMotorFindings: ['tremor', 'akathisia'],
      focalDeficits: 'yes',
      focalDeficitsNote: 'Schwäche re. Arm',
    }
    const text = generateNeuroBefundNarrative(values)
    expect(text).toContain('Tremor')
    expect(text).toContain('Akathisie')
    expect(text).toContain('Fokalneurologische Defizite')
    expect(text).toContain('Schwäche re. Arm')
  })
})

describe('befundMetadata', () => {
  it('round-trips generated metadata with structured answers', () => {
    const values = { generalCondition: 'normal', lungs: 'normal' }
    const meta = metadataForGeneratedContent('long', values)
    expect(meta.inputMode).toBe('long')
    expect(meta.structuredAnswers).toEqual(values)
    expect(meta.generatedAt).toBeTruthy()
    expect(meta.manuallyEdited).toBe(false)

    const edited = metadataForManualEdit(meta, 'long')
    expect(edited.manuallyEdited).toBe(true)
    expect(edited.structuredAnswers).toEqual(values)
  })
})

describe('anamnese befund guided schemas', () => {
  it('somatic guided schema has 10 steps', () => {
    const schema = getGuidedEntrySchema('anamnese-somatic-befund')
    expect(schema.steps).toHaveLength(10)
  })

  it('neuro guided schema has 10 steps', () => {
    const schema = getGuidedEntrySchema('anamnese-neuro-befund')
    expect(schema.steps).toHaveLength(10)
  })

  it('hides somatic note fields unless finding is abnormal', () => {
    const schema = getGuidedEntrySchema('anamnese-somatic-befund')
    const lungsNote = schema.fields.find((f: { id: string }) => f.id === 'lungsNote')
    expect(lungsNote?.showWhen).toEqual({
      id: 'lungs-note-visible',
      fieldId: 'lungs',
      operator: 'in',
      value: ['abnormal', 'not_examined'],
    })
  })
})
