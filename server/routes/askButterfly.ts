import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { resolveAccountId } from '../middleware/auth'
import { callLlm, llmResultModel } from '../services/llmProvider'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
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
      userPrompt = buildConversationPrompt(messages)
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

    const result = await callLlm({ tier, model: llmModel.model, systemPrompt, userPrompt, usageContext })

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
