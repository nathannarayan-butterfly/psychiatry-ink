import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { prisma } from '../db'
import { resolveAccountId } from '../middleware/auth'

export const patientsRouter: Router = createRouter()

interface PatientPatchBody {
  localName?: string | null
  localVorname?: string | null
  localNachname?: string | null
  localGeburtsdatum?: string | null
  localGeschlecht?: string | null
  localAge?: string | null
  pageHeading?: string | null
  lastDocumentType?: string | null
  lastOpened?: string | null
  createdAt?: string | null
}

interface DiagnosisPayload {
  id: string
  icd10: { code: string; label: string; overridden: boolean }
  icd11: { code: string; label: string; overridden: boolean }
  dsm: { code: string; label: string; overridden: boolean }
  createdAt: string
  updatedAt: string
}

function toPatientResponse(row: {
  caseId: string
  localName: string | null
  localVorname: string | null
  localNachname: string | null
  localGeburtsdatum: string | null
  localGeschlecht: string | null
  localAge: string | null
  pageHeading: string | null
  lastDocumentType: string | null
  lastOpened: Date
  createdAt: Date
}) {
  return {
    caseId: row.caseId,
    localName: row.localName ?? undefined,
    localVorname: row.localVorname ?? undefined,
    localNachname: row.localNachname ?? undefined,
    localGeburtsdatum: row.localGeburtsdatum ?? undefined,
    localGeschlecht: row.localGeschlecht ?? undefined,
    localAge: row.localAge ?? undefined,
    pageHeading: row.pageHeading ?? undefined,
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

/** GET /api/patients — list all cases for the current account. */
patientsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const rows = await prisma.patientCase.findMany({
      where: { accountId },
      orderBy: { lastOpened: 'desc' },
    })
    res.json({ patients: rows.map(toPatientResponse) })
  } catch (error) {
    console.error('[patients] list failed', error)
    res.status(500).json({ error: 'Failed to load patients' })
  }
})

/** POST /api/patients — create a new patient case. */
patientsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const body = req.body as { caseId?: string } & PatientPatchBody
    const caseId = body.caseId?.trim()
    if (!caseId) {
      res.status(400).json({ error: 'caseId is required' })
      return
    }

    const now = new Date()
    const row = await prisma.patientCase.upsert({
      where: { caseId },
      create: {
        caseId,
        accountId,
        localName: normalizeOptionalString(body.localName),
        localVorname: normalizeOptionalString(body.localVorname),
        localNachname: normalizeOptionalString(body.localNachname),
        localGeburtsdatum: normalizeOptionalString(body.localGeburtsdatum),
        localGeschlecht: normalizeOptionalString(body.localGeschlecht),
        localAge: normalizeOptionalString(body.localAge),
        pageHeading: normalizeOptionalString(body.pageHeading),
        lastDocumentType: normalizeOptionalString(body.lastDocumentType),
        lastOpened: body.lastOpened ? new Date(body.lastOpened) : now,
        createdAt: body.createdAt ? new Date(body.createdAt) : now,
      },
      update: {
        accountId,
        localName: normalizeOptionalString(body.localName),
        localVorname: normalizeOptionalString(body.localVorname),
        localNachname: normalizeOptionalString(body.localNachname),
        localGeburtsdatum: normalizeOptionalString(body.localGeburtsdatum),
        localGeschlecht: normalizeOptionalString(body.localGeschlecht),
        localAge: normalizeOptionalString(body.localAge),
        pageHeading: normalizeOptionalString(body.pageHeading),
        lastDocumentType: normalizeOptionalString(body.lastDocumentType),
        lastOpened: body.lastOpened ? new Date(body.lastOpened) : now,
      },
    })

    res.status(201).json({ patient: toPatientResponse(row) })
  } catch (error) {
    console.error('[patients] create failed', error)
    res.status(500).json({ error: 'Failed to create patient' })
  }
})

/** PATCH /api/patients/:caseId — upsert metadata for a case. */
patientsRouter.patch('/:caseId', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const caseId = req.params.caseId.trim()
    const body = req.body as PatientPatchBody

    const existing = await prisma.patientCase.findUnique({ where: { caseId } })
    const now = new Date()

    const row = await prisma.patientCase.upsert({
      where: { caseId },
      create: {
        caseId,
        accountId,
        localName: normalizeOptionalString(body.localName),
        localVorname: normalizeOptionalString(body.localVorname),
        localNachname: normalizeOptionalString(body.localNachname),
        localGeburtsdatum: normalizeOptionalString(body.localGeburtsdatum),
        localGeschlecht: normalizeOptionalString(body.localGeschlecht),
        localAge: normalizeOptionalString(body.localAge),
        pageHeading: normalizeOptionalString(body.pageHeading),
        lastDocumentType: normalizeOptionalString(body.lastDocumentType),
        lastOpened: body.lastOpened ? new Date(body.lastOpened) : now,
        createdAt: body.createdAt ? new Date(body.createdAt) : now,
      },
      update: {
        accountId: existing?.accountId ?? accountId,
        ...(body.localName !== undefined ? { localName: normalizeOptionalString(body.localName) } : {}),
        ...(body.localVorname !== undefined ? { localVorname: normalizeOptionalString(body.localVorname) } : {}),
        ...(body.localNachname !== undefined ? { localNachname: normalizeOptionalString(body.localNachname) } : {}),
        ...(body.localGeburtsdatum !== undefined
          ? { localGeburtsdatum: normalizeOptionalString(body.localGeburtsdatum) }
          : {}),
        ...(body.localGeschlecht !== undefined
          ? { localGeschlecht: normalizeOptionalString(body.localGeschlecht) }
          : {}),
        ...(body.localAge !== undefined ? { localAge: normalizeOptionalString(body.localAge) } : {}),
        ...(body.pageHeading !== undefined ? { pageHeading: normalizeOptionalString(body.pageHeading) } : {}),
        ...(body.lastDocumentType !== undefined
          ? { lastDocumentType: normalizeOptionalString(body.lastDocumentType) }
          : {}),
        ...(body.lastOpened !== undefined ? { lastOpened: new Date(body.lastOpened) } : {}),
      },
    })

    res.json({ patient: toPatientResponse(row) })
  } catch (error) {
    console.error('[patients] patch failed', error)
    res.status(500).json({ error: 'Failed to update patient' })
  }
})

/** GET /api/patients/:caseId/diagnoses */
patientsRouter.get('/:caseId/diagnoses', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const caseId = req.params.caseId.trim()

    const rows = await prisma.patientDiagnosis.findMany({
      where: { accountId, caseId },
      orderBy: { sortOrder: 'asc' },
    })

    const diagnoses: DiagnosisPayload[] = rows.map((row) => ({
      id: row.id,
      icd10: { code: row.icd10Code, label: row.icd10Label, overridden: row.icd10Overridden },
      icd11: { code: row.icd11Code, label: row.icd11Label, overridden: row.icd11Overridden },
      dsm: { code: row.dsmCode, label: row.dsmLabel, overridden: row.dsmOverridden },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    res.json({ diagnoses })
  } catch (error) {
    console.error('[patients] diagnoses list failed', error)
    res.status(500).json({ error: 'Failed to load diagnoses' })
  }
})

/** PUT /api/patients/:caseId/diagnoses — replace all diagnoses for a case. */
patientsRouter.put('/:caseId/diagnoses', async (req: Request, res: Response) => {
  try {
    const accountId = resolveAccountId(req)
    const caseId = req.params.caseId.trim()
    const body = req.body as { diagnoses?: DiagnosisPayload[] }
    const diagnoses = Array.isArray(body.diagnoses) ? body.diagnoses : []

    await prisma.patientCase.upsert({
      where: { caseId },
      create: { caseId, accountId },
      update: { accountId },
    })

    await prisma.$transaction([
      prisma.patientDiagnosis.deleteMany({ where: { accountId, caseId } }),
      ...diagnoses.map((entry, index) =>
        prisma.patientDiagnosis.create({
          data: {
            id: entry.id,
            caseId,
            accountId,
            icd10Code: entry.icd10.code,
            icd10Label: entry.icd10.label,
            icd10Overridden: entry.icd10.overridden,
            icd11Code: entry.icd11.code,
            icd11Label: entry.icd11.label,
            icd11Overridden: entry.icd11.overridden,
            dsmCode: entry.dsm.code,
            dsmLabel: entry.dsm.label,
            dsmOverridden: entry.dsm.overridden,
            sortOrder: index,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          },
        }),
      ),
    ])

    res.json({ ok: true, count: diagnoses.length })
  } catch (error) {
    console.error('[patients] diagnoses save failed', error)
    res.status(500).json({ error: 'Failed to save diagnoses' })
  }
})
