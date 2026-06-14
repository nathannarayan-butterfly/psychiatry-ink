import type { BefundSchema } from './types'

export const eegSchema: BefundSchema = {
  type: 'eeg',
  version: 1,
  title: 'EEG-Befund',
  shortLabel: 'EEG',
  sections: [
    {
      id: 'background',
      label: 'Hintergrundaktivität',
      fields: [
        {
          id: 'background',
          type: 'checkbox_group',
          label: 'Hintergrund',
          options: [
            { value: 'alpha_dominant', label: 'Alpha-dominant (10 Hz)' },
            { value: 'theta', label: 'Theta-Anteil erhöht' },
            { value: 'delta', label: 'Delta-Anteil erhöht' },
            { value: 'diffuse_slow', label: 'Diffuse Verlangsamung' },
            { value: 'disorganized', label: 'Desorganisiert' },
          ],
        },
        {
          id: 'reactivity',
          type: 'select',
          label: 'Reaktivität',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'reduced', label: 'Vermindert' },
            { value: 'absent', label: 'Fehlend' },
            { value: 'not_assessed', label: 'Nicht beurteilt' },
          ],
          defaultValue: 'normal',
        },
      ],
    },
    {
      id: 'focal',
      label: 'Fokale Befunde',
      fields: [
        {
          id: 'focal',
          type: 'checkbox_group',
          label: 'Fokal',
          options: [
            { value: 'none', label: 'Keine fokalen Auffälligkeiten' },
            { value: 'frontotemporal', label: 'Frontotemporal' },
            { value: 'temporal', label: 'Temporal' },
            { value: 'parietal', label: 'Parietal' },
            { value: 'occipital', label: 'Okzipital' },
            { value: 'frontal', label: 'Frontal' },
          ],
        },
        {
          id: 'focal_slowing',
          type: 'checkbox',
          label: 'Fokale Verlangsamung',
        },
      ],
    },
    {
      id: 'epileptiform',
      label: 'Epileptiforme Aktivität',
      fields: [
        {
          id: 'epileptiform',
          type: 'checkbox_group',
          label: 'Epileptiform',
          options: [
            { value: 'none', label: 'Keine epileptiforme Aktivität' },
            { value: 'sharp_waves', label: 'Scharfe Wellen' },
            { value: 'spikes', label: 'Spikes' },
            { value: 'spike_wave', label: 'Spike-Wave-Komplexe' },
            { value: 'polyspike', label: 'Polyspike' },
            { value: 'periodic', label: 'Periodische Entladungen' },
          ],
        },
      ],
    },
    {
      id: 'sleep',
      label: 'Schlaf / Aktivierung',
      fields: [
        {
          id: 'sleep',
          type: 'checkbox_group',
          label: 'Schlaf',
          options: [
            { value: 'not_assessed', label: 'Nicht beurteilt' },
            { value: 'wake', label: 'Wach-EEG' },
            { value: 'sleep_spindles', label: 'Schlafspindeln' },
            { value: 'k_complexes', label: 'K-Komplexe' },
            { value: 'sleep_stages', label: 'Schlafstadien nachweisbar' },
          ],
        },
        {
          id: 'activation',
          type: 'checkbox_group',
          label: 'Aktivierung',
          options: [
            { value: 'none', label: 'Keine Aktivierung' },
            { value: 'hv', label: 'Hyperventilation' },
            { value: 'photic', label: 'Photic stimulation' },
          ],
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
            { value: 'normal', label: 'Unauffälliges EEG' },
            { value: 'mild_slow', label: 'Leichte Verlangsamung' },
            { value: 'moderate_slow', label: 'Mittelgradige Verlangsamung' },
            { value: 'severe_slow', label: 'Schwere Verlangsamung' },
            { value: 'epileptiform_no_seizure', label: 'Epileptiforme Potentiale ohne Anfallsereignis' },
            { value: 'ictal', label: 'Iktales Muster' },
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
