import { randomUUID } from 'node:crypto'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

/**
 * Supabase-backed data access for the AI generation usage log.
 *
 * The authoritative credit balance and its atomic reservation/refund still live
 * in the local Prisma/SQLite `CreditBalance` table (see services/credits.ts).
 * GenerationLog is a non-authoritative audit/metadata record and was never part
 * of the money-atomic transaction, so moving it here does not split atomicity.
 *
 * All writes use the service_role admin client, which bypasses RLS; ownership is
 * therefore enforced explicitly in the route layer (userId from requireRouteAuth).
 */

const TABLE = 'GenerationLog'

export interface GenerationLogRow {
  id: string
  createdAt: string
  completedAt: string | null
  userId: string | null
  organisationId: string | null
  documentType: string
  aiMode: string
  inputTextLength: number
  estimatedInputTokens: number
  estimatedCredits: number
  provider: string | null
  model: string | null
  status: string
  errorMessage: string | null
  tool: string | null
  scope: string | null
  schemaId: string | null
  resultTextLength: number | null
  creditsDeducted: boolean
}

export interface CreateGenerationLogInput {
  userId: string | null
  organisationId: string | null
  documentType: string
  aiMode: string
  inputTextLength: number
  estimatedInputTokens: number
  estimatedCredits: number
  provider?: string | null
  model?: string | null
  tool?: string | null
  scope?: string | null
  schemaId?: string | null
  status: string
  creditsDeducted: boolean
}

export interface UpdateGenerationLogInput {
  status: string
  errorMessage: string | null
  resultTextLength: number | null
  provider: string | null
  model: string | null
  completedAt: string
  creditsDeducted: boolean
}

export async function createGenerationLog(
  input: CreateGenerationLogInput,
): Promise<{ id: string }> {
  const admin = getKbSupabaseAdmin()
  // The Supabase column has no DB-side default, so the id is generated here and
  // returned to the caller for the later PATCH (finalise) call.
  const id = randomUUID()

  const { data, error } = await admin
    .from(TABLE)
    .insert({
      id,
      userId: input.userId,
      organisationId: input.organisationId,
      documentType: input.documentType,
      aiMode: input.aiMode,
      inputTextLength: input.inputTextLength,
      estimatedInputTokens: input.estimatedInputTokens,
      estimatedCredits: input.estimatedCredits,
      provider: input.provider ?? null,
      model: input.model ?? null,
      tool: input.tool ?? null,
      scope: input.scope ?? null,
      schemaId: input.schemaId ?? null,
      status: input.status,
      creditsDeducted: input.creditsDeducted,
    })
    .select('id')
    .single()

  if (error) throw new Error(`generationLog insert failed: ${error.message}`)
  return { id: data?.id ? String(data.id) : id }
}

export async function findGenerationLogById(id: string): Promise<GenerationLogRow | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`generationLog lookup failed: ${error.message}`)
  return (data as GenerationLogRow | null) ?? null
}

export async function updateGenerationLog(
  id: string,
  input: UpdateGenerationLogInput,
): Promise<{ id: string; status: string }> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from(TABLE)
    .update({
      status: input.status,
      errorMessage: input.errorMessage,
      resultTextLength: input.resultTextLength,
      provider: input.provider,
      model: input.model,
      completedAt: input.completedAt,
      creditsDeducted: input.creditsDeducted,
    })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) throw new Error(`generationLog update failed: ${error.message}`)
  return { id: String(data?.id ?? id), status: String(data?.status ?? input.status) }
}
