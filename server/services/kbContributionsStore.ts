import type {
  KbContribution,
  KbContributionStatus,
  SubmitKbContributionInput,
} from '../../src/types/kbContributions'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

function mapContributionRow(row: Record<string, unknown>): KbContribution {
  return {
    id: String(row.id),
    substanceId: row.substance_id ? String(row.substance_id) : null,
    contributionType: row.contribution_type as KbContribution['contributionType'],
    status: row.status as KbContribution['status'],
    payload: (row.payload as Record<string, unknown>) ?? {},
    submitterUserId: row.submitter_user_id ? String(row.submitter_user_id) : null,
    submitterDisplayName: row.submitter_display_name ? String(row.submitter_display_name) : null,
    licenseAccepted: Boolean(row.license_accepted),
    reviewNotes: row.review_notes ? String(row.review_notes) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
  }
}

export async function submitKbContribution(input: SubmitKbContributionInput): Promise<KbContribution> {
  if (input.licenseAccepted !== true) {
    throw new Error('Community contribution license must be accepted')
  }

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_contributions')
    .insert({
      substance_id: input.substanceId ?? null,
      contribution_type: input.contributionType,
      status: 'pending',
      payload: input.payload,
      submitter_user_id: input.submitterUserId ?? null,
      submitter_display_name: input.submitterDisplayName ?? null,
      license_accepted: true,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapContributionRow(data as Record<string, unknown>)
}

export async function listKbContributions(filters?: {
  status?: KbContributionStatus
  limit?: number
}): Promise<KbContribution[]> {
  const supabase = getKbSupabaseAdmin()
  let query = supabase
    .from('kb_contributions')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => mapContributionRow(row as Record<string, unknown>))
}

export async function countPendingKbContributions(): Promise<number> {
  const supabase = getKbSupabaseAdmin()
  const { count, error } = await supabase
    .from('kb_contributions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) throw error
  return count ?? 0
}

export async function getKbContributionById(id: string): Promise<KbContribution | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase.from('kb_contributions').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapContributionRow(data as Record<string, unknown>) : null
}

export async function updateKbContributionStatus(
  id: string,
  status: KbContributionStatus,
  reviewNotes?: string | null,
  reviewedBy?: string | null,
): Promise<KbContribution> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_contributions')
    .update({
      status,
      review_notes: reviewNotes ?? null,
      reviewed_by: reviewedBy ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapContributionRow(data as Record<string, unknown>)
}

/** MVP: apply edit_field to normalized text fields where mappable; other types deferred. */
export async function applyKbContribution(contribution: KbContribution): Promise<void> {
  if (!contribution.substanceId) return

  if (contribution.contributionType === 'edit_field') {
    const payload = contribution.payload
    const sectionKey = typeof payload.sectionKey === 'string' ? payload.sectionKey : null
    const proposedContent =
      typeof payload.proposedContent === 'string' ? payload.proposedContent.trim() : ''
    if (!sectionKey || !proposedContent) return

    const { updateKbSubstance } = await import('./kbNormalizedStore')
    if (sectionKey === 'wirkmechanismus') {
      await updateKbSubstance(
        contribution.substanceId,
        { mechanismSummary: proposedContent },
        'manual_edit',
      )
      return
    }
    if (sectionKey === 'kurzprofil') {
      await updateKbSubstance(
        contribution.substanceId,
        { clinicalPearls: proposedContent },
        'manual_edit',
      )
    }
  }
}

export async function listAcceptedContributorsBySubstance(
  substanceId: string,
): Promise<Array<{ displayName: string; contributionCount: number }>> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_contributions')
    .select('submitter_display_name')
    .eq('substance_id', substanceId)
    .eq('status', 'accepted')
  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const name = row.submitter_display_name ? String(row.submitter_display_name).trim() : ''
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([displayName, contributionCount]) => ({ displayName, contributionCount }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
