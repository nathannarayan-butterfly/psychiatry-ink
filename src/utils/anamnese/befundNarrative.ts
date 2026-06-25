import type { GuidedEntryFieldValues } from '../../types/guidedEntry'

function read(values: GuidedEntryFieldValues, fieldId: string): string {
  const raw = values[fieldId]
  if (raw === undefined || raw === null) return ''
  if (typeof raw === 'boolean') return raw ? 'yes' : 'no'
  if (Array.isArray(raw)) return raw.join(', ')
  return String(raw).trim()
}

function readFinding(values: GuidedEntryFieldValues, fieldId: string): string {
  return read(values, fieldId)
}

function readNote(values: GuidedEntryFieldValues, fieldId: string): string {
  return read(values, `${fieldId}Note`)
}

/** Compose fluent German somatic exam prose from structured field values. */
export function generateSomaticBefundNarrative(values: GuidedEntryFieldValues): string {
  const sentences: string[] = []

  const general = readFinding(values, 'generalCondition')
  const generalNote = readNote(values, 'generalCondition')
  const nutrition = readFinding(values, 'nutritionalState')
  const nutritionNote = readNote(values, 'nutritionalState')

  const openingParts: string[] = []
  if (general === 'normal') {
    openingParts.push('in stabilem Allgemeinzustand')
  } else if (general === 'abnormal') {
    openingParts.push(
      generalNote
        ? `in auffälligem Allgemeinzustand (${generalNote})`
        : 'in auffälligem Allgemeinzustand',
    )
  } else if (generalNote) {
    openingParts.push(`Allgemeinzustand: ${generalNote}`)
  }

  if (nutrition === 'normal') {
    openingParts.push('altersentsprechendem Ernährungszustand')
  } else if (nutrition === 'adipose') {
    openingParts.push('adipösem Ernährungszustand')
  } else if (nutrition === 'cachectic') {
    openingParts.push('kachektischem Ernährungszustand')
  } else if (nutrition === 'abnormal') {
    openingParts.push(
      nutritionNote
        ? `auffälligem Ernährungszustand (${nutritionNote})`
        : 'auffälligem Ernährungszustand',
    )
  } else if (nutritionNote) {
    openingParts.push(`Ernährungszustand: ${nutritionNote}`)
  }

  if (openingParts.length > 0) {
    sentences.push(`Somatisch zeigte sich der Patient in ${openingParts.join(' und ')}.`)
  }

  const complaints = read(values, 'currentComplaints')
  if (complaints === 'no' || complaints === 'none') {
    sentences.push('Es ergaben sich klinisch keine Hinweise auf akute internistische Beschwerden.')
  } else if (complaints === 'yes') {
    const note = read(values, 'currentComplaintsNote')
    sentences.push(
      note
        ? `Es wurden aktuelle körperliche Beschwerden angegeben: ${note}.`
        : 'Es wurden aktuelle körperliche Beschwerden angegeben.',
    )
  } else if (complaints) {
    sentences.push(`Aktuelle körperliche Beschwerden: ${complaints}.`)
  }

  const vitals = read(values, 'vitals')
  const vitalsNote = read(values, 'vitalsNote')
  if (vitals === 'normal') {
    sentences.push('Die Vitalparameter waren orientierend unauffällig.')
  } else if (vitals === 'abnormal') {
    sentences.push(
      vitalsNote
        ? `Auffällige Vitalparameter: ${vitalsNote}.`
        : 'Es zeigten sich auffällige Vitalparameter.',
    )
  } else if (vitalsNote) {
    sentences.push(`Vitalparameter: ${vitalsNote}.`)
  } else if (vitals) {
    sentences.push(`Vitalparameter: ${vitals}.`)
  }

  const systemParts: string[] = []
  for (const [fieldId, label] of [
    ['skinMucosa', 'Haut und Schleimhäute'],
    ['heartCirculation', 'Herz und Kreislauf'],
    ['lungs', 'Lunge'],
    ['abdomen', 'Abdomen'],
    ['musculoskeletal', 'Bewegungsapparat'],
  ] as const) {
    const finding = readFinding(values, fieldId)
    const note = readNote(values, fieldId)
    if (finding === 'normal') {
      systemParts.push(`${label} unauffällig`)
    } else if (finding === 'abnormal') {
      systemParts.push(note ? `${label} auffällig (${note})` : `${label} auffällig`)
    } else if (note) {
      systemParts.push(`${label}: ${note}`)
    } else if (finding && finding !== 'not_examined') {
      systemParts.push(`${label}: ${finding}`)
    }
  }

  if (systemParts.length > 0) {
    const pathological = systemParts.some((p) => p.includes('auffällig'))
    if (pathological) {
      sentences.push(`${systemParts.join('. ')}.`)
    } else {
      sentences.push(
        `${systemParts.slice(0, 3).join(', ')}${systemParts.length > 3 ? `; ${systemParts.slice(3).join(', ')}` : ''} orientierend ohne wegweisenden pathologischen Befund.`,
      )
    }
  }

  const pain = read(values, 'pain')
  const painNote = read(values, 'painNote')
  if (pain === 'yes' && painNote) {
    sentences.push(`Schmerzen: ${painNote}.`)
  } else if (pain === 'yes') {
    sentences.push('Es bestanden Schmerzen.')
  } else if (painNote) {
    sentences.push(`Schmerzen: ${painNote}.`)
  }

  const intox = read(values, 'intoxWithdrawalInfectionInjury')
  const intoxNote = read(values, 'intoxWithdrawalInfectionInjuryNote')
  if (intox === 'yes' && intoxNote) {
    sentences.push(`Hinweise auf Intoxikation, Entzug, Infekt oder Verletzung: ${intoxNote}.`)
  } else if (intox === 'yes') {
    sentences.push(
      'Es bestanden Hinweise auf Intoxikation, Entzug, Infektzeichen oder Verletzungen.',
    )
  } else if (intoxNote) {
    sentences.push(intoxNote.endsWith('.') ? intoxNote : `${intoxNote}.`)
  }

  const history = read(values, 'somaticHistory')
  if (history === 'yes') {
    const note = read(values, 'somaticHistoryNote')
    if (note) sentences.push(`Relevante somatische Vorerkrankungen: ${note}.`)
  } else if (history && history !== 'none' && history !== 'no') {
    sentences.push(`Relevante somatische Vorerkrankungen: ${history}.`)
  }

  const other = read(values, 'otherFindings')
  if (other) {
    sentences.push(other.endsWith('.') ? other : `${other}.`)
  }

  if (sentences.length === 0) {
    return 'Somatisch zeigte sich der Patient in stabilem Allgemeinzustand und altersentsprechendem Ernährungszustand. Es ergaben sich klinisch keine Hinweise auf akute internistische Beschwerden. Herz, Lunge und Abdomen waren orientierend ohne wegweisenden pathologischen Befund.'
  }

  return sentences.join(' ')
}

/** Compose fluent German neurological exam prose from structured field values. */
export function generateNeuroBefundNarrative(values: GuidedEntryFieldValues): string {
  const sentences: string[] = []
  let hasPathology = false

  const consciousness = readFinding(values, 'consciousnessOrientation')
  const consciousnessNote = readNote(values, 'consciousnessOrientation')
  if (consciousness === 'normal') {
    sentences.push('Bewusstsein und Orientierung waren unauffällig.')
  } else if (consciousness === 'abnormal') {
    hasPathology = true
    sentences.push(
      consciousnessNote
        ? `Bewusstsein und Orientierung auffällig: ${consciousnessNote}.`
        : 'Bewusstsein und Orientierung waren auffällig.',
    )
  } else if (consciousnessNote) {
    sentences.push(`Bewusstsein und Orientierung: ${consciousnessNote}.`)
  }

  const unremarkableSystems: string[] = []
  for (const [fieldId, label] of [
    ['speech', 'Sprache'],
    ['motor', 'Motorik'],
    ['sensitivity', 'Sensibilität'],
    ['coordination', 'Koordination'],
    ['gait', 'Gangbild'],
  ] as const) {
    const finding = readFinding(values, fieldId)
    const note = readNote(values, fieldId)
    if (finding === 'normal') {
      unremarkableSystems.push(label)
    } else if (finding === 'abnormal') {
      hasPathology = true
      sentences.push(note ? `${label} auffällig: ${note}.` : `${label} war auffällig.`)
    } else if (note) {
      sentences.push(`${label}: ${note}.`)
    }
  }

  const cranial = readFinding(values, 'cranialNerves')
  const cranialNote = readNote(values, 'cranialNerves')
  if (cranial === 'normal') {
    unremarkableSystems.push('Hirnnerven orientierend')
  } else if (cranial === 'abnormal') {
    hasPathology = true
    sentences.push(
      cranialNote
        ? `Hirnnerven orientierend auffällig: ${cranialNote}.`
        : 'Hirnnerven orientierend auffällig.',
    )
  } else if (cranialNote) {
    sentences.push(`Hirnnerven: ${cranialNote}.`)
  }

  const reflexes = readFinding(values, 'reflexes')
  const reflexesNote = readNote(values, 'reflexes')
  if (reflexes === 'normal') {
    unremarkableSystems.push('Reflexe')
  } else if (reflexes === 'abnormal') {
    hasPathology = true
    sentences.push(reflexesNote ? `Reflexe auffällig: ${reflexesNote}.` : 'Reflexe auffällig.')
  } else if (reflexesNote) {
    sentences.push(`Reflexe: ${reflexesNote}.`)
  }

  const epiMotorRaw = values.epiMotorFindings
  const epiMotorList = Array.isArray(epiMotorRaw)
    ? epiMotorRaw
    : read(values, 'epiMotorFindings')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

  const epiLabels: Record<string, string> = {
    tremor: 'Tremor',
    rigidity: 'Rigor',
    akathisia: 'Akathisie',
    dyskinesia: 'Dyskinesien',
    none: 'keine',
  }
  const epiPresent = epiMotorList.filter((id) => id !== 'none')
  if (epiPresent.length > 0) {
    hasPathology = true
    const labels = epiPresent.map((id) => epiLabels[id] ?? id)
    const epiNote = read(values, 'epiMotorFindingsNote')
    sentences.push(
      epiNote
        ? `Extrapyramidalmotorische Auffälligkeiten: ${labels.join(', ')} (${epiNote}).`
        : `Es zeigten sich ${labels.join(', ')}.`,
    )
  }

  const extrapyramidalOther = read(values, 'extrapyramidalOther')
  if (extrapyramidalOther) {
    hasPathology = true
    sentences.push(
      extrapyramidalOther.endsWith('.')
        ? extrapyramidalOther
        : `Sonstige extrapyramidale Auffälligkeiten: ${extrapyramidalOther}.`,
    )
  }

  const focal = readFinding(values, 'focalDeficits')
  const focalNote = readNote(values, 'focalDeficits')
  if (focal === 'yes' || focal === 'abnormal') {
    hasPathology = true
    sentences.push(
      focalNote
        ? `Fokalneurologische Defizite: ${focalNote}.`
        : 'Es zeigten sich fokalneurologische Defizite.',
    )
  } else if (focalNote) {
    sentences.push(focalNote.endsWith('.') ? focalNote : `${focalNote}.`)
  }

  const events = readFinding(values, 'seizuresSyncopeEvents')
  const eventsNote = readNote(values, 'seizuresSyncopeEvents')
  if (events === 'yes' || events === 'abnormal') {
    hasPathology = true
    sentences.push(
      eventsNote
        ? `Hinweise auf Krampfanfälle, Synkopen oder akute neurologische Ereignisse: ${eventsNote}.`
        : 'Es bestanden Hinweise auf Krampfanfälle, Synkopen oder akute neurologische Ereignisse.',
    )
  } else if (eventsNote) {
    sentences.push(eventsNote.endsWith('.') ? eventsNote : `${eventsNote}.`)
  }

  if (!hasPathology && unremarkableSystems.length > 0) {
    sentences.unshift('Neurologisch zeigten sich keine fokalneurologischen Defizite.')
    sentences.push(
      `${unremarkableSystems.join(', ')} waren orientierend unauffällig. Kein Hinweis auf akute neurologische Ausfälle.`,
    )
  } else if (!hasPathology && sentences.length === 0) {
    return 'Neurologisch zeigten sich keine fokalneurologischen Defizite. Sprache, Motorik, Sensibilität, Koordination und Gangbild waren orientierend unauffällig. Kein Hinweis auf akute neurologische Ausfälle.'
  }

  return sentences.join(' ')
}

export function generateBefundNarrativeForSection(
  sectionId: string,
  values: GuidedEntryFieldValues,
): string {
  if (sectionId === 'neurologischer-befund') {
    return generateNeuroBefundNarrative(values)
  }
  return generateSomaticBefundNarrative(values)
}

export const SOMATIC_BEFUND_SHORT_TEMPLATE =
  'Somatisch zeigte sich der Patient in stabilem Allgemeinzustand und altersentsprechendem Ernährungszustand. Es ergaben sich klinisch keine Hinweise auf akute internistische Beschwerden. Herz, Lunge und Abdomen waren orientierend ohne wegweisenden pathologischen Befund.'

export const NEURO_BEFUND_SHORT_TEMPLATE =
  'Neurologisch zeigten sich keine fokalneurologischen Defizite. Sprache, Motorik, Sensibilität, Koordination und Gangbild waren orientierend unauffällig. Kein Hinweis auf akute neurologische Ausfälle.'

export function defaultShortTemplateForSection(sectionId: string): string {
  return sectionId === 'neurologischer-befund'
    ? NEURO_BEFUND_SHORT_TEMPLATE
    : SOMATIC_BEFUND_SHORT_TEMPLATE
}
