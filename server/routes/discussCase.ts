import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveAccountId } from '../middleware/auth'
import { recordUserAuditLog } from '../services/auditLog'
import { llmResultModel } from '../services/safeLlmEgress'
import { runAiFeature } from '../ai/runAiFeature'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiQuota, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import {
  clinicalLanguagePromptInstruction,
  requireClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { canAccessCase, getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import { isKbAdminConfigured } from '../services/kbSupabaseAdmin'
import { assertPermission, hasPermission } from '../services/discussCasePermissions'
import {
  deidentifyPackageContent,
  deidentifyText,
  resolvePackageForViewer,
} from '../services/discussCaseDeidentify'
import {
  acceptInvite,
  addAnnotation,
  addMessage,
  addVoiceMessage,
  archiveDiscussion,
  createDiscussion,
  createInvite,
  deleteDiscussion,
  deleteMessage,
  getDiscussion,
  getLatestPackages,
  getMessage,
  getParticipant,
  listAnnotations,
  listAuditLogs,
  listDiscussionsForCase,
  listInvites,
  listMessages,
  listParticipants,
  previewInvitePackage,
  recordAiRequest,
  resolveAnnotation,
  revokeInvite,
  revokeParticipant,
  toggleMessageReaction,
  updateMessage,
  writeAuditLog,
} from '../services/discussCaseStore'
import type { StoredPackageContent } from '../services/discussCaseStore'
import { downloadDiscussVoiceMessage } from '../services/discussCaseVoiceStorage'
import {
  isVoiceAttachmentExpired,
  resolveDiscussCaseVoiceRetentionDays,
  resolveVoiceAttachmentExpiresAt,
} from '../services/discussCaseVoiceRetention'
import type {
  DiscussCasePermission,
  DiscussPackageContent,
} from '../../src/types/discussCase'
import { pathParam } from '../utils/expressParams'
import {
  mapDiscussCaseCreateError,
  mapDiscussCaseHttpError,
} from '../utils/discussCaseErrors'

export const discussCaseRouter: Router = createRouter()

const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

function requireSupabase(res: Response): boolean {
  if (!isKbAdminConfigured()) {
    res.status(503).json({
      error: 'DiscussCase requires Supabase configuration (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

async function loadSession(req: Request, res: Response, discussionId: string) {
  const userId = requireAuth(req, res)
  if (!userId) return null
  if (!requireSupabase(res)) return null

  const discussion = await getDiscussion(discussionId)
  if (!discussion) {
    res.status(404).json({ error: 'Discussion not found' })
    return null
  }

  const participant = await getParticipant(discussionId, userId)
  if (!participant) {
    res.status(403).json({ error: 'Not a participant' })
    return null
  }

  const packages = await getLatestPackages(discussionId)
  const canViewIdentified = hasPermission(participant.permissions, 'view_identified_data')
  const packageContent = packages.identified && packages.deidentified
    ? resolvePackageForViewer(
        packages.identified.content,
        packages.deidentified.content,
        canViewIdentified,
      )
    : packages.identified?.content ?? packages.deidentified?.content ?? null

  return {
    userId,
    discussion,
    participant,
    permissions: participant.permissions,
    packageContent,
    packages,
  }
}

// GET /api/discuss-case?caseId=...
discussCaseRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res)
    if (!userId || !requireSupabase(res)) return

    const caseId = typeof req.query.caseId === 'string' ? req.query.caseId.trim() : ''
    if (!caseId) {
      res.status(400).json({ error: 'caseId required' })
      return
    }

    const discussions = await listDiscussionsForCase(caseId, userId)
    res.json({ discussions })
  } catch (error) {
    console.error('[discuss-case] list failed:', error)
    res.status(500).json({ error: 'Failed to list discussions' })
  }
})

// POST /api/discuss-case — create discussion + package
discussCaseRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res)
    if (!userId || !requireSupabase(res)) return

    const body = req.body ?? {}
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const identifiedContent = body.packageContent as StoredPackageContent | undefined
    const deidentifiedContent = body.deidentifiedPackageContent as DiscussPackageContent | undefined
    const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : null

    if (!caseId || !title || !identifiedContent || !deidentifiedContent) {
      res.status(400).json({
        error: mapDiscussCaseHttpError(
          'caseId, title, packageContent, and deidentifiedPackageContent required',
        ),
      })
      return
    }

    const result = await createDiscussion({
      caseId,
      ownerUserId: userId,
      title,
      identifiedContent,
      deidentifiedContent,
      expiresAt,
    })

    res.status(201).json(result)
  } catch (error) {
    console.error('[discuss-case] create failed:', error)
    res.status(500).json({ error: mapDiscussCaseCreateError(error) })
  }
})

// POST /api/discuss-case/invites/accept — must be before /:id routes
discussCaseRouter.post('/invites/accept', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res)
    if (!userId || !requireSupabase(res)) return

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
    if (!token) {
      res.status(400).json({ error: 'token required' })
      return
    }

    const result = await acceptInvite({
      token,
      userId,
      displayName: typeof req.body?.displayName === 'string' ? req.body.displayName : null,
    })

    res.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.includes('Invalid') || msg.includes('expired') ? 400 : 500
    console.error('[discuss-case] accept invite failed:', error)
    res.status(status).json({ error: msg })
  }
})

// POST /api/discuss-case/invites/preview
discussCaseRouter.post('/invites/preview', async (req: Request, res: Response) => {
  try {
    if (!requireSupabase(res)) return

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
    if (!token) {
      res.status(400).json({ error: 'token required' })
      return
    }

    const preview = await previewInvitePackage(token)
    res.json(preview)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    res.status(400).json({ error: msg })
  }
})

// POST /api/discuss-case/preview-package
discussCaseRouter.post('/preview-package', async (req: Request, res: Response) => {
  try {
    const identified = req.body?.identifiedContent as DiscussPackageContent | undefined
    const deidentified = req.body?.deidentifiedPackageContent as DiscussPackageContent | undefined
    const viewAs = req.body?.viewAs === 'external' ? 'external' : 'internal'

    if (!identified || !deidentified) {
      res.status(400).json({ error: 'identifiedContent and deidentifiedPackageContent required' })
      return
    }

    const packageContent = viewAs === 'internal' ? identified : deidentified
    res.json({ package: packageContent, viewAs })
  } catch (error) {
    console.error('[discuss-case] preview-package failed:', error)
    res.status(500).json({ error: 'Preview failed' })
  }
})

// GET /api/discuss-case/:id/session
discussCaseRouter.get('/:id/session', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    const [messages, annotations, participants] = await Promise.all([
      listMessages(session.discussion.id),
      listAnnotations(session.discussion.id),
      listParticipants(session.discussion.id),
    ])

    void recordUserAuditLog(session.userId, {
      action: 'discussion_opened',
      caseId: session.discussion.caseId,
      metadata: { discussionId: session.discussion.id },
      req,
    })

    res.json({
      discussion: session.discussion,
      package: session.packageContent,
      participant: session.participant,
      participants,
      permissions: session.permissions,
      messages,
      annotations,
      voiceRetentionDays: resolveDiscussCaseVoiceRetentionDays(),
    })
  } catch (error) {
    console.error('[discuss-case] session failed:', error)
    res.status(500).json({ error: 'Failed to load session' })
  }
})

// GET /api/discuss-case/:id/participants — roster visible to any participant
discussCaseRouter.get('/:id/participants', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    const participants = await listParticipants(session.discussion.id)
    res.json({ participants })
  } catch (error) {
    console.error('[discuss-case] list participants failed:', error)
    res.status(500).json({ error: 'Failed to list participants' })
  }
})

// POST /api/discuss-case/:id/participants/:participantId/revoke
discussCaseRouter.post(
  '/:id/participants/:participantId/revoke',
  async (req: Request, res: Response) => {
    try {
      const session = await loadSession(req, res, pathParam(req, 'id'))
      if (!session) return

      assertPermission(session.permissions, 'manage_discussion')

      const participant = await revokeParticipant({
        participantId: pathParam(req, 'participantId'),
        discussionId: session.discussion.id,
        actorUserId: session.userId,
      })

      res.json({ participant })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed'
      const status = msg.startsWith('Missing permission')
        ? 403
        : msg.includes('not found') || msg.includes('Cannot revoke')
          ? 400
          : 500
      console.error('[discuss-case] revoke participant failed:', error)
      res.status(status).json({ error: msg })
    }
  },
)

// POST /api/discuss-case/:id/messages
discussCaseRouter.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'send_message')

    const body = typeof req.body?.body === 'string' ? req.body.body : ''
    const quoteExcerpt = req.body?.quoteExcerpt ?? null
    const displayName = typeof req.body?.authorDisplayName === 'string' ? req.body.authorDisplayName : null
    const replyToMessageId =
      typeof req.body?.replyToMessageId === 'string' ? req.body.replyToMessageId.trim() : null

    const message = await addMessage({
      discussionId: session.discussion.id,
      authorUserId: session.userId,
      authorDisplayName: displayName,
      body,
      quoteExcerpt,
      replyToMessageId,
    })

    res.status(201).json({ message })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission')
      ? 403
      : msg.includes('Reply target not found')
        ? 400
        : 500
    console.error('[discuss-case] message failed:', error)
    res.status(status).json({ error: msg })
  }
})

// POST /api/discuss-case/:id/messages/voice — async voice note attachment
discussCaseRouter.post('/:id/messages/voice', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'send_message')

    const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : ''
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : 'audio/webm'
    const durationMs =
      typeof req.body?.durationMs === 'number' && Number.isFinite(req.body.durationMs)
        ? req.body.durationMs
        : 0
    const replyToMessageId =
      typeof req.body?.replyToMessageId === 'string' ? req.body.replyToMessageId.trim() : null

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 required' })
      return
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const message = await addVoiceMessage({
      discussionId: session.discussion.id,
      authorUserId: session.userId,
      audioBuffer,
      mimeType,
      durationMs,
      replyToMessageId,
    })

    await writeAuditLog({
      discussionId: session.discussion.id,
      actorUserId: session.userId,
      action: 'voice_message_sent',
      details: { messageId: message.id, durationMs: message.voiceAttachment?.durationMs ?? 0 },
    })

    res.status(201).json({ message })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission')
      ? 403
      : msg.includes('too long') || msg.includes('Empty') || msg.includes('Unsupported') || msg.includes('Reply target not found')
        ? 400
        : 500
    console.error('[discuss-case] voice message failed:', error)
    res.status(status).json({ error: msg })
  }
})

// GET /api/discuss-case/:id/messages/:messageId/voice — stream voice attachment
discussCaseRouter.get('/:id/messages/:messageId/voice', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'view_package')

    const message = await getMessage(session.discussion.id, pathParam(req, 'messageId'))
    if (!message || message.messageKind !== 'voice' || !message.voiceAttachment?.storagePath) {
      res.status(404).json({ error: 'Voice message not found' })
      return
    }

    const expiresAt = resolveVoiceAttachmentExpiresAt(
      message.voiceAttachment,
      message.createdAt,
      resolveDiscussCaseVoiceRetentionDays(),
    )
    if (isVoiceAttachmentExpired(expiresAt)) {
      res.status(410).json({ error: 'Voice message expired' })
      return
    }

    const { buffer, mimeType } = await downloadDiscussVoiceMessage(message.voiceAttachment.storagePath)
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'private, no-store')
    res.send(buffer)
  } catch (error) {
    console.error('[discuss-case] voice download failed:', error)
    res.status(500).json({ error: 'Failed to load voice message' })
  }
})

// GET /api/discuss-case/:id/messages — lightweight poll for chat sync
discussCaseRouter.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'view_package')

    const messages = await listMessages(session.discussion.id)
    res.json({ messages })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission') ? 403 : 500
    console.error('[discuss-case] list messages failed:', error)
    res.status(status).json({ error: msg })
  }
})

// POST /api/discuss-case/:id/messages/:messageId/reactions — toggle emoji reaction
discussCaseRouter.post(
  '/:id/messages/:messageId/reactions',
  async (req: Request, res: Response) => {
    try {
      const session = await loadSession(req, res, pathParam(req, 'id'))
      if (!session) return

      assertPermission(session.permissions, 'comment')

      const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() : ''
      if (!emoji) {
        res.status(400).json({ error: 'emoji required' })
        return
      }

      const message = await toggleMessageReaction({
        messageId: pathParam(req, 'messageId'),
        discussionId: session.discussion.id,
        userId: session.userId,
        emoji,
      })

      res.json({ message })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed'
      const status = msg.startsWith('Missing permission')
        ? 403
        : msg.includes('not found')
          ? 404
          : msg.includes('Invalid emoji')
            ? 400
            : 500
      console.error('[discuss-case] reaction failed:', error)
      res.status(status).json({ error: msg })
    }
  },
)

// PATCH /api/discuss-case/:id/messages/:messageId — edit own message
discussCaseRouter.patch('/:id/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'send_message')

    const body = typeof req.body?.body === 'string' ? req.body.body : ''
    if (!body.trim()) {
      res.status(400).json({ error: 'Message body required' })
      return
    }

    const message = await updateMessage({
      messageId: pathParam(req, 'messageId'),
      discussionId: session.discussion.id,
      authorUserId: session.userId,
      body,
    })

    res.json({ message })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission')
      ? 403
      : msg.includes('not found')
        ? 404
        : 500
    console.error('[discuss-case] edit message failed:', error)
    res.status(status).json({ error: msg })
  }
})

// DELETE /api/discuss-case/:id/messages/:messageId — delete own message
discussCaseRouter.delete('/:id/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'send_message')

    await deleteMessage({
      messageId: pathParam(req, 'messageId'),
      discussionId: session.discussion.id,
      actorUserId: session.userId,
      canManageDiscussion: hasPermission(session.permissions, 'manage_discussion'),
    })

    res.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission')
      ? 403
      : msg.includes('not found')
        ? 404
        : 500
    console.error('[discuss-case] delete message failed:', error)
    res.status(status).json({ error: msg })
  }
})

// POST /api/discuss-case/:id/annotations
discussCaseRouter.post('/:id/annotations', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'highlight')

    const body = req.body ?? {}
    const sectionId = String(body.sectionId ?? body.sectionKey ?? '')
    const startOffset = Number(body.startOffset)
    const endOffset = Number(body.endOffset)
    if (!sectionId || !Number.isFinite(startOffset) || !Number.isFinite(endOffset) || endOffset <= startOffset) {
      res.status(400).json({ error: 'Invalid annotation range' })
      return
    }

    const annotation = await addAnnotation({
      discussionId: session.discussion.id,
      authorUserId: session.userId,
      sectionId,
      startOffset,
      endOffset,
      highlightedText: String(body.highlightedText ?? ''),
      commentBody: typeof body.commentBody === 'string' ? body.commentBody : null,
    })

    res.status(201).json({ annotation })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission') ? 403 : 500
    console.error('[discuss-case] annotation failed:', error)
    res.status(status).json({ error: msg })
  }
})

// POST /api/discuss-case/:id/annotations/:annotationId/resolve
discussCaseRouter.post('/:id/annotations/:annotationId/resolve', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'comment')

    const annotation = await resolveAnnotation({
      annotationId: pathParam(req, 'annotationId'),
      discussionId: session.discussion.id,
      resolvedBy: session.userId,
    })

    res.json({ annotation })
  } catch (error) {
    console.error('[discuss-case] resolve annotation failed:', error)
    res.status(500).json({ error: 'Failed to resolve annotation' })
  }
})

// POST /api/discuss-case/:id/invites
discussCaseRouter.post('/:id/invites', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'invite_others')

    const body = req.body ?? {}
    const inviteType = body.inviteType === 'external' ? 'external' : 'internal'
    const invite = await createInvite({
      discussionId: session.discussion.id,
      invitedBy: session.userId,
      inviteeEmail: typeof body.inviteeEmail === 'string' ? body.inviteeEmail : undefined,
      inviteeUsername: typeof body.inviteeUsername === 'string' ? body.inviteeUsername : undefined,
      inviteType,
      permissions: Array.isArray(body.permissions) ? body.permissions as DiscussCasePermission[] : undefined,
      expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
    })

    if (inviteType === 'external') {
      void recordUserAuditLog(session.userId, {
        action: 'external_consultant_invited',
        caseId: session.discussion.caseId,
        metadata: { module: 'discuss-case', discussionId: session.discussion.id, inviteId: invite.id },
        req,
      })
      void recordUserAuditLog(session.userId, {
        action: 'discussion_invite_external',
        caseId: session.discussion.caseId,
        metadata: { discussionId: session.discussion.id, inviteId: invite.id },
        req,
      })
    }

    res.status(201).json({ invite })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission') ? 403 : 500
    console.error('[discuss-case] invite failed:', error)
    res.status(status).json({ error: msg })
  }
})

// GET /api/discuss-case/:id/invites
discussCaseRouter.get('/:id/invites', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'manage_discussion')

    const invites = await listInvites(session.discussion.id)
    res.json({ invites })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission') ? 403 : 500
    res.status(status).json({ error: msg })
  }
})

// POST /api/discuss-case/:id/invites/:inviteId/revoke
discussCaseRouter.post('/:id/invites/:inviteId/revoke', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'manage_discussion')

    await revokeInvite({
      inviteId: pathParam(req, 'inviteId'),
      discussionId: session.discussion.id,
      actorUserId: session.userId,
    })

    res.json({ ok: true })
  } catch (error) {
    console.error('[discuss-case] revoke invite failed:', error)
    res.status(500).json({ error: 'Failed to revoke invite' })
  }
})

// POST /api/discuss-case/:id/ask-ai
discussCaseRouter.post('/:id/ask-ai', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'ask_ai')

    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
    if (!question) {
      res.status(400).json({ error: 'question required' })
      return
    }

    const tier: AiModelTier = VALID_TIERS.includes(req.body?.tier as AiModelTier)
      ? (req.body.tier as AiModelTier)
      : 'standard'

    const language = requireClinicalLanguage(req, res, req.body?.language)
    if (!language) return

    const org = await getCurrentOrganisation(session.userId, req.headers[ORG_HEADER])
    const aiAllowed = await canAccessCase(
      session.userId,
      session.discussion.caseId,
      'ai.use',
      org?.id,
    )
    if (!aiAllowed) {
      res.status(403).json({ error: 'Keine Berechtigung für KI in diesem Fall' })
      return
    }

    if (!(await assertAiQuota(req, res))) return

    // The identified package is E2EE ciphertext the server cannot read, so AI
    // context is always built from the de-identified (plaintext) package. This
    // also matches the assistant's mandate to reason over de-identified data.
    //
    // SECURITY: the stored de-identified package was uploaded by the client and
    // carries a client-asserted `isDeidentified` flag. We do NOT trust it — the
    // redactor is re-run server-side here before the text reaches the provider,
    // so any identifier the client's de-id missed is scrubbed authoritatively.
    const storedDeidentified = session.packages.deidentified?.content
    const deidentified = storedDeidentified
      ? deidentifyPackageContent(storedDeidentified, undefined, storedDeidentified.patientLabel ?? 'Patient')
      : undefined
    const contextText = deidentified && Array.isArray(deidentified.sections)
      ? deidentified.sections
          .map((section) => `## ${section.label}\n${section.content}`)
          .join('\n\n')
          .slice(0, 12000)
      : '(no package content)'

    // The clinician's free-text question can also leak identifiers — redact it
    // server-side before it is sent to the external provider.
    const safeQuestion = deidentifyText(question)

    const systemPrompt = [
      'You are a clinical psychiatry assistant helping clinicians discuss a de-identified case package.',
      'Answer based ONLY on the provided discussion package context.',
      'Never suggest modifying the permanent medical record. Provide draft reasoning only.',
      'If context is insufficient, say so clearly.',
      clinicalLanguagePromptInstruction(language),
    ].join(' ')

    const userPrompt = [
      `Discussion package for ${deidentified?.patientLabel ?? 'patient'}:`,
      contextText,
      '',
      `Question: ${safeQuestion}`,
    ].join('\n')

    const usageContext = await resolveUsageContextFromRequest(req, session.userId, {
      caseId: session.discussion.caseId,
      featureKey: 'discuss_case_ai',
      metadata: { route: 'discuss-case-ask-ai', tier, discussionId: session.discussion.id },
    })

    const result = await runAiFeature({
      featureKey: 'discuss_case_ai',
      tier,
      systemPrompt,
      userPrompt,
      usageContext,
    })

    await recordAiRequest({
      discussionId: session.discussion.id,
      requesterUserId: session.userId,
      // Store the redacted question — never persist raw PHI in the AI request log.
      prompt: safeQuestion,
      responseText: result.text.trim(),
    })

    void recordAiGenerationUsed(req, session.userId, {
      caseId: session.discussion.caseId,
      metadata: { route: 'discuss-case-ask-ai', tier, discussionId: session.discussion.id },
    })

    res.json({
      answer: result.text.trim(),
      model: llmResultModel(result),
      draft: true,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission') ? 403 : 500
    console.error('[discuss-case] ask-ai failed:', error)
    res.status(status).json({ error: msg })
  }
})

// POST /api/discuss-case/:id/archive — archive or revoke + purge identified data
discussCaseRouter.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'manage_discussion')

    const status = req.body?.status === 'revoked' ? 'revoked' : 'archived'
    const discussion = await archiveDiscussion({
      discussionId: session.discussion.id,
      actorUserId: session.userId,
      status,
    })

    res.json({ discussion })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission') ? 403 : 500
    console.error('[discuss-case] archive failed:', error)
    res.status(status).json({ error: msg })
  }
})

// DELETE /api/discuss-case/:id — permanently remove a discussion.
// The owner/creator can delete at any status (incl. while locked out of the
// E2EE package), since deletion operates on row ids and never decrypts. Other
// managers keep the archived-only safety rail.
discussCaseRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    const isOwner = session.discussion.ownerUserId === session.userId

    if (!isOwner) {
      assertPermission(session.permissions, 'manage_discussion')
      if (session.discussion.status !== 'archived') {
        res.status(400).json({
          error: 'Nur archivierte Besprechungen können gelöscht werden. Bitte zuerst archivieren.',
        })
        return
      }
    }

    await deleteDiscussion({
      discussionId: session.discussion.id,
      actorUserId: session.userId,
      requireArchived: !isOwner,
    })

    res.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission')
      ? 403
      : msg.includes('Only archived')
        ? 400
        : 500
    console.error('[discuss-case] delete failed:', error)
    res.status(status).json({ error: msg })
  }
})

// GET /api/discuss-case/:id/audit-logs
discussCaseRouter.get('/:id/audit-logs', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    assertPermission(session.permissions, 'manage_discussion')

    const logs = await listAuditLogs(session.discussion.id)
    res.json({ logs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg.startsWith('Missing permission') ? 403 : 500
    res.status(status).json({ error: msg })
  }
})
