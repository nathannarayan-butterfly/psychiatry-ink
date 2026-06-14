import type {
  KbContributionDiscussion,
  KbContributionVote,
  KbContributionVoteSummary,
  KbContributionVoteValue,
} from '../../src/types/kbContributions'
import { getKbAdminApprovalThreshold } from './kbAdminAuth'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

function mapDiscussionRow(row: Record<string, unknown>): KbContributionDiscussion {
  return {
    id: String(row.id),
    contributionId: row.contribution_id ? String(row.contribution_id) : null,
    substanceId: row.substance_id ? String(row.substance_id) : null,
    authorUserId: String(row.author_user_id),
    authorDisplayName: row.author_display_name ? String(row.author_display_name) : null,
    body: String(row.body),
    createdAt: String(row.created_at),
  }
}

function mapVoteRow(row: Record<string, unknown>): KbContributionVote {
  return {
    id: String(row.id),
    contributionId: String(row.contribution_id),
    voterUserId: String(row.voter_user_id),
    vote: row.vote as KbContributionVoteValue,
    createdAt: String(row.created_at),
  }
}

export async function listKbContributionDiscussions(filters: {
  contributionId?: string | null
  substanceId?: string | null
}): Promise<KbContributionDiscussion[]> {
  const supabase = getKbSupabaseAdmin()
  let query = supabase
    .from('kb_contribution_discussions')
    .select('*')
    .order('created_at', { ascending: true })

  if (filters.contributionId) {
    query = query.eq('contribution_id', filters.contributionId)
  } else if (filters.substanceId) {
    query = query.eq('substance_id', filters.substanceId).is('contribution_id', null)
  } else {
    return []
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => mapDiscussionRow(row as Record<string, unknown>))
}

export async function countKbContributionDiscussions(filters: {
  contributionId?: string | null
  substanceId?: string | null
}): Promise<number> {
  const supabase = getKbSupabaseAdmin()
  let query = supabase
    .from('kb_contribution_discussions')
    .select('*', { count: 'exact', head: true })

  if (filters.contributionId) {
    query = query.eq('contribution_id', filters.contributionId)
  } else if (filters.substanceId) {
    query = query.eq('substance_id', filters.substanceId)
  } else {
    return 0
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function addKbContributionDiscussion(input: {
  contributionId?: string | null
  substanceId?: string | null
  authorUserId: string
  authorDisplayName?: string | null
  body: string
}): Promise<KbContributionDiscussion> {
  if (!input.contributionId && !input.substanceId) {
    throw new Error('contributionId or substanceId required')
  }
  const body = input.body.trim()
  if (!body) throw new Error('body is required')

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_contribution_discussions')
    .insert({
      contribution_id: input.contributionId ?? null,
      substance_id: input.substanceId ?? null,
      author_user_id: input.authorUserId,
      author_display_name: input.authorDisplayName ?? null,
      body,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapDiscussionRow(data as Record<string, unknown>)
}

export async function listKbContributionVotes(contributionId: string): Promise<KbContributionVote[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_contribution_votes')
    .select('*')
    .eq('contribution_id', contributionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => mapVoteRow(row as Record<string, unknown>))
}

export async function upsertKbContributionVote(input: {
  contributionId: string
  voterUserId: string
  vote: KbContributionVoteValue
}): Promise<KbContributionVote> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_contribution_votes')
    .upsert(
      {
        contribution_id: input.contributionId,
        voter_user_id: input.voterUserId,
        vote: input.vote,
      },
      { onConflict: 'contribution_id,voter_user_id' },
    )
    .select('*')
    .single()
  if (error) throw error
  return mapVoteRow(data as Record<string, unknown>)
}

export async function getKbContributionVoteSummary(
  contributionId: string,
  voterUserId?: string | null,
): Promise<KbContributionVoteSummary> {
  const votes = await listKbContributionVotes(contributionId)
  const approve = votes.filter((vote) => vote.vote === 'approve').length
  const reject = votes.filter((vote) => vote.vote === 'reject').length
  const abstain = votes.filter((vote) => vote.vote === 'abstain').length
  const threshold = getKbAdminApprovalThreshold()
  const myVote = voterUserId
    ? votes.find((vote) => vote.voterUserId === voterUserId)?.vote ?? null
    : null

  return {
    contributionId,
    approve,
    reject,
    abstain,
    threshold,
    myVote,
    canPublish: approve >= threshold && reject === 0,
    isRejected: reject > 0 && approve < threshold,
  }
}
