import type { DocumentTemplate, TemplateField, TemplateSection } from '../../types/documentTemplate'

export const ANHOERUNG_TEMPLATE_ID = 'seed-anhoerung-fgb-v1'

function field(partial: Omit<TemplateField, 'order'> & { order: number }): TemplateField {
  return partial
}

/**
 * Anhörung gemäß § 1906 Abs. 1 Nr. 1 BGB (Betreuungsrecht) — demonstrates
 * conditional wizard steps and legal-checkbox provenance.
 */
export function buildAnhoerungTemplate(now = new Date().toISOString()): DocumentTemplate {
  const fIntro = field({
    id: 'anhoerung-intro',
    type: 'static_text',
    order: 0,
    defaultValue:
      '<p><strong>Anhörung des Betroffenen</strong></p><p>Gemäß § 1906 Abs. 1 Nr. 1 BGB ist der Betroffene vor einer freiheitsentziehenden Unterbringung anzuhören. Die Anhörung ist zu dokumentieren.</p>',
  })

  const fPatientName = field({
    id: 'anhoerung-patient-name',
    type: 'patient_placeholder',
    order: 1,
    label: 'Name des Betroffenen',
    binding: 'patient.name',
    required: true,
    sectionId: 'sec-patient',
  })

  const fPatientDob = field({
    id: 'anhoerung-patient-dob',
    type: 'patient_placeholder',
    order: 2,
    label: 'Geburtsdatum',
    binding: 'patient.geburtsdatum',
    required: true,
    sectionId: 'sec-patient',
  })

  const fClinician = field({
    id: 'anhoerung-clinician',
    type: 'clinician_placeholder',
    order: 3,
    label: 'Anhörende/r Arzt/Ärztin',
    binding: 'clinician.name',
    required: true,
    sectionId: 'sec-patient',
  })

  const fDate = field({
    id: 'anhoerung-date',
    type: 'date',
    order: 4,
    label: 'Datum der Anhörung',
    required: true,
    sectionId: 'sec-patient',
  })

  const fConducted = field({
    id: 'anhoerung-conducted',
    type: 'yes_no',
    order: 5,
    label: 'Wurde der Betroffene persönlich angehört?',
    required: true,
    sectionId: 'sec-conduct',
  })

  const fHarmCheckbox = field({
    id: 'anhoerung-harm-health',
    type: 'legal_checkbox',
    order: 6,
    label: 'Anhörung schadet der Gesundheit',
    legalText:
      'Die Anhörung des Betroffenen würde nach aktueller klinischer Einschätzung seine Gesundheit erheblich gefährden oder verschlechtern (§ 1906 Abs. 1 Nr. 1 BGB).',
    required: false,
    sectionId: 'sec-conduct',
  })

  const fConditionalSection = field({
    id: 'anhoerung-conditional-wrap',
    type: 'conditional_section',
    order: 7,
    label: 'Begründung bei Gesundheitsgefährdung',
    showWhen: {
      id: 'cond-harm',
      fieldId: 'anhoerung-harm-health',
      operator: 'checked',
    },
    childFieldIds: ['anhoerung-harm-justification', 'anhoerung-harm-evidence'],
  })

  const fHarmJustification = field({
    id: 'anhoerung-harm-justification',
    type: 'textarea',
    order: 8,
    label: 'Klinische Begründung für die Ausnahme von der Anhörung',
    helperText: 'Konkrete psychopathologische Befunde und erwartete Belastung benennen.',
    required: true,
    showWhen: {
      id: 'cond-harm-j',
      fieldId: 'anhoerung-harm-health',
      operator: 'checked',
    },
  })

  const fHarmEvidence = field({
    id: 'anhoerung-harm-evidence',
    type: 'textarea',
    order: 9,
    label: 'Beobachtete oder dokumentierte Anzeichen',
    required: false,
    showWhen: {
      id: 'cond-harm-e',
      fieldId: 'anhoerung-harm-health',
      operator: 'checked',
    },
  })

  const fSummary = field({
    id: 'anhoerung-summary',
    type: 'textarea',
    order: 10,
    label: 'Inhalt der Anhörung / Stellungnahme des Betroffenen',
    helperText: 'Freitext — nur ausfüllen, wenn Anhörung durchgeführt wurde.',
    required: false,
    sectionId: 'sec-content',
    showWhen: {
      id: 'cond-conducted',
      fieldId: 'anhoerung-conducted',
      operator: 'equals',
      value: 'yes',
    },
  })

  const fNotConductedReason = field({
    id: 'anhoerung-not-conducted',
    type: 'select',
    order: 11,
    label: 'Grund, wenn keine Anhörung erfolgte',
    required: true,
    sectionId: 'sec-content',
    options: [
      { id: 'harm', label: 'Anhörung schadet der Gesundheit' },
      { id: 'unable', label: 'Betroffene/r nicht ansprechbar' },
      { id: 'refused', label: 'Betroffene/r verweigert Gespräch' },
      { id: 'other', label: 'Sonstiger Grund' },
    ],
    showWhen: {
      id: 'cond-not-conducted',
      fieldId: 'anhoerung-conducted',
      operator: 'equals',
      value: 'no',
    },
  })

  const fSignature = field({
    id: 'anhoerung-signature',
    type: 'signature',
    order: 12,
    label: 'Unterschrift anhörende/r Arzt/Ärztin',
    required: true,
    sectionId: 'sec-sign',
  })

  const sections: TemplateSection[] = [
    {
      id: 'sec-patient',
      title: 'Betroffene Person',
      description: 'Stammdaten — aus dem Fall vorausgefüllt, bitte prüfen.',
      fieldIds: [fPatientName.id, fPatientDob.id, fClinician.id, fDate.id],
      order: 0,
    },
    {
      id: 'sec-conduct',
      title: 'Anhörung',
      description: 'Wurde eine persönliche Anhörung durchgeführt?',
      fieldIds: [fConducted.id, fHarmCheckbox.id],
      order: 1,
    },
    {
      id: 'sec-harm',
      title: 'Gesundheitsgefährdung',
      description: 'Pflichtangaben, wenn die Anhörung der Gesundheit schadet.',
      fieldIds: [fHarmJustification.id, fHarmEvidence.id],
      order: 2,
    },
    {
      id: 'sec-content',
      title: 'Inhalt / Begründung',
      fieldIds: [fSummary.id, fNotConductedReason.id],
      order: 3,
    },
    {
      id: 'sec-sign',
      title: 'Bestätigung',
      fieldIds: [fSignature.id],
      order: 4,
    },
  ]

  return {
    id: ANHOERUNG_TEMPLATE_ID,
    title: 'Anhörung — freiheitsentziehende Unterbringung (§ 1906 BGB)',
    description:
      'Forensisch-rechtliche Dokumentation der Anhörung vor freiheitsentziehender Unterbringung mit bedingten Folgefeldern.',
    category: 'gericht-legal',
    language: 'de',
    version: 1,
    status: 'active',
    availability: {
      emptyWorkspace: false,
      patientWorkspace: true,
      patientDocuments: true,
    },
    fields: [
      fIntro,
      fPatientName,
      fPatientDob,
      fClinician,
      fDate,
      fConducted,
      fHarmCheckbox,
      fConditionalSection,
      fHarmJustification,
      fHarmEvidence,
      fSummary,
      fNotConductedReason,
      fSignature,
    ],
    sections,
    createdAt: now,
    updatedAt: now,
  }
}
