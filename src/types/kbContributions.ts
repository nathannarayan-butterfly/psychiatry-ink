export type KbContributionType =
  | 'edit_field'
  | 'add_drug'
  | 'add_receptor'
  | 'add_side_effect'
  | 'add_monitoring'
  | 'add_preparation'
  | 'add_source'

export type KbContributionStatus = 'pending' | 'accepted' | 'rejected' | 'modified'

export type KbContributionReviewAction = 'accept' | 'reject' | 'modify' | 'comment'

/** Proposed change payload — shape varies by contribution_type. */
export type KbContributionPayload = Record<string, unknown>

export interface KbContribution {
  id: string
  substanceId: string | null
  contributionType: KbContributionType
  status: KbContributionStatus
  payload: KbContributionPayload
  submitterUserId: string | null
  submitterDisplayName: string | null
  licenseAccepted: boolean
  reviewNotes: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface KbContributionReview {
  id: string
  contributionId: string
  action: KbContributionReviewAction
  reviewerId: string | null
  notes: string | null
  createdAt: string
}

export interface SubmitKbContributionInput {
  substanceId?: string | null
  contributionType: KbContributionType
  payload: KbContributionPayload
  submitterUserId?: string | null
  submitterDisplayName?: string | null
  licenseAccepted?: boolean
}

export type KbContributionVoteValue = 'approve' | 'reject' | 'abstain'

export interface KbContributionDiscussion {
  id: string
  contributionId: string | null
  substanceId: string | null
  authorUserId: string
  authorDisplayName: string | null
  body: string
  createdAt: string
}

export interface KbContributionVote {
  id: string
  contributionId: string
  voterUserId: string
  vote: KbContributionVoteValue
  createdAt: string
}

export interface KbContributionVoteSummary {
  contributionId: string
  approve: number
  reject: number
  abstain: number
  threshold: number
  myVote: KbContributionVoteValue | null
  canPublish: boolean
  isRejected: boolean
}

export interface KbSubstanceContributor {
  displayName: string
  contributionCount: number
}
