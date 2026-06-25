import type { InputOption, TemplateBlock } from '../../types/clinicalTemplate'

function uid(): string {
  return crypto.randomUUID()
}

function opt(label: string): InputOption {
  return { id: uid(), label }
}

type Lang = 'de' | 'en'
const pick = (lang: Lang, de: string, en: string) => (lang === 'de' ? de : en)

/**
 * Create a fully-formed default block for a palette item. Every block is
 * complete and immediately renderable — no placeholders or TODO stubs.
 */
export function createBlock(paletteId: string, lang: Lang = 'de'): TemplateBlock {
  const id = uid()
  switch (paletteId) {
    case 'heading':
      return { id, type: 'heading', text: pick(lang, 'Überschrift', 'Heading'), level: 2 }
    case 'text':
      return {
        id,
        type: 'text',
        text: pick(lang, 'Freier Textabschnitt …', 'Free text section …'),
      }
    case 'free_text':
      return {
        id,
        type: 'input',
        inputKind: 'long_text',
        label: pick(lang, 'Freitextfeld', 'Free text field'),
        placeholder: '',
        required: false,
      }
    case 'required_field':
      return {
        id,
        type: 'input',
        inputKind: 'short_text',
        label: pick(lang, 'Pflichtfeld', 'Required field'),
        placeholder: '',
        required: true,
      }
    case 'checkbox':
      return {
        id,
        type: 'input',
        inputKind: 'checkbox',
        label: pick(lang, 'Auswahlkästchen', 'Checkbox'),
        required: false,
      }
    case 'checkbox_group':
      return {
        id,
        type: 'input',
        inputKind: 'multi_select',
        label: pick(lang, 'Auswahlliste', 'Checklist'),
        required: false,
        options: [
          opt(pick(lang, 'Option 1', 'Option 1')),
          opt(pick(lang, 'Option 2', 'Option 2')),
          opt(pick(lang, 'Option 3', 'Option 3')),
        ],
      }
    case 'select':
      return {
        id,
        type: 'input',
        inputKind: 'select',
        label: pick(lang, 'Auswahl', 'Selection'),
        required: false,
        options: [opt(pick(lang, 'Option 1', 'Option 1')), opt(pick(lang, 'Option 2', 'Option 2'))],
      }
    case 'date':
      return {
        id,
        type: 'input',
        inputKind: 'date',
        label: pick(lang, 'Datum', 'Date'),
        required: false,
      }
    case 'table':
      return {
        id,
        type: 'table',
        caption: pick(lang, 'Tabelle', 'Table'),
        columns: [
          { id: uid(), label: pick(lang, 'Spalte 1', 'Column 1') },
          { id: uid(), label: pick(lang, 'Spalte 2', 'Column 2') },
        ],
        rows: [
          { id: uid(), cells: {} },
          { id: uid(), cells: {} },
        ],
      }
    case 'diagnosis':
      return {
        id,
        type: 'diagnosis',
        label: pick(lang, 'Diagnosen', 'Diagnoses'),
        showCodes: true,
        primaryOnly: false,
      }
    case 'medication':
      return {
        id,
        type: 'medication',
        label: pick(lang, 'Aktuelle Medikation', 'Current medication'),
        includePrn: true,
        format: 'list',
      }
    case 'laboratory':
      return {
        id,
        type: 'laboratory',
        label: pick(lang, 'Laborwerte', 'Laboratory results'),
        onlyAbnormal: false,
      }
    case 'psychopathology':
      return {
        id,
        type: 'psychopathology',
        label: pick(lang, 'Psychopathologischer Befund', 'Psychopathological findings'),
      }
    case 'risk':
      return { id, type: 'risk', label: pick(lang, 'Risikoeinschätzung', 'Risk assessment') }
    case 'verlauf_summary':
      return {
        id,
        type: 'verlauf_summary',
        label: pick(lang, 'Verlauf', 'Course'),
        windowPreset: '7d',
      }
    case 'anamnese':
      return {
        id,
        type: 'anamnese',
        label: pick(lang, 'Anamnese', 'History'),
      }
    case 'therapy':
      return { id, type: 'therapy', label: pick(lang, 'Therapie', 'Therapy') }
    case 'social_therapy':
      return { id, type: 'social_therapy', label: pick(lang, 'Sozialtherapie', 'Social therapy') }
    case 'patient_data':
      return {
        id,
        type: 'patient_data',
        field: 'name',
        label: pick(lang, 'Patient', 'Patient'),
        inline: true,
      }
    case 'institution':
      return {
        id,
        type: 'institution',
        field: 'clinician.name',
        label: pick(lang, 'Behandler', 'Clinician'),
        inline: true,
      }
    case 'signature':
      return {
        id,
        type: 'signature',
        roleLabel: pick(lang, 'Unterschrift', 'Signature'),
        includeDate: true,
        includeLocation: true,
      }
    case 'ai_section':
      return {
        id,
        type: 'ai_section',
        label: pick(lang, 'KI-Abschnitt', 'AI section'),
        prompt: pick(
          lang,
          'Fasse den klinischen Verlauf prägnant zusammen.',
          'Summarise the clinical course concisely.',
        ),
        sourceBinding: 'all',
      }
    case 'conditional':
      return {
        id,
        type: 'conditional',
        label: pick(lang, 'Bedingter Abschnitt', 'Conditional section'),
        condition: { source: 'medication.current', operator: 'exists' },
        children: [],
      }
    default:
      return { id, type: 'text', text: '' }
  }
}
