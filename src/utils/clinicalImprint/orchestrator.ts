import type { DiagnoseEntry } from '../diagnosenArchive'
import type { NotionDocumentSnapshot } from '../notionDocumentActions'
import type { SavedLabGraph } from '../../types/lab'
import type { SavedTimeline } from '../../types/timeline'
import type {
  ClinicalImprintIndex,
  ClinicalImprintJob,
  ClinicalImprintRecord,
  ClinicalSourceType,
} from '../../types/clinicalImprint'
import { extractClinicalImprint, hasClinicalSignal } from './extract'
import { emptyClinicalImprintIndex, imprintKeyFor, upsertClinicalImprint } from './storage'

const pendingJobs = new Map<string, ClinicalImprintJob>()
let flushHandle: number | null = null

function jobKey(job: ClinicalImprintJob): string {
  return `${job.caseId}:${job.sourceType}:${job.sourceId}`
}

function scheduleFlush(): void {
  if (flushHandle !== null) return

  const run = (): void => {
    flushHandle = null
    void flushClinicalImprintQueue()
  }

  if (typeof requestIdleCallback === 'function') {
    flushHandle = requestIdleCallback(run, { timeout: 2000 }) as unknown as number
  } else {
    flushHandle = window.setTimeout(run, 500)
  }
}

export function scheduleClinicalImprint(job: ClinicalImprintJob): void {
  if (!job.caseId?.trim() || !job.sourceId?.trim()) return
  if (!hasClinicalSignal(job.text)) return

  pendingJobs.set(jobKey(job), job)
  scheduleFlush()
}

function jobsToRecords(jobs: ClinicalImprintJob[]): ClinicalImprintRecord[] {
  const records: ClinicalImprintRecord[] = []
  for (const job of jobs) {
    const metadata = extractClinicalImprint(job)
    if (!metadata) continue
    records.push({
      ...metadata,
      imprintKey: imprintKeyFor(metadata.sourceType, metadata.sourceId),
    })
  }
  return records
}

export function buildImprintIndexFromJobs(jobs: ClinicalImprintJob[]): ClinicalImprintIndex {
  const deduped = new Map<string, ClinicalImprintRecord>()
  for (const record of jobsToRecords(jobs)) {
    deduped.set(record.imprintKey, record)
  }
  return {
    ...emptyClinicalImprintIndex(),
    updatedAt: new Date().toISOString(),
    imprints: [...deduped.values()],
  }
}

export async function flushClinicalImprintQueue(): Promise<void> {
  if (pendingJobs.size === 0) return

  const batch = [...pendingJobs.values()]
  pendingJobs.clear()

  for (const job of batch) {
    try {
      const metadata = extractClinicalImprint(job)
      if (!metadata) continue

      const record: ClinicalImprintRecord = {
        ...metadata,
        imprintKey: imprintKeyFor(metadata.sourceType, metadata.sourceId),
      }
      upsertClinicalImprint(record, job.caseId)
    } catch {
      // Non-blocking — skip failed extraction
    }
  }

  const caseIds = [...new Set(batch.map((job) => job.caseId))]
  for (const id of caseIds) {
    try {
      const { scheduleIsdmRebuild } = await import('../isdm')
      scheduleIsdmRebuild(id, 'imprint')
    } catch {
      // Non-blocking
    }
  }
}

export function collectDocumentSnapshotJobs(
  caseId: string,
  snapshot: NotionDocumentSnapshot,
  sourceType?: ClinicalSourceType,
): ClinicalImprintJob[] {
  const jobs: ClinicalImprintJob[] = []
  const savedAt = snapshot.savedAt
  const resolvedSourceType = sourceType ?? 'manual_note'

  for (const [sectionId, content] of Object.entries(snapshot.sectionContents)) {
    if (!hasClinicalSignal(content)) continue
    jobs.push({
      caseId,
      sourceType: resolvedSourceType,
      sourceId: `${snapshot.documentTypeId}:${sectionId}`,
      text: content,
      sourceDate: savedAt,
      documentTypeId: snapshot.documentTypeId,
      sectionLabel: sectionId,
    })
  }

  const combined = Object.values(snapshot.sectionContents).join('\n\n').trim()
  if (hasClinicalSignal(combined)) {
    jobs.push({
      caseId,
      sourceType: resolvedSourceType,
      sourceId: `${snapshot.documentTypeId}:document`,
      text: combined,
      sourceDate: savedAt,
      documentTypeId: snapshot.documentTypeId,
    })
  }

  return jobs
}

export function scheduleDocumentSnapshotImprints(
  caseId: string,
  snapshot: NotionDocumentSnapshot,
  sourceType?: ClinicalSourceType,
): void {
  for (const job of collectDocumentSnapshotJobs(caseId, snapshot, sourceType)) {
    scheduleClinicalImprint(job)
  }
}

export function collectDiagnosisJobs(caseId: string, entries: DiagnoseEntry[]): ClinicalImprintJob[] {
  const jobs: ClinicalImprintJob[] = []
  for (const entry of entries) {
    const label = entry.icd10.label.trim()
    const code = entry.icd10.code.trim()
    const text = [code, label].filter(Boolean).join(' — ')
    if (!hasClinicalSignal(text)) continue

    jobs.push({
      caseId,
      sourceType: 'diagnosis',
      sourceId: entry.id,
      text,
      sourceDate: entry.updatedAt ?? entry.createdAt,
      evidenceStrength: 'direct_observation',
    })
  }
  return jobs
}

export function scheduleDiagnosisImprints(caseId: string, entries: DiagnoseEntry[]): void {
  for (const job of collectDiagnosisJobs(caseId, entries)) {
    scheduleClinicalImprint(job)
  }
}

export function collectTimelineJobs(caseId: string, timelines: SavedTimeline[]): ClinicalImprintJob[] {
  const jobs: ClinicalImprintJob[] = []
  for (const timeline of timelines) {
    for (const entry of timeline.entries) {
      const text = [entry.heading, entry.subheading].filter(Boolean).join(': ')
      if (!hasClinicalSignal(text)) continue

      jobs.push({
        caseId,
        sourceType: 'manual_note',
        sourceId: `timeline:${timeline.id}:${entry.id}`,
        text,
        sourceDate: entry.displayDate || timeline.updatedAt,
        sectionLabel: entry.heading,
      })
    }
  }
  return jobs
}

export function scheduleTimelineImprints(caseId: string, timelines: SavedTimeline[]): void {
  for (const job of collectTimelineJobs(caseId, timelines)) {
    scheduleClinicalImprint(job)
  }
}

export function collectLabGraphJobs(caseId: string, graphs: SavedLabGraph[]): ClinicalImprintJob[] {
  const jobs: ClinicalImprintJob[] = []
  for (const graph of graphs) {
    for (const entry of graph.entries) {
      const text = [
        entry.parameter,
        `${entry.value} ${entry.unit}`.trim(),
        entry.note,
      ]
        .filter(Boolean)
        .join(' — ')
      if (!hasClinicalSignal(text)) continue

      jobs.push({
        caseId,
        sourceType: 'lab',
        sourceId: `lab:${graph.id}:${entry.id}`,
        text,
        sourceDate: entry.date || entry.updatedAt,
        evidenceStrength: 'direct_observation',
      })
    }

    for (const marker of graph.markers) {
      const text = [
        marker.medicationName,
        marker.dose ? `${marker.dose} ${marker.doseUnit}`.trim() : '',
        marker.changeType,
        marker.note,
      ]
        .filter(Boolean)
        .join(' — ')
      if (!hasClinicalSignal(text)) continue

      jobs.push({
        caseId,
        sourceType: 'medication',
        sourceId: `med-marker:${graph.id}:${marker.id}`,
        text,
        sourceDate: marker.date || marker.updatedAt,
        documentTypeId: 'medikation',
        evidenceStrength: 'direct_observation',
      })
    }
  }
  return jobs
}

export function scheduleLabGraphImprints(caseId: string, graphs: SavedLabGraph[]): void {
  for (const job of collectLabGraphJobs(caseId, graphs)) {
    scheduleClinicalImprint(job)
  }
}

export function scheduleVerlaufFeedImprint(
  caseId: string,
  entry: { id: string; date: string; content: string; pageType: string; sectionLabel?: string; source?: string },
): void {
  scheduleClinicalImprint({
    caseId,
    sourceType: entry.source === 'ai-accepted' ? 'ai_generation' : 'verlauf',
    sourceId: `verlauf-feed:${entry.id}`,
    text: entry.content,
    sourceDate: entry.date,
    documentTypeId: entry.pageType,
    sectionLabel: entry.sectionLabel,
    evidenceStrength: entry.source === 'ai-accepted' ? 'inferred' : 'patient_report',
  })
}

export function scheduleAiGenerationImprint(
  caseId: string,
  input: {
    documentTypeId: string
    sectionId?: string | null
    sectionLabel?: string
    text: string
    generatedAt?: string
  },
): void {
  scheduleClinicalImprint({
    caseId,
    sourceType: 'ai_generation',
    sourceId: `ai:${input.documentTypeId}:${input.sectionId ?? 'document'}`,
    text: input.text,
    sourceDate: input.generatedAt ?? new Date().toISOString(),
    documentTypeId: input.documentTypeId,
    sectionLabel: input.sectionLabel,
    evidenceStrength: 'inferred',
  })
}

export function collectPayloadImprintJobs(
  caseId: string,
  payload: {
    documents?: Record<string, NotionDocumentSnapshot | undefined>
    diagnoses?: DiagnoseEntry[]
    timelines?: SavedTimeline[]
    labGraphs?: SavedLabGraph[]
  },
): ClinicalImprintJob[] {
  const jobs: ClinicalImprintJob[] = []

  for (const snapshot of Object.values(payload.documents ?? {})) {
    if (!snapshot) continue
    jobs.push(...collectDocumentSnapshotJobs(caseId, snapshot))
  }

  if (Array.isArray(payload.diagnoses)) {
    jobs.push(...collectDiagnosisJobs(caseId, payload.diagnoses))
  }

  if (Array.isArray(payload.timelines)) {
    jobs.push(...collectTimelineJobs(caseId, payload.timelines))
  }

  if (Array.isArray(payload.labGraphs)) {
    jobs.push(...collectLabGraphJobs(caseId, payload.labGraphs))
  }

  return jobs
}
