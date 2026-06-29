import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { transcribeAudioBuffer } from '../services/transcriptionProvider'
import { canAfford, deductCredits } from '../services/credits'
import { getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import { requireAuthenticatedUserOrDevBypass } from '../utils/requireAuthenticatedUserOrDevBypass'
import { resolveClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { dictationCreditsForTranscript, MIN_DICTATION_CREDITS } from '../ai/transcriptionCredits'

export interface TranscribeRequestBody {
  audioBase64: string
  mimeType?: string
  language?: string
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

    // Pre-check affordability against the cheapest possible charge (the base
    // dictation credit). The final charge scales with the produced transcript
    // length and is deducted after transcription completes.
    if (!(await canAfford(MIN_DICTATION_CREDITS, userId))) {
      res.status(402).json({ error: 'Insufficient credits' })
      return
    }

    const audioBuffer = Buffer.from(body.audioBase64, 'base64')
    if (audioBuffer.length === 0) {
      res.status(400).json({ error: 'Invalid audio data' })
      return
    }

    const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
    const language = resolveClinicalLanguage(req, body.language) ?? 'de'
    const result = await transcribeAudioBuffer(audioBuffer, body.mimeType ?? 'audio/webm', {
      userId,
      organisationId: org?.id ?? null,
      language,
    })
    // Length-based metering: charge scales with the transcript length (and, as
    // a floor, the audio duration) rather than a flat fee.
    const creditsCharged = dictationCreditsForTranscript(result.text, result.audioSeconds)
    const balance = await deductCredits(creditsCharged, userId, 'transcription')

    res.json({ ...result, balance, creditsCharged })
  } catch (error) {
    console.error('[transcribe] failed:', error)
    res.status(500).json({ error: 'Transcription failed' })
  }
})
