import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildEkgSummary,
  buildEegSummary,
  hasConductedEeg,
} from '../diagnosticSummaries'
import { buildZwangsmassnahmeSummary, hasZwangsmassnahmeSignal } from '../zwangsmassnahmeSummary'
import type { BefundRecord } from '../../../types/befund'

const CASE = 'test-diagnostic-summaries'

function seedEcg(caseId: string): void {
  const record: BefundRecord = {
    id: 'ecg-1',
    caseId,
    type: 'ecg',
    schemaVersion: 1,
    fieldValues: {
      conclusion_preset: ['unremarkable'],
      rhythm: ['sinus'],
    },
    status: 'vidert',
    examDate: '2026-06-01',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  }
  localStorage.setItem(
    `psychiatry-ink:diagnostikBefunde::${caseId}`,
    JSON.stringify([record]),
  )
}

function seedAbnormalEcg(caseId: string): void {
  const record: BefundRecord = {
    id: 'ecg-2',
    caseId,
    type: 'ecg',
    schemaVersion: 1,
    fieldValues: {
      conclusion_preset: ['prolonged_qtc'],
      conclusion_free: 'QTc 510 ms',
      rhythm: ['sinus'],
    },
    status: 'vidert',
    examDate: '2026-06-02',
    createdAt: '2026-06-02T10:00:00.000Z',
    updatedAt: '2026-06-02T10:00:00.000Z',
  }
  localStorage.setItem(
    `psychiatry-ink:diagnostikBefunde::${caseId}`,
    JSON.stringify([record]),
  )
}

describe('diagnosticSummaries', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reports normal EKG when latest befund is unremarkable', () => {
    seedEcg(CASE)
    const summary = buildEkgSummary(CASE)
    expect(summary.conducted).toBe(true)
    expect(summary.status).toBe('normal')
    expect(summary.statusLabel).toBe('Normal')
  })

  it('reports abnormal EKG with brief finding', () => {
    seedAbnormalEcg(CASE)
    const summary = buildEkgSummary(CASE)
    expect(summary.status).toBe('abnormal')
    expect(summary.statusLabel).toBe('Auffällig')
    expect(summary.briefFinding).toContain('QTc')
  })

  it('detects conducted EEG', () => {
    expect(hasConductedEeg(CASE)).toBe(false)
    localStorage.setItem(
      `psychiatry-ink:diagnostikBefunde::${CASE}`,
      JSON.stringify([
        {
          id: 'eeg-1',
          caseId: CASE,
          type: 'eeg',
          schemaVersion: 1,
          fieldValues: { conclusion_preset: ['normal'] },
          status: 'vidert',
          examDate: '2026-06-03',
          createdAt: '2026-06-03T10:00:00.000Z',
          updatedAt: '2026-06-03T10:00:00.000Z',
        },
      ]),
    )
    expect(hasConductedEeg(CASE)).toBe(true)
    expect(buildEegSummary(CASE).conducted).toBe(true)
  })
})

describe('zwangsmassnahmeSummary', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is hidden when no coercive-measure order exists', () => {
    const summary = buildZwangsmassnahmeSummary(CASE)
    expect(hasZwangsmassnahmeSignal(summary)).toBe(false)
  })
})
