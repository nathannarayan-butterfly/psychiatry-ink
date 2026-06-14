/**
 * LLM helper for KB seed script — low temperature, strict JSON.
 */
import type { AiModelSpec } from '../modelTierMapping'

const DEEPSEEK_MODEL = process.env.DEEPSEEK_FAST_MODEL ?? 'deepseek-v4-flash'

function deepseekBaseUrl(): string {
  return process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') ?? 'https://api.deepseek.com/v1'
}

export async function callKbSeedLlm(params: {
  systemPrompt: string
  userPrompt: string
  provider: 'deepseek' | 'openai'
  maxTokens?: number
  temperature?: number
}): Promise<{ text: string; model: AiModelSpec; durationMs: number }> {
  const start = Date.now()
  const temperature = params.temperature ?? 0.15
  const maxTokens = params.maxTokens ?? 12_000

  if (params.provider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY missing for KB seed')
    }
    const response = await fetch(`${deepseekBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`DeepSeek failed (${response.status}): ${detail.slice(0, 300)}`)
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('DeepSeek returned empty JSON response')
    return {
      text,
      model: { provider: 'deepseek', modelId: DEEPSEEK_MODEL, label: `DeepSeek (${DEEPSEEK_MODEL})` },
      durationMs: Date.now() - start,
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY missing for KB seed')
  const model = process.env.OPENAI_THOROUGH_MODEL ?? 'gpt-4.1'
  const baseUrl = process.env.OPENAI_BASE_URL?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`OpenAI failed (${response.status}): ${detail.slice(0, 300)}`)
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned empty JSON response')
  return {
    text,
    model: { provider: 'openai', modelId: model, label: `OpenAI (${model})` },
    durationMs: Date.now() - start,
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
