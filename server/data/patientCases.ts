import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database } from '../types/database'

/**
 * patientCasesRepo — typed data-access seam for the opaque patient case registry
 * (Prisma `PatientCase` → `patient_cases`).
 *
 * The server stores ONLY the opaque case code + non-identifying sync metadata
 * (no names, DOB, or diagnoses). Every operation is scoped by the authenticated
 * `account_id` in the route. The Prisma `upsert` (which had distinct create vs.
 * update column sets, notably preserving `created_at` on update) is reproduced
 * by explicit read-then-insert/update in the routes via `getCaseByCaseId` +
 * `insertCase`/`updateCase`. The atomic snapshot+case delete is delegated to the
 * `patient_case_delete_with_snapshots` SECURITY DEFINER RPC.
 */

export interface PatientCaseRecord {
  caseId: string
  accountId: string
  lastDocumentType: string | null
  lastOpened: string
  createdAt: string
  updatedAt: string
}

type PatientCaseRow = {
  case_id: string
  account_id: string
  last_document_type: string | null
  last_opened: string
  created_at: string
  updated_at: string
}

function toRecord(row: PatientCaseRow): PatientCaseRecord {
  return {
    caseId: row.case_id,
    accountId: row.account_id,
    lastDocumentType: row.last_document_type,
    lastOpened: row.last_opened,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const CASE_COLUMNS = 'case_id, account_id, last_document_type, last_opened, created_at, updated_at'

/** Read a single case by its opaque id, or null. */
export async function getCaseByCaseId(caseId: string): Promise<PatientCaseRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('patient_cases')
    .select(CASE_COLUMNS)
    .eq('case_id', caseId)
    .maybeSingle()
  if (error) throw new Error(`patient_cases read failed: ${error.message}`)
  return data ? toRecord(data) : null
}

/** List the current account's cases, most-recently-opened first. */
export async function listCasesByAccount(accountId: string): Promise<PatientCaseRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('patient_cases')
    .select(CASE_COLUMNS)
    .eq('account_id', accountId)
    .order('last_opened', { ascending: false })
  if (error) throw new Error(`patient_cases list failed: ${error.message}`)
  return (data ?? []).map(toRecord)
}

export interface InsertCaseInput {
  caseId: string
  accountId: string
  lastDocumentType: string | null
  lastOpened: string
  createdAt: string
}

/** Insert a new case row (Prisma upsert `create` branch). */
export async function insertCase(input: InsertCaseInput): Promise<PatientCaseRecord> {
  const { data, error } = await getSupabaseAdmin()
    .from('patient_cases')
    .insert({
      case_id: input.caseId,
      account_id: input.accountId,
      last_document_type: input.lastDocumentType,
      last_opened: input.lastOpened,
      created_at: input.createdAt,
    })
    .select(CASE_COLUMNS)
    .single()
  if (error) throw new Error(`patient_cases insert failed: ${error.message}`)
  return toRecord(data)
}

export interface UpdateCaseFields {
  accountId?: string
  lastDocumentType?: string | null
  lastOpened?: string
}

/**
 * Update an existing case (Prisma upsert `update` branch). Only provided fields
 * are written; `created_at` is never touched.
 */
export async function updateCase(
  caseId: string,
  fields: UpdateCaseFields,
): Promise<PatientCaseRecord> {
  const patch: Database['public']['Tables']['patient_cases']['Update'] = {}
  if (fields.accountId !== undefined) patch.account_id = fields.accountId
  if (fields.lastDocumentType !== undefined) patch.last_document_type = fields.lastDocumentType
  if (fields.lastOpened !== undefined) patch.last_opened = fields.lastOpened

  const { data, error } = await getSupabaseAdmin()
    .from('patient_cases')
    .update(patch)
    .eq('case_id', caseId)
    .select(CASE_COLUMNS)
    .single()
  if (error) throw new Error(`patient_cases update failed: ${error.message}`)
  return toRecord(data)
}

/**
 * Atomically delete a case and all of its encrypted workspace snapshots, via the
 * SECURITY DEFINER RPC. Preserves the all-or-nothing semantics of the former
 * Prisma `$transaction([deleteMany snapshot, delete case])`.
 */
export async function deleteCaseWithSnapshots(caseId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc('patient_case_delete_with_snapshots', {
    p_case_id: caseId,
  })
  if (error) throw new Error(`patient_case_delete_with_snapshots failed: ${error.message}`)
}
