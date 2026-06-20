import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { resolveAccountId } from '../middleware/auth'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import {
  MAX_CONTEXT_CHARS,
  MAX_INSTRUCTION_CHARS,
  MAX_SELECTION_CHARS,
  runInlineEdit,
  type InlineEditContext,
} from '../services/inlineEditService'
import { transcribeAudioBuffer } from '../services/transcriptionProvider'

export const inlineEditRouter: Router = createRouter()

/** True when no provider key is configured → {@link callLlm} returns mock text. */
function isLlmMockMode(): boolean {
  return !process.env.OPENAI_API_KEY?.trim() && !process.env.DEEPSEEK_API_KEY?.trim()
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

// POST /api/inline-edit — rewrite a selected passage per a (spoken/typed) instruction.
inlineEditRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const selectedText = str(body.selectedText, MAX_SELECTION_CHARS).trim()
    const instruction = str(body.instruction, MAX_INSTRUCTION_CHARS).trim()

    if (!selectedText) {
      res.status(400).json({ error: 'selectedText is required' })
      return
    }
    if (!instruction) {
      res.status(400).json({ error: 'instruction is required' })
      return
    }

    if (!(await assertAiGenerationAllowed(req, res, caseId || null))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const llmModel = parseLlmModelRequest(body, 'fast')
    const tier = llmModel.tier ?? 'fast'

    const context: InlineEditContext = {
      selectedText,
      contextBefore: str(body.contextBefore, MAX_CONTEXT_CHARS),
      contextAfter: str(body.contextAfter, MAX_CONTEXT_CHARS),
    }

    const userId = resolveAccountId(req)
    // metadata carries NO clinical text — only sizes/flags (PHI never logged).
    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId: caseId || null,
      featureKey: 'inline_text_edit',
      metadata: {
        route: 'inline-edit',
        tier,
        selectionChars: selectedText.length,
        instructionChars: instruction.length,
      },
    })

    const result = await runInlineEdit({
      context,
      instruction,
      tier,
      model: llmModel.model,
      language,
      usageContext,
    })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId: caseId || null,
        metadata: { route: 'inline-edit', tier, mock: result.mock },
      })
    }

    res.json({
      editedText: result.editedText,
      model: result.model,
      mock: result.mock,
      disclaimer:
        'KI-Vorschlag — bitte vor Übernahme prüfen. Keine automatische Übernahme klinischer Inhalte.',
    })
  } catch (error) {
    console.error('[inline-edit] failed:', error)
    res.status(500).json({ error: 'KI-Bearbeitung fehlgeschlagen' })
  }
})

// POST /api/inline-edit/transcribe — transcribe a spoken instruction (server-side STT).
// Privacy: audio (possible PHI) goes only to the app's trusted provider, never
// the browser Web Speech API. Mock-safe: without a key it returns mock:true so
// the client falls back to a typed instruction.
inlineEditRouter.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : ''
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'audio/webm'

    if (!audioBase64.trim()) {
      res.status(400).json({ error: 'audioBase64 is required' })
      return
    }

    if (!(await assertAiGenerationAllowed(req, res, caseId || null))) return

    const userId = resolveAccountId(req)

    if (isLlmMockMode()) {
      // No provider configured → cannot transcribe. Signal the client to fall
      // back to typing the instruction. (Keeps dev + tests working offline.)
      res.json({ text: '', mock: true })
      return
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64')
    if (audioBuffer.length === 0) {
      res.status(400).json({ error: 'Invalid audio data' })
      return
    }

    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId: caseId || null,
      featureKey: 'transcription',
      requestKind: 'transcription',
      metadata: { route: 'inline-edit/transcribe' },
    })

    const result = await transcribeAudioBuffer(audioBuffer, mimeType, {
      userId: usageContext.userId,
      organisationId: usageContext.organisationId,
      caseId: usageContext.caseId,
    })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId: caseId || null,
        metadata: { route: 'inline-edit/transcribe' },
      })
    }

    res.json({ text: result.text, mock: false })
  } catch (error) {
    console.error('[inline-edit/transcribe] failed:', error)
    res.status(500).json({ error: 'Transkription fehlgeschlagen' })
  }
})
