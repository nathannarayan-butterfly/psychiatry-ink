import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import {
  deleteCaseWithSnapshots,
  getCaseByCaseId,
  insertCase,
  listCasesByAccount,
  updateCase,
  type PatientCaseRecord,
} from '../data/patientCases'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { pathParam } from '../utils/expressParams'

export const patientsRouter: Router = createRouter()

/** Non-identifying sync payload — server never receives patient names, DOB, or diagnoses. */
interface CaseRegistryPatchBody {
  lastDocumentType?: string | null
  lastOpened?: string | null
  createdAt?: string | null
}

function toCaseResponse(row: PatientCaseRecord) {
  return {
    caseId: row.caseId,
    lastDocumentType: row.lastDocumentType ?? undefined,
    lastOpened: new Date(row.lastOpened).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed || null
}

/** GET /api/patients — list opaque case codes for the current account. */
patientsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = requireRouteAuth(req, res)
    if (!accountId) return
    const rows = await listCasesByAccount(accountId)
    res.json({ patients: rows.map(toCaseResponse) })
  } catch (error) {
    console.error('[patients] list failed', error)
    res.status(500).json({ error: 'Failed to load patients' })
  }
})

/** POST /api/patients — register a new opaque case code. */
patientsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const accountId = requireRouteAuth(req, res)
    if (!accountId) return
    const body = req.body as { caseId?: string } & CaseRegistryPatchBody
    const caseId = body.caseId?.trim()
    if (!caseId) {
      res.status(400).json({ error: 'caseId is required' })
      return
    }

    const existing = await getCaseByCaseId(caseId)
    // A case with no existing row is claimable; an existing row must match.
    if (existing && existing.accountId !== accountId) {
      res.status(403).json({ error: 'Case belongs to another account' })
      return
    }

    const now = new Date().toISOString()
    const lastOpened = body.lastOpened ? new Date(body.lastOpened).toISOString() : now
    const row = existing
      ? await updateCase(caseId, {
          accountId,
          lastDocumentType: normalizeOptionalString(body.lastDocumentType),
          lastOpened,
        })
      : await insertCase({
          caseId,
          accountId,
          lastDocumentType: normalizeOptionalString(body.lastDocumentType),
          lastOpened,
          createdAt: body.createdAt ? new Date(body.createdAt).toISOString() : now,
        })

    res.status(201).json({ patient: toCaseResponse(row) })
  } catch (error) {
    console.error('[patients] create failed', error)
    res.status(500).json({ error: 'Failed to create patient' })
  }
})

/** DELETE /api/patients/:caseId — remove opaque case code for the current account. */
patientsRouter.delete('/:caseId', async (req: Request, res: Response) => {
  try {
    const accountId = requireRouteAuth(req, res)
    if (!accountId) return
    const caseId = pathParam(req, 'caseId').trim()

    const existing = await getCaseByCaseId(caseId)
    if (!existing) {
      res.status(404).json({ error: 'Case not found' })
      return
    }
    if (existing.accountId !== accountId) {
      res.status(403).json({ error: 'Case belongs to another account' })
      return
    }

    // Case ids are globally unique; drop any encrypted workspace snapshot for this case
    // (userId may be the Supabase account id or a legacy device id in local dev). The
    // snapshot deletes and the case delete run atomically inside the RPC, preserving the
    // all-or-nothing semantics of the former Prisma $transaction.
    await deleteCaseWithSnapshots(caseId)
    res.status(204).send()
  } catch (error) {
    console.error('[patients] delete failed', error)
    res.status(500).json({ error: 'Failed to delete patient' })
  }
})

/** PATCH /api/patients/:caseId — upsert non-identifying sync metadata for a case code. */
patientsRouter.patch('/:caseId', async (req: Request, res: Response) => {
  try {
    const accountId = requireRouteAuth(req, res)
    if (!accountId) return
    const caseId = pathParam(req, 'caseId').trim()
    const body = req.body as CaseRegistryPatchBody

    const existing = await getCaseByCaseId(caseId)
    if (existing && existing.accountId !== accountId) {
      res.status(403).json({ error: 'Case belongs to another account' })
      return
    }
    const now = new Date().toISOString()

    let row: PatientCaseRecord
    if (existing) {
      row = await updateCase(caseId, {
        accountId: existing.accountId ?? accountId,
        ...(body.lastDocumentType !== undefined
          ? { lastDocumentType: normalizeOptionalString(body.lastDocumentType) }
          : {}),
        ...(body.lastOpened ? { lastOpened: new Date(body.lastOpened).toISOString() } : {}),
      })
    } else {
      row = await insertCase({
        caseId,
        accountId,
        lastDocumentType: normalizeOptionalString(body.lastDocumentType),
        lastOpened: body.lastOpened ? new Date(body.lastOpened).toISOString() : now,
        createdAt: body.createdAt ? new Date(body.createdAt).toISOString() : now,
      })
    }

    res.json({ patient: toCaseResponse(row) })
  } catch (error) {
    console.error('[patients] patch failed', error)
    res.status(500).json({ error: 'Failed to update patient' })
  }
})
