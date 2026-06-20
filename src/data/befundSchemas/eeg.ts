import type { BefundSchema } from './types'

export const eegSchema: BefundSchema = {
  type: 'eeg',
  version: 1,
  title: 'EEG-Befund',
  titleEn: 'EEG report',
  shortLabel: 'EEG',
  shortLabelEn: 'EEG',
  sections: [
    {
      id: 'background',
      label: 'Hintergrundaktivität',
      labelEn: 'Background activity',
      fields: [
        {
          id: 'background',
          type: 'checkbox_group',
          label: 'Hintergrund',
          labelEn: 'Background',
          options: [
            {
              value: 'alpha_dominant',
              label: 'Alpha-dominant (10 Hz)',
              labelEn: 'Alpha-dominant (10 Hz)',
            },
            { value: 'theta', label: 'Theta-Anteil erhöht', labelEn: 'Increased theta activity' },
            { value: 'delta', label: 'Delta-Anteil erhöht', labelEn: 'Increased delta activity' },
            { value: 'diffuse_slow', label: 'Diffuse Verlangsamung', labelEn: 'Diffuse slowing' },
            { value: 'disorganized', label: 'Desorganisiert', labelEn: 'Disorganised' },
          ],
        },
        {
          id: 'reactivity',
          type: 'select',
          label: 'Reaktivität',
          labelEn: 'Reactivity',
          options: [
            { value: 'normal', label: 'Normal', labelEn: 'Normal' },
            { value: 'reduced', label: 'Vermindert', labelEn: 'Reduced' },
            { value: 'absent', label: 'Fehlend', labelEn: 'Absent' },
            { value: 'not_assessed', label: 'Nicht beurteilt', labelEn: 'Not assessed' },
          ],
          defaultValue: 'normal',
        },
      ],
    },
    {
      id: 'focal',
      label: 'Fokale Befunde',
      labelEn: 'Focal findings',
      fields: [
        {
          id: 'focal',
          type: 'checkbox_group',
          label: 'Fokal',
          labelEn: 'Focal',
          options: [
            { value: 'none', label: 'Keine fokalen Auffälligkeiten', labelEn: 'No focal abnormalities' },
            { value: 'frontotemporal', label: 'Frontotemporal', labelEn: 'Frontotemporal' },
            { value: 'temporal', label: 'Temporal', labelEn: 'Temporal' },
            { value: 'parietal', label: 'Parietal', labelEn: 'Parietal' },
            { value: 'occipital', label: 'Okzipital', labelEn: 'Occipital' },
            { value: 'frontal', label: 'Frontal', labelEn: 'Frontal' },
          ],
        },
        {
          id: 'focal_slowing',
          type: 'checkbox',
          label: 'Fokale Verlangsamung',
          labelEn: 'Focal slowing',
        },
      ],
    },
    {
      id: 'epileptiform',
      label: 'Epileptiforme Aktivität',
      labelEn: 'Epileptiform activity',
      fields: [
        {
          id: 'epileptiform',
          type: 'checkbox_group',
          label: 'Epileptiform',
          labelEn: 'Epileptiform',
          options: [
            { value: 'none', label: 'Keine epileptiforme Aktivität', labelEn: 'No epileptiform activity' },
            { value: 'sharp_waves', label: 'Scharfe Wellen', labelEn: 'Sharp waves' },
            { value: 'spikes', label: 'Spikes', labelEn: 'Spikes' },
            { value: 'spike_wave', label: 'Spike-Wave-Komplexe', labelEn: 'Spike-and-wave complexes' },
            { value: 'polyspike', label: 'Polyspike', labelEn: 'Polyspikes' },
            { value: 'periodic', label: 'Periodische Entladungen', labelEn: 'Periodic discharges' },
          ],
        },
      ],
    },
    {
      id: 'sleep',
      label: 'Schlaf / Aktivierung',
      labelEn: 'Sleep / activation',
      fields: [
        {
          id: 'sleep',
          type: 'checkbox_group',
          label: 'Schlaf',
          labelEn: 'Sleep',
          options: [
            { value: 'not_assessed', label: 'Nicht beurteilt', labelEn: 'Not assessed' },
            { value: 'wake', label: 'Wach-EEG', labelEn: 'Awake EEG' },
            { value: 'sleep_spindles', label: 'Schlafspindeln', labelEn: 'Sleep spindles' },
            { value: 'k_complexes', label: 'K-Komplexe', labelEn: 'K-complexes' },
            { value: 'sleep_stages', label: 'Schlafstadien nachweisbar', labelEn: 'Sleep stages identified' },
          ],
        },
        {
          id: 'activation',
          type: 'checkbox_group',
          label: 'Aktivierung',
          labelEn: 'Activation procedures',
          options: [
            { value: 'none', label: 'Keine Aktivierung', labelEn: 'No activation' },
            { value: 'hv', label: 'Hyperventilation', labelEn: 'Hyperventilation' },
            { value: 'photic', label: 'Photic stimulation', labelEn: 'Photic stimulation' },
          ],
        },
      ],
    },
    {
      id: 'conclusion',
      label: 'Beurteilung',
      labelEn: 'Conclusion',
      fields: [
        {
          id: 'conclusion_preset',
          type: 'checkbox_group',
          label: 'Beurteilung (Standard)',
          labelEn: 'Conclusion (standard)',
          options: [
            { value: 'normal', label: 'Unauffälliges EEG', labelEn: 'Unremarkable EEG' },
            { value: 'mild_slow', label: 'Leichte Verlangsamung', labelEn: 'Mild slowing' },
            { value: 'moderate_slow', label: 'Mittelgradige Verlangsamung', labelEn: 'Moderate slowing' },
            { value: 'severe_slow', label: 'Schwere Verlangsamung', labelEn: 'Severe slowing' },
            {
              value: 'epileptiform_no_seizure',
              label: 'Epileptiforme Potentiale ohne Anfallsereignis',
              labelEn: 'Epileptiform potentials without seizure event',
            },
            { value: 'ictal', label: 'Iktales Muster', labelEn: 'Ictal pattern' },
          ],
        },
        {
          id: 'conclusion_free',
          type: 'long_text',
          label: 'Freitext',
          labelEn: 'Free text',
          placeholder: 'Zusätzliche Beurteilung …',
          placeholderEn: 'Additional commentary …',
        },
      ],
    },
  ],
}
