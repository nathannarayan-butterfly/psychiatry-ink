import { tierToAiMode } from '../utils/aiModeLabel'
import { estimateGenerationCredits, estimateTokensFromText } from '../utils/estimateCredits'
import type { AiGenerationRequest, AiGenerationResult } from '../types/aiGeneration'
import type { AiModelSpec } from '../types/aiGeneration'
import { API_BASE, InsufficientCreditsError } from './apiClient'
import { getAuthHeaders } from './authHeaders'

interface StartLogPayload {
  documentType: string
  aiMode: string
  inputTextLength: number
  estimatedInputTokens: number
  estimatedCredits: number
  tier: string
  tool?: string
  scope?: string
  schemaId?: string
}

async function postStart(payload: StartLogPayload): Promise<string | null> {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/generation-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(payload),
  })

  if (response.status === 402) {
    throw new InsufficientCreditsError()
  }

  if (!response.ok) return null
  const data = (await response.json()) as { id?: string }
  return data.id ?? null
}

async function patchLog(
  id: string,
  body: {
    status: 'completed' | 'failed'
    errorMessage?: string
    resultTextLength?: number
    provider?: string
    model?: string
  },
): Promise<number | null> {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/generation-logs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  })

  if (!response.ok) return null
  const data = (await response.json()) as { balance?: number }
  return data.balance ?? null
}

/** Usage logging — throws InsufficientCreditsError; other log failures are non-blocking. */
export async function logGenerationUsage(
  request: AiGenerationRequest,
  _model: AiModelSpec,
  schemaId: string,
  run: () => Promise<AiGenerationResult>,
  estimatedCredits?: number,
  onCreditsDeducted?: (balance: number) => void,
): Promise<AiGenerationResult> {
  const inputText = request.sourceText.trim()
  const credits =
    estimatedCredits ?? estimateGenerationCredits(request.tier, inputText)

  let logId: string | null = null

  try {
    logId = await postStart({
      documentType: request.componentId,
      aiMode: tierToAiMode(request.tier),
      inputTextLength: inputText.length,
      estimatedInputTokens: estimateTokensFromText(inputText),
      estimatedCredits: credits,
      tier: request.tier,
      tool: request.tool,
      scope: request.scope,
      schemaId,
    })
  } catch (error) {
    if (error instanceof InsufficientCreditsError) throw error
    // API unavailable — continue generation without blocking UI
  }

  try {
    const result = await run()

    if (logId) {
      const balance = await patchLog(logId, {
        status: 'completed',
        resultTextLength: result.text.trim().length,
        provider: result.model.provider,
        model: result.model.modelId,
      }).catch(() => null)

      if (balance != null) onCreditsDeducted?.(balance)
    }

    return result
  } catch (error) {
    if (logId) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      void patchLog(logId, { status: 'failed', errorMessage: message }).catch(() => {})
    }
    throw error
  }
}
