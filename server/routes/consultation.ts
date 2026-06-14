import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import { recordUserAuditLog } from '../services/auditLog'
import { isKbAdminConfigured } from '../services/kbSupabaseAdmin'
import {
  acceptInvite,
  archiveRequest,
  createConsultationRequest,
  getParticipant,
  getReport,
  getRequest,
  getSharedItems,
  listAuditLogs,
  listMessages,
  listRequestsForCase,
  listRequestsForConsultant,
  markRequestOpened,
  markReviewed,
  previewInvite,
  requestMoreInfo,
  respondToInfoRequest,
  revokeAccess,
  saveReportDraft,
  submitReport,
} from '../services/consultationStore'
import {
  assertParticipantRole,
  canClinicianManage,
  canConsultantWriteReport,
} from '../services/consultationPermissions'
import type { CreateConsultationInput, SaveReportInput } from '../../src/types/consultation'
import { pathParam } from '../utils/expressParams'

export const consultationRouter: Router = createRouter()

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
      error: 'Konsil requires Supabase configuration (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

async function loadSession(req: Request, res: Response, requestId: string) {
  const userId = requireAuth(req, res)
  if (!userId) return null
  if (!requireSupabase(res)) return null

  const request = await getRequest(requestId)
  if (!request) {
    res.status(404).json({ error: 'Consultation request not found' })
    return null
  }

  if (request.revokedAt) {
    res.status(403).json({ error: 'Access revoked' })
    return null
  }

  const participant = await getParticipant(requestId, userId)
  if (!participant) {
    res.status(403).json({ error: 'Not a participant' })
    return null
  }

  const sharedItems = await getSharedItems(requestId)
  const report = await getReport(requestId)
  const messages = await listMessages(requestId)

  return { userId, request, participant, sharedItems, report, messages }
}

// GET /api/consultation?caseId=...
consultationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res)
    if (!userId || !requireSupabase(res)) return

    const caseId = typeof req.query.caseId === 'string' ? req.query.caseId.trim() : ''
    if (caseId) {
      const requests = await listRequestsForCase(caseId, userId)
      res.json({ requests })
      return
    }

    const consultant = req.query.consultant === 'true'
    if (consultant) {
      const requests = await listRequestsForConsultant(userId)
      res.json({ requests })
      return
    }

    res.status(400).json({ error: 'caseId or consultant=true required' })
  } catch (error) {
    console.error('[consultation] list failed:', error)
    res.status(500).json({ error: 'Failed to list consultation requests' })
  }
})

// POST /api/consultation — create request
consultationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res)
    if (!userId || !requireSupabase(res)) return

    const body = (req.body ?? {}) as CreateConsultationInput
    if (!body.caseId?.trim() || !body.specialty?.trim() || !body.title?.trim() || !body.clinicalQuestion?.trim()) {
      res.status(400).json({ error: 'caseId, specialty, title, and clinicalQuestion required' })
      return
    }

    // Security: fully-identified patient data may only be shared with an
    // internal consultant. External / one-time access must be de-identified
    // or pseudonymized so identifiers never leave the org for outside parties.
    const isExternalAccess =
      body.accessType === 'external_consultant' || body.accessType === 'one_time_external'
    if (isExternalAccess && body.patientIdentifierMode === 'full') {
      res.status(400).json({
        error: 'Externer Zugang erfordert De-Identifizierung oder Pseudonymisierung (kein "full" Modus).',
      })
      return
    }

    const result = await createConsultationRequest({
      caseId: body.caseId.trim(),
      clinicianUserId: userId,
      specialty: body.specialty,
      consultantUserId: body.consultantUserId,
      consultantEmail: body.consultantEmail,
      consultantUsername: body.consultantUsername,
      accessType: body.accessType,
      urgency: body.urgency ?? 'routine',
      title: body.title,
      clinicalQuestion: body.clinicalQuestion,
      kurzanamnese: body.kurzanamnese ?? '',
      examinationRequested: Boolean(body.examinationRequested),
      deadline: body.deadline,
      legalConsentNote: body.legalConsentNote,
      patientIdentifierMode: body.patientIdentifierMode ?? 'deidentified',
      sharedItems: body.sharedItems ?? [],
      saveAsDraft: Boolean(body.saveAsDraft),
    })

    if (isExternalAccess) {
      void recordUserAuditLog(userId, {
        action: 'external_consultant_invited',
        caseId: body.caseId.trim(),
        metadata: {
          module: 'consultation',
          requestId: result.request.id,
          accessType: body.accessType,
        },
        req,
      })
    }

    res.status(201).json(result)
  } catch (error) {
    console.error('[consultation] create failed:', error)
    res.status(500).json({ error: 'Failed to create consultation request' })
  }
})

// POST /api/consultation/invites/accept
consultationRouter.post('/invites/accept', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res)
    if (!userId || !requireSupabase(res)) return

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
    if (!token) {
      res.status(400).json({ error: 'token required' })
      return
    }

    const result = await acceptInvite(token, userId)
    res.json(result)
  } catch (error) {
    console.error('[consultation] accept invite failed:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to accept invite' })
  }
})

// GET /api/consultation/invites/preview?token=...
consultationRouter.get('/invites/preview', async (req: Request, res: Response) => {
  try {
    if (!requireSupabase(res)) return

    const token = typeof req.query.token === 'string' ? req.query.token.trim() : ''
    if (!token) {
      res.status(400).json({ error: 'token required' })
      return
    }

    const preview = await previewInvite(token)
    res.json(preview)
  } catch (error) {
    console.error('[consultation] preview invite failed:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid invite' })
  }
})

// GET /api/consultation/:id/session
consultationRouter.get('/:id/session', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    if (canConsultantWriteReport(session.participant.role) && session.request.status === 'sent') {
      await markRequestOpened(pathParam(req, 'id'), session.userId)
      session.request = (await getRequest(pathParam(req, 'id')))!

      void recordUserAuditLog(session.userId, {
        action: 'consultation_packet_opened',
        caseId: session.request.caseId,
        metadata: { requestId: session.request.id, role: session.participant.role },
        req,
      })
    }

    res.json({
      request: session.request,
      sharedItems: session.sharedItems,
      report: session.report,
      participant: session.participant,
      messages: session.messages,
    })
  } catch (error) {
    console.error('[consultation] session failed:', error)
    res.status(500).json({ error: 'Failed to load session' })
  }
})

// POST /api/consultation/:id/report/draft
consultationRouter.post('/:id/report/draft', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    try {
      assertParticipantRole(session.participant.role, [
        'internal_consultant',
        'external_consultant',
        'one_time_external_consultant',
      ])
    } catch {
      res.status(403).json({ error: 'Only consultants can save reports' })
      return
    }

    const body = (req.body ?? {}) as SaveReportInput
    const report = await saveReportDraft(pathParam(req, 'id'), session.userId, body)
    res.json({ report })
  } catch (error) {
    console.error('[consultation] save draft failed:', error)
    res.status(500).json({ error: 'Failed to save report draft' })
  }
})

// POST /api/consultation/:id/report/submit
consultationRouter.post('/:id/report/submit', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    try {
      assertParticipantRole(session.participant.role, [
        'internal_consultant',
        'external_consultant',
        'one_time_external_consultant',
      ])
    } catch {
      res.status(403).json({ error: 'Only consultants can submit reports' })
      return
    }

    const body = (req.body ?? {}) as SaveReportInput
    const report = await submitReport(pathParam(req, 'id'), session.userId, body)
    res.json({ report })
  } catch (error) {
    console.error('[consultation] submit failed:', error)
    res.status(500).json({ error: 'Failed to submit report' })
  }
})

// POST /api/consultation/:id/more-info
consultationRouter.post('/:id/more-info', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    try {
      assertParticipantRole(session.participant.role, [
        'internal_consultant',
        'external_consultant',
        'one_time_external_consultant',
      ])
    } catch {
      res.status(403).json({ error: 'Only consultants can request more information' })
      return
    }

    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (!body) {
      res.status(400).json({ error: 'body required' })
      return
    }

    const message = await requestMoreInfo(pathParam(req, 'id'), session.userId, body)
    res.json({ message })
  } catch (error) {
    console.error('[consultation] more-info failed:', error)
    res.status(500).json({ error: 'Failed to request more information' })
  }
})

// POST /api/consultation/:id/respond
consultationRouter.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    if (!canClinicianManage(session.participant.role)) {
      res.status(403).json({ error: 'Only clinicians can respond' })
      return
    }

    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (!body) {
      res.status(400).json({ error: 'body required' })
      return
    }

    const message = await respondToInfoRequest(pathParam(req, 'id'), session.userId, body)
    res.json({ message })
  } catch (error) {
    console.error('[consultation] respond failed:', error)
    res.status(500).json({ error: 'Failed to send response' })
  }
})

// POST /api/consultation/:id/reviewed
consultationRouter.post('/:id/reviewed', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    if (!canClinicianManage(session.participant.role)) {
      res.status(403).json({ error: 'Only clinicians can mark reviewed' })
      return
    }

    const request = await markReviewed(pathParam(req, 'id'), session.userId)
    res.json({ request })
  } catch (error) {
    console.error('[consultation] reviewed failed:', error)
    res.status(500).json({ error: 'Failed to mark reviewed' })
  }
})

// POST /api/consultation/:id/archive
consultationRouter.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    if (!canClinicianManage(session.participant.role)) {
      res.status(403).json({ error: 'Only clinicians can archive' })
      return
    }

    const request = await archiveRequest(pathParam(req, 'id'), session.userId)
    res.json({ request })
  } catch (error) {
    console.error('[consultation] archive failed:', error)
    res.status(500).json({ error: 'Failed to archive' })
  }
})

// POST /api/consultation/:id/revoke
consultationRouter.post('/:id/revoke', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    if (!canClinicianManage(session.participant.role)) {
      res.status(403).json({ error: 'Only clinicians can revoke access' })
      return
    }

    const request = await revokeAccess(pathParam(req, 'id'), session.userId)
    res.json({ request })
  } catch (error) {
    console.error('[consultation] revoke failed:', error)
    res.status(500).json({ error: 'Failed to revoke access' })
  }
})

// GET /api/consultation/:id/audit-logs
consultationRouter.get('/:id/audit-logs', async (req: Request, res: Response) => {
  try {
    const session = await loadSession(req, res, pathParam(req, 'id'))
    if (!session) return

    if (!canClinicianManage(session.participant.role)) {
      res.status(403).json({ error: 'Only clinicians can view audit logs' })
      return
    }

    const logs = await listAuditLogs(pathParam(req, 'id'))
    res.json({ logs })
  } catch (error) {
    console.error('[consultation] audit logs failed:', error)
    res.status(500).json({ error: 'Failed to list audit logs' })
  }
})
