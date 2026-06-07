import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { transcribeAudioBuffer } from '../services/transcriptionProvider'
import { canAfford, deductCredits } from '../services/credits'
import { resolveAccountId } from '../middleware/auth'

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
    const userId = resolveAccountId(req)

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

    const result = await transcribeAudioBuffer(audioBuffer, body.mimeType ?? 'audio/webm')
    const balance = await deductCredits(TRANSCRIBE_CREDITS, userId)

    res.json({ ...result, balance, creditsCharged: TRANSCRIBE_CREDITS })
  } catch (error) {
    console.error('[transcribe] failed:', error)
    const message = error instanceof Error ? error.message : 'Transcription failed'
    res.status(500).json({ error: message })
  }
})
