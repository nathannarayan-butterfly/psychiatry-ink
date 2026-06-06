import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { transcribeAudioBuffer } from '../services/transcriptionProvider'

export interface TranscribeRequestBody {
  audioBase64: string
  mimeType?: string
}

export const transcribeRouter: Router = createRouter()

transcribeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as TranscribeRequestBody

    if (!body.audioBase64?.trim()) {
      res.status(400).json({ error: 'Missing audioBase64' })
      return
    }

    const audioBuffer = Buffer.from(body.audioBase64, 'base64')
    if (audioBuffer.length === 0) {
      res.status(400).json({ error: 'Invalid audio data' })
      return
    }

    const result = await transcribeAudioBuffer(audioBuffer, body.mimeType ?? 'audio/webm')
    res.json(result)
  } catch (error) {
    console.error('[transcribe] failed:', error)
    const message = error instanceof Error ? error.message : 'Transcription failed'
    res.status(500).json({ error: message })
  }
})
