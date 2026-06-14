import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { transcribeAudioBuffer } from '../services/transcriptionProvider'
import { canAfford, deductCredits } from '../services/credits'
import { getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import { requireAuthenticatedUserOrDevBypass } from '../utils/requireAuthenticatedUserOrDevBypass'

/** Matches src/data/subscriptionPlans.ts TRANSCRIBE_CREDITS */
const TRANSCRIBE_CREDITS = 5

export interface TranscribeRequestBody {
  audioBase64: string
  mimeType?: string
}

export const transcribeRouter: Router = createRouter()

transcribeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as TranscribeRequestBody
    const userId = requireAuthenticatedUserOrDevBypass(req, res)
    if (!userId) return

    if (!body.audioBase64?.trim()) {
      res.status(400).json({ error: 'Missing audioBase64' })
      return
    }

    if (!(await canAfford(TRANSCRIBE_CREDITS, userId))) {
      res.status(402).json({ error: 'Insufficient credits' })
      return
    }

    const audioBuffer = Buffer.from(body.audioBase64, 'base64')
    if (audioBuffer.length === 0) {
      res.status(400).json({ error: 'Invalid audio data' })
      return
    }

    const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
    const result = await transcribeAudioBuffer(audioBuffer, body.mimeType ?? 'audio/webm', {
      userId,
      organisationId: org?.id ?? null,
    })
    const balance = await deductCredits(TRANSCRIBE_CREDITS, userId)

    res.json({ ...result, balance, creditsCharged: TRANSCRIBE_CREDITS })
  } catch (error) {
    console.error('[transcribe] failed:', error)
    res.status(500).json({ error: 'Transcription failed' })
  }
})
