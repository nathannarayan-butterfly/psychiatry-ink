import type { Request, Response } from 'express'
import {
  applyKbContribution,
  getKbContributionById,
  listAcceptedContributorsBySubstance,
  updateKbContributionStatus,
} from '../services/kbContributionsStore'
import {
  addKbContributionDiscussion,
  getKbContributionVoteSummary,
  listKbContributionDiscussions,
  upsertKbContributionVote,
} from '../services/kbContributionDiscussionsStore'
import { getKbAdminApprovalThreshold, requireKbAdminUser } from '../services/kbAdminAuth'
import { publishKbSubstance } from '../services/kbPublish'
import type { KbContributionVoteValue } from '../../src/types/kbContributions'

const VOTE_VALUES: KbContributionVoteValue[] = ['approve', 'reject', 'abstain']

export async function handleListDiscussions(req: Request, res: Response): Promise<void> {
  try {
    const contributionId =
      typeof req.query.contributionId === 'string' ? req.query.contributionId : undefined
    const substanceId = typeof req.query.substanceId === 'string' ? req.query.substanceId : undefined
    const discussions = await listKbContributionDiscussions({ contributionId, substanceId })
    res.json({ discussions })
  } catch (error) {
    console.error('[kb-admin] list discussions failed:', error)
    res.status(500).json({ error: 'Failed to list discussions' })
  }
}

export async function handleCreateDiscussion(req: Request, res: Response): Promise<void> {
  const actorId = requireKbAdminUser(req, res)
  if (!actorId) return
  try {
    const body = req.body as {
      contributionId?: string | null
      substanceId?: string | null
      authorDisplayName?: string | null
      body?: string
    }
    if (!body.body?.trim()) {
      res.status(400).json({ error: 'body is required' })
      return
    }
    const discussion = await addKbContributionDiscussion({
      contributionId: body.contributionId ?? null,
      substanceId: body.substanceId ?? null,
      authorUserId: actorId,
      authorDisplayName: body.authorDisplayName ?? null,
      body: body.body,
    })
    res.status(201).json({ discussion })
  } catch (error) {
    console.error('[kb-admin] create discussion failed:', error)
    res.status(500).json({ error: 'Failed to create discussion' })
  }
}

export async function handleGetVoteSummary(req: Request, res: Response): Promise<void> {
  try {
    const actorId = requireKbAdminUser(req, res)
    if (!actorId) return
    const summary = await getKbContributionVoteSummary(req.params.contributionId, actorId)
    res.json({ summary })
  } catch (error) {
    console.error('[kb-admin] vote summary failed:', error)
    res.status(500).json({ error: 'Failed to load vote summary' })
  }
}

export async function handleCastVote(req: Request, res: Response): Promise<void> {
  const actorId = requireKbAdminUser(req, res)
  if (!actorId) return
  try {
    const body = req.body as { vote?: string }
    if (!body.vote || !VOTE_VALUES.includes(body.vote as KbContributionVoteValue)) {
      res.status(400).json({ error: 'vote must be approve, reject, or abstain' })
      return
    }
    const vote = await upsertKbContributionVote({
      contributionId: req.params.contributionId,
      voterUserId: actorId,
      vote: body.vote as KbContributionVoteValue,
    })
    const summary = await getKbContributionVoteSummary(req.params.contributionId, actorId)

    if (summary.isRejected) {
      await updateKbContributionStatus(
        req.params.contributionId,
        'rejected',
        `Rejected after ${summary.reject} reject vote(s)`,
        actorId,
      )
    }

    res.json({ vote, summary })
  } catch (error) {
    console.error('[kb-admin] cast vote failed:', error)
    res.status(500).json({ error: 'Failed to cast vote' })
  }
}

export async function handlePublishContribution(req: Request, res: Response): Promise<void> {
  const actorId = requireKbAdminUser(req, res)
  if (!actorId) return
  try {
    const contribution = await getKbContributionById(req.params.contributionId)
    if (!contribution) {
      res.status(404).json({ error: 'Contribution not found' })
      return
    }
    if (contribution.status === 'accepted') {
      res.status(409).json({ error: 'Contribution already accepted' })
      return
    }
    if (contribution.status === 'rejected') {
      res.status(409).json({ error: 'Contribution was rejected' })
      return
    }

    const summary = await getKbContributionVoteSummary(req.params.contributionId, actorId)
    if (!summary.canPublish) {
      res.status(403).json({
        error: `Need ${summary.threshold} approve vote(s) with no reject votes (currently ${summary.approve} approve, ${summary.reject} reject)`,
        summary,
      })
      return
    }

    await applyKbContribution(contribution)
    const updated = await updateKbContributionStatus(
      req.params.contributionId,
      'accepted',
      'Published via admin vote workflow',
      actorId,
    )

    let projectedDrugId: string | null = null
    if (contribution.substanceId) {
      projectedDrugId = await publishKbSubstance(contribution.substanceId)
    }

    res.json({ contribution: updated, projectedDrugId, summary })
  } catch (error) {
    console.error('[kb-admin] publish contribution failed:', error)
    res.status(500).json({ error: 'Failed to publish contribution' })
  }
}

export async function handleRejectContribution(req: Request, res: Response): Promise<void> {
  const actorId = requireKbAdminUser(req, res)
  if (!actorId) return
  try {
    const body = req.body as { notes?: string }
    const updated = await updateKbContributionStatus(
      req.params.contributionId,
      'rejected',
      body.notes?.trim() || 'Rejected by admin',
      actorId,
    )
    res.json({ contribution: updated })
  } catch (error) {
    console.error('[kb-admin] reject contribution failed:', error)
    res.status(500).json({ error: 'Failed to reject contribution' })
  }
}

export async function handleListContributors(req: Request, res: Response): Promise<void> {
  try {
    const substanceId = typeof req.query.substanceId === 'string' ? req.query.substanceId : undefined
    if (!substanceId) {
      res.status(400).json({ error: 'substanceId is required' })
      return
    }
    const contributors = await listAcceptedContributorsBySubstance(substanceId)
    res.json({ contributors })
  } catch (error) {
    console.error('[kb-contributions] list contributors failed:', error)
    res.status(500).json({ error: 'Failed to list contributors' })
  }
}

export function handleAdminConfig(_req: Request, res: Response): void {
  res.json({
    approvalThreshold: getKbAdminApprovalThreshold(),
  })
}
