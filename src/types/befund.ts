export type BefundType = 'ecg' | 'eeg'

export type BefundStatus = 'draft' | 'vidert'

/** Structured examination finding (EKG, EEG, …) stored per case. */
export interface BefundRecord {
  id: string
  caseId: string
  type: BefundType
  schemaVersion: number
  fieldValues: Record<string, string | string[] | boolean>
  status: BefundStatus
  /** ISO date of the examination (defaults to createdAt date). */
  examDate: string
  createdAt: string
  updatedAt: string
  vidertAt?: string
}
