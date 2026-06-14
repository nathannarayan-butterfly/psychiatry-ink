import type { Router, Request, Response } from 'express'
import { Router as createRouter } from 'express'
import { submitKbContribution } from '../services/kbContributionsStore'
import type { KbContributionType } from '../../src/types/kbContributions'
import { handleListContributors } from './kbAdminContributions'

export const kbContributionsRouter: Router = createRouter()

const CONTRIBUTION_TYPES: KbContributionType[] = [
  'edit_field',
  'add_drug',
  'add_receptor',
  'add_side_effect',
  'add_monitoring',
  'add_preparation',
  'add_source',
]

const VALID_SOURCE_TYPES = [
  'fachinformation',
  'stahl',
  'literature',
  'guideline',
  'fda_label',
  'unknown',
] as const

kbContributionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      substanceId?: string | null
      contributionType?: string
      payload?: Record<string, unknown>
      submitterUserId?: string | null
      submitterDisplayName?: string | null
      licenseAccepted?: boolean
    }

    if (!body.contributionType || !CONTRIBUTION_TYPES.includes(body.contributionType as KbContributionType)) {
      res.status(400).json({ error: 'Invalid contributionType' })
      return
    }
    if (!body.payload || typeof body.payload !== 'object') {
      res.status(400).json({ error: 'payload is required' })
      return
    }
    if (body.licenseAccepted !== true) {
      res.status(400).json({ error: 'licenseAccepted must be true' })
      return
    }

    if (body.contributionType === 'edit_field') {
      const sourceCitation =
        typeof body.payload.sourceCitation === 'string' ? body.payload.sourceCitation.trim() : ''
      const sourceType =
        typeof body.payload.sourceType === 'string' ? body.payload.sourceType.trim() : ''

      if (!sourceCitation) {
        res.status(400).json({ error: 'sourceCitation is required' })
        return
      }
      if (!VALID_SOURCE_TYPES.includes(sourceType as (typeof VALID_SOURCE_TYPES)[number])) {
        res.status(400).json({ error: 'sourceType is required' })
        return
      }
    }

    const contribution = await submitKbContribution({
      substanceId: body.substanceId ?? null,
      contributionType: body.contributionType as KbContributionType,
      payload: body.payload,
      submitterUserId: body.submitterUserId ?? null,
      submitterDisplayName: body.submitterDisplayName ?? null,
      licenseAccepted: true,
    })

    res.status(201).json({ contribution })
  } catch (error) {
    console.error('[kb-contributions] submit failed:', error)
    res.status(500).json({ error: 'Failed to submit contribution' })
  }
})

kbContributionsRouter.get('/contributors', (req, res) => void handleListContributors(req, res))
