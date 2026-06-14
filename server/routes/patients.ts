import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { prisma } from '../db'
import { resolveAccountId } from '../middleware/auth'
import { pathParam } from '../utils/expressParams'

export const patientsRouter: Router = createRouter()

/** Non-identifying sync payload — server never receives patient names, DOB, or diagnoses. */
interface CaseRegistryPatchBody {
  lastDocumentType?: string | null
  lastOpened?: string | null
  createdAt?: string | null
}

function toCaseResponse(row: {
  caseId: string
  lastDocumentType: string | null
  lastOpened: Date
  createdAt: Date
}) {
  return {
    caseId: row.caseId,
    lastDocumentType: row.lastDocumentType ?? undefined,
    lastOpened: row.lastOpened.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed || null
}

/**
 * Returns true if the case may be written by this account.
 * A case with no existing row is claimable; an existing row must match.
 */
async function canWriteCase(caseId: string, accountId: string): Promise<boolean> {
  const existing = await prisma.patientCase.findUnique({
    where: { caseId },
    select: { accountId: true },
  })
  return !existing || existing.accountId === accountId
}

/** GET /api/patients — list opaque case codes for the current account. */
patientsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const rows = await prisma.patientCase.findMany({
      where: { accountId },
      orderBy: { lastOpened: 'desc' },
    })
    res.json({ patients: rows.map(toCaseResponse) })
  } catch (error) {
    console.error('[patients] list failed', error)
    res.status(500).json({ error: 'Failed to load patients' })
  }
})

/** POST /api/patients — register a new opaque case code. */
patientsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const body = req.body as { caseId?: string } & CaseRegistryPatchBody
    const caseId = body.caseId?.trim()
    if (!caseId) {
      res.status(400).json({ error: 'caseId is required' })
      return
    }

    if (!(await canWriteCase(caseId, accountId))) {
      res.status(403).json({ error: 'Case belongs to another account' })
      return
    }

    const now = new Date()
    const row = await prisma.patientCase.upsert({
      where: { caseId },
      create: {
        caseId,
        accountId,
        lastDocumentType: normalizeOptionalString(body.lastDocumentType),
        lastOpened: body.lastOpened ? new Date(body.lastOpened) : now,
        createdAt: body.createdAt ? new Date(body.createdAt) : now,
      },
      update: {
        accountId,
        lastDocumentType: normalizeOptionalString(body.lastDocumentType),
        lastOpened: body.lastOpened ? new Date(body.lastOpened) : now,
      },
    })

    res.status(201).json({ patient: toCaseResponse(row) })
  } catch (error) {
    console.error('[patients] create failed', error)
    res.status(500).json({ error: 'Failed to create patient' })
  }
})

/** PATCH /api/patients/:caseId — upsert non-identifying sync metadata for a case code. */
patientsRouter.patch('/:caseId', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const caseId = pathParam(req, 'caseId').trim()
    const body = req.body as CaseRegistryPatchBody

    const existing = await prisma.patientCase.findUnique({ where: { caseId } })
    if (existing && existing.accountId !== accountId) {
      res.status(403).json({ error: 'Case belongs to another account' })
      return
    }
    const now = new Date()

    const row = await prisma.patientCase.upsert({
      where: { caseId },
      create: {
        caseId,
        accountId,
        lastDocumentType: normalizeOptionalString(body.lastDocumentType),
        lastOpened: body.lastOpened ? new Date(body.lastOpened) : now,
        createdAt: body.createdAt ? new Date(body.createdAt) : now,
      },
      update: {
        accountId: existing?.accountId ?? accountId,
        ...(body.lastDocumentType !== undefined
          ? { lastDocumentType: normalizeOptionalString(body.lastDocumentType) }
          : {}),
        ...(body.lastOpened ? { lastOpened: new Date(body.lastOpened) } : {}),
      },
    })

    res.json({ patient: toCaseResponse(row) })
  } catch (error) {
    console.error('[patients] patch failed', error)
    res.status(500).json({ error: 'Failed to update patient' })
  }
})
