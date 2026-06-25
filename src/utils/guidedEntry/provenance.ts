import { caseStorageKey } from '../caseContext'
import type {
  GuidedEntryAnswer,
  GuidedEntryItemType,
  GuidedEntryMode,
  GuidedEntryProvenance,
  GuidedEntryRecord,
} from '../../types/guidedEntry'

const RECORDS_KEY = 'psychiatry-ink:guided-entry-records'

function recordsKey(caseId: string): string {
  return caseStorageKey(RECORDS_KEY, caseId)
}

export function loadGuidedEntryRecords(caseId: string): GuidedEntryRecord[] {
  try {
    const raw = localStorage.getItem(recordsKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as GuidedEntryRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveGuidedEntryRecords(caseId: string, records: GuidedEntryRecord[]): void {
  try {
    localStorage.setItem(recordsKey(caseId), JSON.stringify(records))
  } catch {
    // ignore quota
  }
}

export function buildGuidedEntryProvenance(params: {
  instanceId: string
  itemType: GuidedEntryItemType
  mode: GuidedEntryMode
  userId?: string
  answers: GuidedEntryAnswer[]
  reviewStatus?: GuidedEntryProvenance['reviewStatus']
}): GuidedEntryProvenance {
  const fieldSources: Record<string, GuidedEntryAnswer['source']> = {}
  for (const a of params.answers) {
    fieldSources[a.fieldId] = a.source
  }
  const now = new Date().toISOString()
  return {
    instanceId: params.instanceId,
    itemType: params.itemType,
    mode: params.mode,
    userId: params.userId,
    createdAt: now,
    completedAt: now,
    reviewStatus: params.reviewStatus ?? 'reviewed',
    fieldSources,
    generatedDeterministically: true,
    aiPolished: false,
  }
}

export function appendGuidedEntryRecord(
  caseId: string,
  record: Omit<GuidedEntryRecord, 'id' | 'createdAt'>,
): GuidedEntryRecord {
  const full: GuidedEntryRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const existing = loadGuidedEntryRecords(caseId)
  saveGuidedEntryRecords(caseId, [full, ...existing])
  return full
}

export function getGuidedEntryRecordForEntity(
  caseId: string,
  targetEntityId: string,
): GuidedEntryRecord | null {
  return loadGuidedEntryRecords(caseId).find((r) => r.targetEntityId === targetEntityId) ?? null
}
