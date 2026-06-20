import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { resolveAccountId } from '../middleware/auth'
import {
  SafeLlmEgressError,
  llmResultModel,
  sanitizeText,
} from '../services/safeLlmEgress'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { runAiFeature, InsufficientCreditsError } from '../ai/runAiFeature'
import {
  clinicalLanguagePromptInstruction,
  requireClinicalLanguage,
  resolveLanguageName,
} from '../utils/resolveClinicalLanguage'

export interface AskButterflyMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AskButterflyRequestBody {
  messages: AskButterflyMessage[]
  tier?: AiModelTier
  model?: { provider: string; modelId: string }
  language?: 'de' | 'en' | 'fr' | 'es'
  /** Optional hints — server-side egress guard scrubs name/DOB if present. */
  patientHints?: { patientName?: string; patientDob?: string }
}

export interface AskButterflyResponseBody {
  answer: string
  model: { provider: string; modelId: string; label: string }
  mock?: boolean
}

export const askButterflyRouter: Router = createRouter()

const MAX_MESSAGES = 40
const MAX_MESSAGE_CHARS = 4000
const MAX_TOTAL_CHARS = 24000

function isLlmMockMode(): boolean {
  return (
    !process.env.OPENAI_API_KEY?.trim() &&
    !process.env.DEEPSEEK_API_KEY?.trim() &&
    !process.env.GOOGLE_API_KEY?.trim()
  )
}

function normalizeMessages(raw: unknown): AskButterflyMessage[] | null {
  if (!Array.isArray(raw)) return null
  const messages: AskButterflyMessage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const role = (item as AskButterflyMessage).role
    const content = typeof (item as AskButterflyMessage).content === 'string'
      ? (item as AskButterflyMessage).content.trim().slice(0, MAX_MESSAGE_CHARS)
      : ''
    if (role !== 'user' && role !== 'assistant') return null
    if (!content) return null
    messages.push({ role, content })
    if (messages.length > MAX_MESSAGES) return null
  }
  return messages.length > 0 ? messages : null
}

function buildConversationPrompt(messages: AskButterflyMessage[]): string {
  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0)
  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error('Conversation too long')
  }

  const lines = messages.map((message) => {
    const label = message.role === 'user' ? 'User' : 'Assistant'
    return `${label}: ${message.content}`
  })

  return ['Conversation:', ...lines, '', 'Reply to the latest user message.'].join('\n')
}

askButterflyRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as AskButterflyRequestBody
    const messages = normalizeMessages(body.messages)
    if (!messages) {
      res.status(400).json({ error: 'messages required' })
      return
    }
    if (messages[messages.length - 1]?.role !== 'user') {
      res.status(400).json({ error: 'Last message must be from user' })
      return
    }

    if (!(await assertAiGenerationAllowed(req, res))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const llmModel = parseLlmModelRequest(body as unknown as Record<string, unknown>, 'standard')
    const tier = llmModel.tier ?? 'standard'

    // Egress PHI guard — Ask Butterfly is a "general-purpose chat" surface;
    // the assistant is explicitly told it has no access to patient records.
    // Re-scrub every message content server-side so anything the clinician
    // pastes (deliberately or by mistake) cannot leak to the LLM provider.
    const patientHints =
      body.patientHints && typeof body.patientHints === 'object'
        ? {
            patientName:
              typeof body.patientHints.patientName === 'string'
                ? body.patientHints.patientName
                : undefined,
            patientDob:
              typeof body.patientHints.patientDob === 'string'
                ? body.patientHints.patientDob
                : undefined,
          }
        : undefined
    let scrubbedMessages: AskButterflyMessage[]
    try {
      scrubbedMessages = messages.map((message) => ({
        role: message.role,
        content: sanitizeText(message.content, { patientHints }),
      }))
    } catch (guardError) {
      if (guardError instanceof SafeLlmEgressError) {
        console.error('[ask-butterfly] PHI guard blocked request:', guardError.message)
        res.status(422).json({
          error:
            'PHI guard could not sanitize message; refusing to forward to LLM provider.',
        })
        return
      }
      throw guardError
    }

    const languageName = resolveLanguageName(language)
    const systemPrompt = [
      'You are Butterfly, a helpful AI assistant for psychiatrists using Psychiatry.Ink.',
      'This is a general-purpose chat — not tied to any patient chart unless the user pastes details themselves.',
      'Do not assume access to patient records or invent patient-specific facts.',
      'For clinical questions, give concise, educational guidance and note that chart verification is required.',
      clinicalLanguagePromptInstruction(language),
      `Respond in ${languageName}.`,
    ].join(' ')

    let userPrompt: string
    try {
      userPrompt = buildConversationPrompt(scrubbedMessages)
    } catch {
      res.status(413).json({ error: 'Conversation too long' })
      return
    }

    const userId = resolveAccountId(req)
    const usageContext =
      userId && userId !== 'default'
        ? await resolveUsageContextFromRequest(req, userId, {
            caseId: null,
            featureKey: 'ask_butterfly',
            metadata: { route: 'ask-butterfly', tier, messageCount: messages.length },
          })
        : undefined

    let result
    try {
      result = await runAiFeature({
        featureKey: 'ask_butterfly',
        tier,
        model: llmModel.model,
        systemPrompt,
        userPrompt,
        usageContext,
      })
    } catch (guardError) {
      if (guardError instanceof InsufficientCreditsError) {
        res.status(402).json({ error: (guardError as Error).message })
        return
      }
      if (guardError instanceof SafeLlmEgressError) {
        console.error('[ask-butterfly] PHI guard blocked outbound prompt:', guardError.message)
        res.status(422).json({
          error:
            'PHI guard could not sanitize prompt; refusing to forward to LLM provider.',
        })
        return
      }
      throw guardError
    }

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId: null,
        metadata: { route: 'ask-butterfly', tier, messageCount: messages.length },
      })
    }

    const response: AskButterflyResponseBody = {
      answer: result.text.trim(),
      model: llmResultModel(result),
      ...(isLlmMockMode() ? { mock: true } : {}),
    }
    res.json(response)
  } catch (error) {
    console.error('[ask-butterfly] failed:', error)
    res.status(500).json({ error: 'Ask Butterfly failed' })
  }
})
