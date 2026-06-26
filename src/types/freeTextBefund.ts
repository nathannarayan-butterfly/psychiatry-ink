import type { UiLanguage } from './settings'

/**
 * Free-text examination findings documented directly in the Diagnostik module
 * (EEG, cranial CT, cranial MRI). Unlike the structured {@link BefundRecord}
 * EKG/EEG schemas used in the Befundung workspace, these sections let the
 * clinician paste a free-text Befund report verbatim.
 */
export type FreeTextBefundModality = 'eeg' | 'cct' | 'mrt'

export const FREE_TEXT_BEFUND_MODALITIES: FreeTextBefundModality[] = ['eeg', 'cct', 'mrt']

export type FreeTextBefundStatus = 'draft' | 'vidert'

export interface FreeTextBefundRecord {
  id: string
  caseId: string
  modality: FreeTextBefundModality
  /** Raw pasted / typed finding text. */
  text: string
  status: FreeTextBefundStatus
  /** ISO date of the examination (defaults to createdAt date). */
  examDate: string
  createdAt: string
  updatedAt: string
  vidertAt?: string
}

const MODALITY_SHORT_LABEL: Record<FreeTextBefundModality, string> = {
  eeg: 'EEG',
  cct: 'CCT',
  mrt: 'MRT',
}

const MODALITY_TITLE: Record<FreeTextBefundModality, Record<UiLanguage, string>> = {
  eeg: {
    de: 'EEG-Befund',
    en: 'EEG report',
    fr: 'Rapport EEG',
    es: 'Informe de EEG',
  },
  cct: {
    de: 'CCT-Befund (kraniale Computertomographie)',
    en: 'Cranial CT report',
    fr: 'Rapport de TDM crânienne',
    es: 'Informe de TC craneal',
  },
  mrt: {
    de: 'MRT-Befund (kraniale Magnetresonanztomographie)',
    en: 'Cranial MRI report',
    fr: 'Rapport d\'IRM crânienne',
    es: 'Informe de RM craneal',
  },
}

export function freeTextBefundShortLabel(modality: FreeTextBefundModality): string {
  return MODALITY_SHORT_LABEL[modality]
}

export function freeTextBefundTitle(
  modality: FreeTextBefundModality,
  language: UiLanguage = 'de',
): string {
  const entry = MODALITY_TITLE[modality]
  return entry[language] ?? entry.de
}
