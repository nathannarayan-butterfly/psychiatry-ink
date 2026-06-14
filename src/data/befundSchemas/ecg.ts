import type { BefundSchema } from './types'

export const ecgSchema: BefundSchema = {
  type: 'ecg',
  version: 1,
  title: 'EKG-Befund',
  shortLabel: 'EKG',
  sections: [
    {
      id: 'rhythm',
      label: 'Rhythmus',
      fields: [
        {
          id: 'rhythm',
          type: 'checkbox_group',
          label: 'Rhythmus',
          options: [
            { value: 'sinus', label: 'Sinusrhythmus' },
            { value: 'af', label: 'Vorhofflimmern' },
            { value: 'aflutter', label: 'Vorhofflattern' },
            { value: 'avn', label: 'AV-Knoten-Rhythmus' },
            { value: 'pacemaker', label: 'Schrittmacherrhythmus' },
            { value: 'irregular', label: 'Unregelmäßig' },
          ],
        },
        {
          id: 'rate',
          type: 'short_text',
          label: 'Frequenz',
          placeholder: 'z. B. 72/min',
        },
      ],
    },
    {
      id: 'lagetype',
      label: 'Lagetype / EKG-Typ',
      fields: [
        {
          id: 'ekg_type',
          type: 'radio_group',
          label: 'EKG-Typ',
          options: [
            { value: 'linkstyp', label: 'Linkstyp (L-Typ)' },
            { value: 'rechtstyp', label: 'Rechtstyp (R-Typ)' },
            { value: 'steiltyp', label: 'Steiltyp' },
            { value: 'horizontaltyp', label: 'Horizontaltyp' },
            { value: 'i_typ', label: 'i-Typ (intermediär / indifferenter Typ)' },
            { value: 'nicht_bestimmbar', label: 'Nicht bestimmbar' },
          ],
        },
        {
          id: 'ekg_type_other',
          type: 'short_text',
          label: 'Sonstiges / Freitext',
          placeholder: 'z. B. abweichende Lagetyp-Bezeichnung …',
        },
      ],
    },
    {
      id: 'intervals',
      label: 'Intervalle',
      fields: [
        {
          id: 'pq',
          type: 'short_text',
          label: 'PQ',
          placeholder: 'z. B. 160 ms',
        },
        {
          id: 'qtc',
          type: 'short_text',
          label: 'QTc',
          placeholder: 'z. B. 420 ms',
        },
      ],
    },
    {
      id: 'morphology',
      label: 'Morphologie',
      fields: [
        {
          id: 'st',
          type: 'checkbox_group',
          label: 'ST-Strecke',
          options: [
            { value: 'normal', label: 'Unauffällig' },
            { value: 'elevation', label: 'ST-Hebung' },
            { value: 'depression', label: 'ST-Senkung' },
            { value: 't_inversion', label: 'T-Inversion' },
          ],
        },
        {
          id: 'blocks',
          type: 'checkbox_group',
          label: 'Leitungsstörungen',
          options: [
            { value: 'none', label: 'Keine' },
            { value: 'rbbb', label: 'Rechtsschenkelblock' },
            { value: 'lbbb', label: 'Linksschenkelblock' },
            { value: 'avb1', label: 'AV-Block I°' },
            { value: 'avb2', label: 'AV-Block II°' },
            { value: 'avb3', label: 'AV-Block III°' },
          ],
        },
        {
          id: 'extrasystoles',
          type: 'checkbox',
          label: 'Extrasystolen',
        },
      ],
    },
    {
      id: 'conclusion',
      label: 'Beurteilung',
      fields: [
        {
          id: 'conclusion_preset',
          type: 'checkbox_group',
          label: 'Beurteilung (Standard)',
          options: [
            { value: 'unremarkable', label: 'Unauffälliges EKG' },
            { value: 'sinus_tachycardia', label: 'Sinustachykardie' },
            { value: 'sinus_bradycardia', label: 'Sinubradykardie' },
            { value: 'prolonged_qtc', label: 'Verlängertes QTc' },
            { value: 'af_known', label: 'Bekanntes Vorhofflimmern' },
            { value: 'repolarization', label: 'Repolarisationsstörung' },
          ],
        },
        {
          id: 'conclusion_free',
          type: 'long_text',
          label: 'Freitext',
          placeholder: 'Zusätzliche Beurteilung …',
        },
      ],
    },
  ],
}
