import { MessageSquare, Send, ThumbsDown, ThumbsUp, MinusCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  castKbContributionVote,
  fetchKbAdminDiscussions,
  fetchKbContributionVoteSummary,
  postKbAdminDiscussion,
  publishKbContribution,
  rejectKbContribution,
} from '../../services/kbAdminDiscussionsApi'
import type { KbContribution } from '../../types/kbContributions'
import type { KbContributionDiscussion, KbContributionVoteSummary } from '../../types/kbContributions'

interface KbAdminDiscussionsPanelProps {
  userId: string
  displayName: string
  contribution: KbContribution | null
  substanceId: string | null
  onContributionUpdated?: () => void
}

export function KbAdminDiscussionsPanel({
  userId,
  displayName,
  contribution,
  substanceId,
  onContributionUpdated,
}: KbAdminDiscussionsPanelProps) {
  const [discussions, setDiscussions] = useState<KbContributionDiscussion[]>([])
  const [voteSummary, setVoteSummary] = useState<KbContributionVoteSummary | null>(null)
  const [comment, setComment] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [publishNotice, setPublishNotice] = useState<string | null>(null)

  const threadContributionId = contribution?.id ?? null
  const threadSubstanceId = contribution?.substanceId ?? substanceId

  const load = useCallback(async () => {
    if (!threadContributionId && !threadSubstanceId) {
      setDiscussions([])
      setVoteSummary(null)
      return
    }
    setLoading(true)
    setActionError(null)
    try {
      const [discussionList, summary] = await Promise.all([
        fetchKbAdminDiscussions(userId, {
          contributionId: threadContributionId,
          substanceId: threadContributionId ? null : threadSubstanceId,
        }),
        threadContributionId
          ? fetchKbContributionVoteSummary(userId, threadContributionId)
          : Promise.resolve(null),
      ])
      setDiscussions(discussionList)
      setVoteSummary(summary)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [threadContributionId, threadSubstanceId, userId])

  useEffect(() => {
    void load()
  }, [load])

  const handlePostComment = useCallback(async () => {
    const body = comment.trim()
    if (!body || posting) return
    setPosting(true)
    setActionError(null)
    try {
      await postKbAdminDiscussion(userId, {
        contributionId: threadContributionId,
        substanceId: threadContributionId ? null : threadSubstanceId,
        authorDisplayName: displayName,
        body,
      })
      setComment('')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setPosting(false)
    }
  }, [
    comment,
    displayName,
    load,
    posting,
    threadContributionId,
    threadSubstanceId,
    userId,
  ])

  const handleVote = useCallback(
    async (vote: 'approve' | 'reject' | 'abstain') => {
      if (!threadContributionId) return
      setActionError(null)
      try {
        const summary = await castKbContributionVote(userId, threadContributionId, vote)
        setVoteSummary(summary)
        onContributionUpdated?.()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err))
      }
    },
    [onContributionUpdated, threadContributionId, userId],
  )

  const handlePublish = useCallback(async () => {
    if (!threadContributionId) return
    setActionError(null)
    setPublishNotice(null)
    try {
      const result = await publishKbContribution(userId, threadContributionId)
      setPublishNotice(
        result.projectedDrugId
          ? `Published → Psychopharmacologie (${result.projectedDrugId})`
          : 'Contribution accepted',
      )
      onContributionUpdated?.()
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    }
  }, [load, onContributionUpdated, threadContributionId, userId])

  const handleReject = useCallback(async () => {
    if (!threadContributionId) return
    setActionError(null)
    try {
      await rejectKbContribution(userId, threadContributionId, rejectNotes.trim() || undefined)
      onContributionUpdated?.()
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    }
  }, [load, onContributionUpdated, rejectNotes, threadContributionId, userId])

  if (!threadContributionId && !threadSubstanceId) {
    return (
      <aside className="kb-admin-sidebar">
        <p className="kb-admin-empty">Select a substance or contribution to open discussions.</p>
      </aside>
    )
  }

  return (
    <aside className="kb-admin-sidebar">
      <div className="kb-admin-sidebar__header">
        <h3>
          <MessageSquare size={16} aria-hidden />
          Discussions
          <span className="kb-admin-sidebar__count">{discussions.length}</span>
        </h3>
      </div>

      {contribution ? (
        <div className="kb-admin-votes">
          <div className="kb-admin-votes__counts">
            <span className="kb-admin-votes__approve">✓ {voteSummary?.approve ?? 0}</span>
            <span className="kb-admin-votes__reject">✗ {voteSummary?.reject ?? 0}</span>
            <span className="kb-admin-votes__abstain">○ {voteSummary?.abstain ?? 0}</span>
            {voteSummary ? (
              <span className="kb-admin-votes__threshold">need {voteSummary.threshold}</span>
            ) : null}
          </div>
          <div className="kb-admin-votes__actions">
            <button type="button" onClick={() => void handleVote('approve')} title="Approve">
              <ThumbsUp size={14} /> Approve
            </button>
            <button type="button" onClick={() => void handleVote('reject')} title="Reject">
              <ThumbsDown size={14} /> Reject
            </button>
            <button type="button" onClick={() => void handleVote('abstain')} title="Abstain">
              <MinusCircle size={14} /> Abstain
            </button>
          </div>
          {contribution.status === 'pending' && voteSummary?.canPublish ? (
            <button type="button" className="kb-admin-publish-btn" onClick={() => void handlePublish()}>
              Publish to Psychopharmacologie
            </button>
          ) : null}
          {contribution.status === 'pending' ? (
            <div className="kb-admin-reject-box">
              <textarea
                value={rejectNotes}
                onChange={(event) => setRejectNotes(event.target.value)}
                placeholder="Rejection notes (optional)"
                rows={2}
              />
              <button type="button" className="kb-admin-reject-btn" onClick={() => void handleReject()}>
                Reject with notes
              </button>
            </div>
          ) : null}
          <p className="kb-admin-contribution-status">
            Status: <strong>{contribution.status}</strong>
            {contribution.reviewNotes ? ` — ${contribution.reviewNotes}` : ''}
          </p>
        </div>
      ) : null}

      {publishNotice ? <div className="kb-admin-alert">{publishNotice}</div> : null}
      {actionError ? <div className="kb-admin-alert kb-admin-alert--error">{actionError}</div> : null}

      <div className="kb-admin-discussion-thread">
        {loading ? (
          <p className="kb-admin-sub">Loading…</p>
        ) : discussions.length === 0 ? (
          <p className="kb-admin-sub">No comments yet.</p>
        ) : (
          <ul className="kb-admin-discussion-list">
            {discussions.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.authorDisplayName ?? entry.authorUserId}</strong>
                <span className="kb-admin-contribution-meta">{entry.createdAt}</span>
                <p>{entry.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="kb-admin-discussion-compose">
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Admin comment…"
          rows={3}
        />
        <button type="button" disabled={posting || !comment.trim()} onClick={() => void handlePostComment()}>
          <Send size={14} aria-hidden />
          Post
        </button>
      </div>
    </aside>
  )
}
