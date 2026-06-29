import type { BefundSchema } from './types'

/**
 * Structured X-ray (Röntgen) finding for the patient-context Diagnostik module.
 *
 * Field ids deliberately match {@link roentgenBefundSchema} (the guided entry
 * schema) so a guided narrative routed through `applyGuidedOutput` maps 1:1 onto
 * these structured fields and renders via the generic befund renderer. Manual
 * entry happens through the same form as EKG/EEG befunde.
 */
export const roentgenSchema: BefundSchema = {
  type: 'roentgen',
  version: 1,
  title: 'Röntgen-Befund',
  titleEn: 'X-ray report',
  shortLabel: 'Röntgen',
  shortLabelEn: 'X-ray',
  sections: [
    {
      id: 'technique',
      label: 'Technik',
      labelEn: 'Technique',
      fields: [
        {
          id: 'region',
          type: 'select',
          label: 'Untersuchte Region',
          labelEn: 'Imaged region',
          options: [
            { value: 'thorax', label: 'Thorax', labelEn: 'Chest' },
            { value: 'abdomen', label: 'Abdomen', labelEn: 'Abdomen' },
            { value: 'skeleton', label: 'Skelett / Extremität', labelEn: 'Skeleton / extremity' },
            { value: 'spine', label: 'Wirbelsäule', labelEn: 'Spine' },
            { value: 'skull', label: 'Schädel', labelEn: 'Skull' },
            { value: 'other', label: 'Andere Region', labelEn: 'Other region' },
          ],
        },
        {
          id: 'technique',
          type: 'short_text',
          label: 'Technik / Projektion',
          labelEn: 'Technique / projection',
          placeholder: 'z. B. p.a. und seitlich, im Stehen',
          placeholderEn: 'e.g. PA and lateral, standing',
        },
      ],
    },
    {
      id: 'findings',
      label: 'Befund',
      labelEn: 'Findings',
      fields: [
        {
          id: 'findings',
          type: 'long_text',
          label: 'Befund',
          labelEn: 'Findings',
          placeholder: 'Strukturierte Beschreibung der radiologischen Befunde …',
          placeholderEn: 'Structured description of the radiological findings …',
        },
        {
          id: 'assessment',
          type: 'long_text',
          label: 'Beurteilung',
          labelEn: 'Assessment',
          placeholder: 'Zusammenfassende radiologische Beurteilung …',
          placeholderEn: 'Summary radiological assessment …',
        },
      ],
    },
  ],
}
