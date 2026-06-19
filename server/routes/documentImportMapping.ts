/**
 * Document Import — AI-assisted mapping suggestion route (flag-gated, OFF by default).
 *
 * Returns 404 unless ENABLE_DOCUMENT_IMPORT_AI=true. Receives only DE-IDENTIFIED
 * text (the client de-identifies before calling). Returns advisory module
 * suggestions; it never returns or persists clinical content.
 */
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { callLlm } from '../services/llmProvider'
import { isDocumentImportAiEnabled } from '../utils/featureFlags'
import {
  CANDIDATE_MODULES,
  type CandidateModule,
} from '../../src/schemas/documentImport/envelope'
import {
  ImportMappingRequestSchema,
  type ImportMappingResponse,
  type ImportMappingSuggestion,
} from '../../src/schemas/documentImport/aiSuggestion'

export const documentImportMappingRouter: Router = createRouter()

function isLlmMockMode(): boolean {
  return !process.env.OPENAI_API_KEY?.trim() && !process.env.DEEPSEEK_API_KEY?.trim()
}

const MODULE_SET = new Set<string>(CANDIDATE_MODULES)

function coerceModule(value: unknown, fallback: CandidateModule): CandidateModule {
  return typeof value === 'string' && MODULE_SET.has(value) ? (value as CandidateModule) : fallback
}

function coerceConfidence(value: unknown): ImportMappingSuggestion['confidence'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low'
}

documentImportMappingRouter.post('/suggest-mapping', async (req: Request, res: Response) => {
  if (!isDocumentImportAiEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const parsed = ImportMappingRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }
  const { items, language } = parsed.data

  // Mock mode: deterministic echo so the path is exercisable without API keys.
  if (isLlmMockMode()) {
    const response: ImportMappingResponse = {
      mock: true,
      suggestions: items.map((item) => ({
        candidateId: item.candidateId,
        suggestedModule: item.currentModule,
        confidence: 'low',
        rationale: 'Mock-Modus: deterministische Beibehaltung des erkannten Moduls.',
      })),
    }
    res.json(response)
    return
  }

  const systemPrompt = [
    'You classify de-identified clinical text snippets into one of these target modules:',
    CANDIDATE_MODULES.join(', '),
    'Return ONLY JSON: {"suggestions":[{"candidateId","suggestedModule","confidence","rationale"}]}.',
    'confidence is one of high|medium|low. Do not invent clinical content. The text is already de-identified.',
    `Write rationale in language code "${language}".`,
  ].join(' ')

  const userPrompt = JSON.stringify(
    items.map((item) => ({ candidateId: item.candidateId, currentModule: item.currentModule, text: item.deidentifiedText })),
  )

  try {
    const result = await callLlm({ tier: 'fast', systemPrompt, userPrompt, jsonResponse: true })
    const suggestions = extractSuggestions(result.text, parsed.data.items)
    const response: ImportMappingResponse = { suggestions }
    res.json(response)
  } catch (error) {
    console.error('[document-import] mapping failed:', error)
    res.status(500).json({ error: 'Mapping failed' })
  }
})

function extractSuggestions(
  text: string,
  items: { candidateId: string; currentModule: CandidateModule }[],
): ImportMappingSuggestion[] {
  const fallbackByCandidate = new Map(items.map((i) => [i.candidateId, i.currentModule]))
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end < 0) return []
    const json = JSON.parse(text.slice(start, end + 1)) as { suggestions?: unknown }
    if (!Array.isArray(json.suggestions)) return []
    return json.suggestions
      .map((raw): ImportMappingSuggestion | null => {
        if (!raw || typeof raw !== 'object') return null
        const candidateId = (raw as { candidateId?: unknown }).candidateId
        if (typeof candidateId !== 'string' || !fallbackByCandidate.has(candidateId)) return null
        return {
          candidateId,
          suggestedModule: coerceModule((raw as { suggestedModule?: unknown }).suggestedModule, fallbackByCandidate.get(candidateId)!),
          confidence: coerceConfidence((raw as { confidence?: unknown }).confidence),
          rationale: typeof (raw as { rationale?: unknown }).rationale === 'string' ? (raw as { rationale: string }).rationale : '',
        }
      })
      .filter((s): s is ImportMappingSuggestion => s !== null)
  } catch {
    return []
  }
}
