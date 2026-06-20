/**
 * LLM helper for KB seed script — low temperature, strict JSON.
 *
 * SCOPE: this helper is invoked only by the KB seed batch script with
 * publicly-sourced drug reference data (substance names, mechanisms, FDA / EMA
 * label content). No patient-level data ever reaches this path. We still
 * apply the central PHI guard at the network boundary as defence-in-depth so
 * a future caller cannot accidentally smuggle clinical text through here.
 */
import type { AiModelSpec } from '../modelTierMapping'
import type { AiUsageContext, LlmCallResult } from '../ai/types'
import { normalizeAiUsage } from '../ai/usage/normalizeUsage'
import { recordAiUsageLog } from '../ai/usage/recordAiUsageLog'
import { assertSafeLlmPayload, sanitizeText } from './safeLlmEgress'

const DEEPSEEK_MODEL = process.env.DEEPSEEK_FAST_MODEL ?? 'deepseek-v4-flash'

function deepseekBaseUrl(): string {
  return process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') ?? 'https://api.deepseek.com/v1'
}

async function postChat(params: {
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  maxTokens: number
  temperature: number
}): Promise<{ text: string; rawUsage: unknown; requestId: string | null }> {
  // Egress PHI guard — KB seed prompts are public pharma reference data, but
  // we re-scrub + assert at the egress boundary as defence-in-depth.
  const safeSystemPrompt = sanitizeText(params.systemPrompt)
  const safeUserPrompt = sanitizeText(params.userPrompt)
  assertSafeLlmPayload({ system: safeSystemPrompt, user: safeUserPrompt })

  const response = await fetch(`${params.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: safeSystemPrompt },
        { role: 'user', content: safeUserPrompt },
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      response_format: { type: 'json_object' },
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`LLM failed (${response.status}): ${detail.slice(0, 300)}`)
  }
  const data = (await response.json()) as {
    id?: string
    usage?: unknown
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('LLM returned empty JSON response')
  return { text, rawUsage: data.usage ?? null, requestId: data.id ?? null }
}

export async function callKbSeedLlm(params: {
  systemPrompt: string
  userPrompt: string
  provider: 'deepseek' | 'openai'
  maxTokens?: number
  temperature?: number
  usageContext?: AiUsageContext
}): Promise<LlmCallResult & { modelSpec: AiModelSpec; durationMs: number }> {
  const start = Date.now()
  const temperature = params.temperature ?? 0.15
  const maxTokens = params.maxTokens ?? 12_000
  const inputText = `${params.systemPrompt}\n${params.userPrompt}`

  try {
    if (params.provider === 'deepseek') {
      const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing for KB seed')
      const result = await postChat({
        baseUrl: deepseekBaseUrl(),
        apiKey,
        model: DEEPSEEK_MODEL,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        maxTokens,
        temperature,
      })
      const durationMs = Date.now() - start
      const modelSpec: AiModelSpec = {
        provider: 'deepseek',
        modelId: DEEPSEEK_MODEL,
        label: `DeepSeek (${DEEPSEEK_MODEL})`,
      }
      const usage = normalizeAiUsage({
        provider: 'deepseek',
        model: DEEPSEEK_MODEL,
        rawUsage: result.rawUsage,
        inputText,
        outputText: result.text,
      })
      if (params.usageContext) {
        void recordAiUsageLog({
          ...params.usageContext,
          provider: 'deepseek',
          model: DEEPSEEK_MODEL,
          requestKind: params.usageContext.requestKind ?? 'batch',
          rawUsage: result.rawUsage,
          inputText,
          outputText: result.text,
          requestId: result.requestId,
          latencyMs: durationMs,
          success: true,
        })
      }
      return {
        text: result.text,
        provider: 'deepseek',
        model: DEEPSEEK_MODEL,
        usage,
        requestId: result.requestId,
        latencyMs: durationMs,
        modelSpec,
        durationMs,
      }
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) throw new Error('OPENAI_API_KEY missing for KB seed')
    const modelId = process.env.OPENAI_THOROUGH_MODEL ?? 'gpt-4.1'
    const baseUrl = process.env.OPENAI_BASE_URL?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
    const result = await postChat({
      baseUrl,
      apiKey,
      model: modelId,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      maxTokens,
      temperature,
    })
    const durationMs = Date.now() - start
    const modelSpec: AiModelSpec = {
      provider: 'openai',
      modelId,
      label: `OpenAI (${modelId})`,
    }
    const usage = normalizeAiUsage({
      provider: 'openai',
      model: modelId,
      rawUsage: result.rawUsage,
      inputText,
      outputText: result.text,
    })
    if (params.usageContext) {
      void recordAiUsageLog({
        ...params.usageContext,
        provider: 'openai',
        model: modelId,
        requestKind: params.usageContext.requestKind ?? 'batch',
        rawUsage: result.rawUsage,
        inputText,
        outputText: result.text,
        requestId: result.requestId,
        latencyMs: durationMs,
        success: true,
      })
    }
    return {
      text: result.text,
      provider: 'openai',
      model: modelId,
      usage,
      requestId: result.requestId,
      latencyMs: durationMs,
      modelSpec,
      durationMs,
    }
  } catch (error) {
    const durationMs = Date.now() - start
    const provider = params.provider
    const modelId = provider === 'deepseek' ? DEEPSEEK_MODEL : (process.env.OPENAI_THOROUGH_MODEL ?? 'gpt-4.1')
    if (params.usageContext) {
      void recordAiUsageLog({
        ...params.usageContext,
        provider,
        model: modelId,
        requestKind: params.usageContext.requestKind ?? 'batch',
        inputText,
        latencyMs: durationMs,
        success: false,
        errorCode: 'kb_seed_error',
      })
    }
    throw error
  }
}

export function buildKbSeedSystemPrompt(): string {
  return [
    'You are a clinical pharmacology expert generating psychiatric drug reference profiles.',
    'Output STRICT JSON only — no markdown, no code fences, no commentary.',
    'Be accurate and conservative. Mark uncertainty explicitly in uncertaintyNotes.',
    'Receptor affinity uses affinityPercent 0–100 (relative index), NOT 1–5 scores.',
    'Do NOT invent German PZN codes or verified market identifiers.',
    'Country preparations (if requested) must be country-neutral dosage forms/strengths only.',
    'For countryPreparations: return compact display-ready lines — dosageForm as human-readable German text (e.g. "Tabletten", "Filmtabletten", "Lösung zum Einnehmen"), not English enum codes.',
    'Do NOT include PZN, package size, product identifiers, or verbose source prose in countryPreparations.',
  ].join(' ')
}

export function buildKbSeedUserPrompt(params: {
  genericName: string
  category: string
  country: string
  includeReceptorAffinity: boolean
  includeMarketAvailability: boolean
}): string {
  const prepBlock = params.includeMarketAvailability
    ? '"countryPreparations": [{ "countryCode": "' +
      params.country +
      '", "dosageForm": "Tabletten", "strengthValue": "50", "strengthUnit": "mg", "route": "oral", "tradeName": "", "notes": "draft — verify" }],'
    : ''

  const receptorNote = params.includeReceptorAffinity
    ? 'Include receptorAffinityProfile with clinically relevant targets and affinityPercent 0–100.'
    : 'Return receptorAffinityProfile as an empty array [].'

  return [
    `Generate a psychiatric substance profile json for: ${params.genericName}`,
    `Category: ${params.category}`,
    `Country context: ${params.country} (for dosage guidance wording only; no PZN).`,
    receptorNote,
    'Provide sourceHints: 2–4 concrete citations (SmPC/Fachinformation, S3-Leitlinien, Cochrane/reviews, EPAR). Include product/country/year where known; mark unverified items with "— verify".',
    'Respond with STRICT JSON matching this shape:',
    '{',
    '  "genericName": "...",',
    '  "normalizedGenericName": "lowercase inn name",',
    '  "commonTradeNames": ["..."],',
    '  "substanceClass": "...",',
    '  "primaryPsychiatricUses": ["..."],',
    '  "mechanismSummary": "...",',
    '  "receptorAffinityProfile": [{ "receptor": "D2", "affinityPercent": 85, "effectType": "antagonist", "confidence": "moderate", "explanation": "..." }],',
    '  "pharmacodynamicProfile": "...",',
    '  "pharmacokinetics": {',
    '    "summaryDe": "<2–5 Absätze/Bullet-Cluster auf Deutsch: Resorption, Tmax, HWZ, Steady State, aktive Metaboliten, Proteinbindung, CYP/Transporter, TDM, klinische Konsequenzen>",',
    '    "summary": "<optional English mirror>",',
    '    "halfLifeHours": <number|null>, "halfLifeNoteDe": "...", "tmaxHours": <number|null>,',
    '    "timeToSteadyStateDays": <number|null>, "bioavailabilityPercent": <0–100|null>,',
    '    "proteinBindingPercent": <0–100|null>,',
    '    "tdm": { "lowNgMl": <number|null>, "highNgMl": <number|null>, "unit": "ng/ml", "note": "..." },',
    '    "isEstimated": true, "sourceNote": "Fachinformation — verify"',
    '  },',
    '  "commonDosageGuidance": [{ "population": "adult", "startDose": "...", "targetDose": "...", "maxDose": "...", "titrationNotes": "..." }],',
    '  "importantSideEffects": [{ "effect": "...", "frequency": "common", "severity": "moderate" }],',
    '  "severeRisks": ["..."],',
    '  "monitoringRecommendations": [{ "parameter": "...", "interval": "...", "rationale": "..." }],',
    '  "contraindications": ["..."],',
    '  "importantInteractions": [{ "interactsWith": "...", "severity": "major", "mechanism": "...", "clinicalManagement": "..." }],',
    '  "pregnancyLactationCaution": "...",',
    '  "geriatricCaution": "...",',
    '  "hepaticRenalCaution": "...",',
    '  "clinicalPearls": "...",',
    '  "uncertaintyNotes": "...",',
    '  "sourceHints": ["SmPC/Fachinformation (product, country, year)", "S3-Leitlinie … (AWMF year)", "review or EPAR — verify"],',
    prepBlock,
    '}',
  ].join('\n')
}

export function parseSeedJson(raw: string): unknown {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  }
  if (!text.startsWith('{')) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) text = text.slice(start, end + 1)
  }
  return JSON.parse(text)
}
