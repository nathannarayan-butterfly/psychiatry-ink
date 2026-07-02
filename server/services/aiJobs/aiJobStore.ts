import { getKbSupabaseAdmin, isKbAdminConfigured } from '../kbSupabaseAdmin'
import type {
  AiJobDto,
  AiJobKind,
  AiJobParams,
  AiJobPhase,
  AiJobResultMeta,
  AiJobStatus,
} from '../../../shared/aiJobs'

/**
 * Data access for `ai_jobs` (see supabase/migrations/20260713000000_ai_jobs.sql).
 * Follows the userNotesStore pattern: service-role client, every query scoped
 * by the authenticated owner. `input_text`/`result_text` are stored only after
 * the server-side PHI scrub (the route/runner enforce this — this module is a
 * dumb persistence layer).
 */

export function isAiJobStoreConfigured(): boolean {
  return isKbAdminConfigured()
}

export interface AiJobRow extends AiJobDto {
  userId: string
  inputText: string
  attempts: number
}

function mapRow(row: Record<string, unknown>): AiJobRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    caseId: row.case_id != null ? String(row.case_id) : null,
    kind: String(row.kind) as AiJobKind,
    featureKey: String(row.feature_key ?? 'document_generation'),
    status: String(row.status) as AiJobStatus,
    phase: String(row.phase ?? 'queued') as AiJobPhase,
    progressCurrent: Number(row.progress_current ?? 0),
    progressTotal: Number(row.progress_total ?? 0),
    params: (row.params ?? {}) as AiJobParams,
    inputText: String(row.input_text ?? ''),
    inputChars: Number(row.input_chars ?? 0),
    attempts: Number(row.attempts ?? 0),
    resultText: row.result_text != null ? String(row.result_text) : null,
    resultMeta: (row.result_meta ?? null) as AiJobResultMeta | null,
    errorCode: row.error_code != null ? String(row.error_code) : null,
    errorMessage: row.error_message != null ? String(row.error_message) : null,
    seen: Boolean(row.seen),
    savedNoteId: row.saved_note_id != null ? String(row.saved_note_id) : null,
    createdAt: String(row.created_at),
    startedAt: row.started_at != null ? String(row.started_at) : null,
    finishedAt: row.finished_at != null ? String(row.finished_at) : null,
    updatedAt: String(row.updated_at),
  }
}

/** Strip owner + full input text for the API response. */
export function toDto(row: AiJobRow): AiJobDto {
  const { userId: _userId, inputText: _inputText, attempts: _attempts, ...dto } = row
  return dto
}

export interface CreateAiJobInput {
  userId: string
  caseId: string | null
  kind: AiJobKind
  featureKey: string
  params: AiJobParams
  /** Already PHI-scrubbed by the caller. */
  inputText: string
}

export async function createAiJob(input: CreateAiJobInput): Promise<AiJobRow> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('ai_jobs')
    .insert({
      user_id: input.userId,
      case_id: input.caseId,
      kind: input.kind,
      feature_key: input.featureKey,
      params: input.params,
      input_text: input.inputText,
      input_chars: input.inputText.length,
      status: 'queued',
      phase: 'queued',
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

export async function getAiJob(userId: string, jobId: string): Promise<AiJobRow | null> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('ai_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('id', jobId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data as Record<string, unknown>) : null
}

export interface ListAiJobsOptions {
  /** Only jobs in these statuses. */
  statuses?: AiJobStatus[]
  /** Only jobs for this workspace case. */
  caseId?: string
  limit?: number
}

export async function listAiJobs(
  userId: string,
  options: ListAiJobsOptions = {},
): Promise<AiJobRow[]> {
  let query = getKbSupabaseAdmin()
    .from('ai_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20)

  if (options.statuses?.length) query = query.in('status', options.statuses)
  if (options.caseId) query = query.eq('case_id', options.caseId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export interface UpdateAiJobPatch {
  status?: AiJobStatus
  phase?: AiJobPhase
  progressCurrent?: number
  progressTotal?: number
  resultText?: string | null
  resultMeta?: AiJobResultMeta | null
  errorCode?: string | null
  errorMessage?: string | null
  attempts?: number
  seen?: boolean
  savedNoteId?: string | null
  startedAt?: string | null
  finishedAt?: string | null
}

export async function updateAiJob(
  userId: string,
  jobId: string,
  patch: UpdateAiJobPatch,
): Promise<AiJobRow | null> {
  const payload: Record<string, unknown> = {}
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.phase !== undefined) payload.phase = patch.phase
  if (patch.progressCurrent !== undefined) payload.progress_current = patch.progressCurrent
  if (patch.progressTotal !== undefined) payload.progress_total = patch.progressTotal
  if (patch.resultText !== undefined) payload.result_text = patch.resultText
  if (patch.resultMeta !== undefined) payload.result_meta = patch.resultMeta
  if (patch.errorCode !== undefined) payload.error_code = patch.errorCode
  if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage
  if (patch.attempts !== undefined) payload.attempts = patch.attempts
  if (patch.seen !== undefined) payload.seen = patch.seen
  if (patch.savedNoteId !== undefined) payload.saved_note_id = patch.savedNoteId
  if (patch.startedAt !== undefined) payload.started_at = patch.startedAt
  if (patch.finishedAt !== undefined) payload.finished_at = patch.finishedAt

  const { data, error } = await getKbSupabaseAdmin()
    .from('ai_jobs')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', jobId)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data as Record<string, unknown>) : null
}

/**
 * Cooperative cancellation + crash recovery both read the CURRENT status from
 * the DB (the runner's in-memory copy may be stale).
 */
export async function readAiJobStatus(
  userId: string,
  jobId: string,
): Promise<AiJobStatus | null> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('ai_jobs')
    .select('status')
    .eq('user_id', userId)
    .eq('id', jobId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? (String((data as { status: string }).status) as AiJobStatus) : null
}

/**
 * Boot-time recovery: any job still queued/running belongs to a previous
 * process (single-container deploy) and cannot resume mid-LLM-call. Mark it
 * failed with a recognizable code so the client offers a one-click retry.
 */
export async function failStaleActiveJobs(): Promise<number> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('ai_jobs')
    .update({
      status: 'failed',
      phase: 'done',
      error_code: 'server_restart',
      error_message: 'Der Server wurde neu gestartet, bevor die Generierung abgeschlossen war.',
      finished_at: new Date().toISOString(),
    })
    .in('status', ['queued', 'running'])
    .select('id')
  if (error) throw new Error(error.message)
  return (data ?? []).length
}
