import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { resolveAccountId } from '../middleware/auth'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { requireClinicalLanguage, resolveClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import {
  MAX_CONTEXT_CHARS,
  MAX_INSTRUCTION_CHARS,
  MAX_SELECTION_CHARS,
  runInlineEdit,
  type InlineEditContext,
} from '../services/inlineEditService'
import { transcribeAudioBuffer } from '../services/transcriptionProvider'
import { SafeLlmEgressError, sanitizeText } from '../services/safeLlmEgress'

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

    // Egress PHI guard — never trust the client. Re-scrub every prompt-bound
    // field server-side. Even though the inline edit needs to preserve clinical
    // meaning, names / DOB / case codes / emails / phone numbers must NEVER
    // reach the LLM provider. The `[REDACTED]` placeholders are stable and the
    // model preserves them through the rewrite.
    const patientHints = (() => {
      const raw = (body.patientHints ?? {}) as Record<string, unknown>
      return {
        patientName: typeof raw.patientName === 'string' ? raw.patientName : undefined,
        patientDob: typeof raw.patientDob === 'string' ? raw.patientDob : undefined,
      }
    })()

    let scrubbedContext: InlineEditContext
    let scrubbedInstruction: string
    try {
      scrubbedContext = {
        selectedText: sanitizeText(selectedText, { patientHints }),
        contextBefore: sanitizeText(str(body.contextBefore, MAX_CONTEXT_CHARS), { patientHints }),
        contextAfter: sanitizeText(str(body.contextAfter, MAX_CONTEXT_CHARS), { patientHints }),
      }
      scrubbedInstruction = sanitizeText(instruction, { patientHints })
    } catch (guardError) {
      if (guardError instanceof SafeLlmEgressError) {
        console.error('[inline-edit] PHI guard blocked request:', guardError.message)
        res.status(422).json({
          error:
            'PHI guard could not sanitize prompt; refusing to forward to LLM provider. Re-submit with valid input.',
        })
        return
      }
      throw guardError
    }

    const context: InlineEditContext = scrubbedContext

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
      instruction: scrubbedInstruction,
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
      language: resolveClinicalLanguage(req, body.language) ?? 'de',
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
