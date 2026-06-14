import type { AiModelSpec } from '../modelTierMapping'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import type {
  LabBefundSnapshotInput,
  LabCorrelationAIResult,
  LabCorrelationAiProvider,
  LabCorrelationMedicationInput,
  LabCorrelationStrength,
  LabTemporalPlausibility,
  LabObservationInput,
  MedicationLabCorrelationKnowledge,
} from '../../src/types/labMedicationCorrelation'
import { buildCorrelationKey } from '../../src/utils/labMedicationCorrelation/correlationKey'
import { labParameterLabelDe } from '../../src/utils/labMedicationCorrelation/parameterNormalize'

const VALID_STRENGTHS: LabCorrelationStrength[] = [
  'none',
  'possible',
  'plausible',
  'monitoring_required',
  'concerning',
]

const VALID_TEMPORAL: LabTemporalPlausibility[] = [
  'unlikely',
  'uncertain',
  'plausible',
  'highly_plausible',
]

const DEEPSEEK_MODEL = process.env.DEEPSEEK_FAST_MODEL ?? 'deepseek-v4-flash'
const OPENAI_MODEL = process.env.OPENAI_THOROUGH_MODEL ?? 'gpt-4.1'

function deepseekBaseUrl(): string {
  return process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') ?? 'https://api.deepseek.com/v1'
}

function openaiBaseUrl(): string {
  return process.env.OPENAI_BASE_URL?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
}

function coerceStrength(value: unknown): LabCorrelationStrength {
  const s = String(value ?? '').trim() as LabCorrelationStrength
  return VALID_STRENGTHS.includes(s) ? s : 'possible'
}

function coerceTemporal(value: unknown): LabTemporalPlausibility | undefined {
  const s = String(value ?? '').trim() as LabTemporalPlausibility
  return VALID_TEMPORAL.includes(s) ? s : undefined
}

function coerceString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

async function callProviderLlm(params: {
  provider: LabCorrelationAiProvider
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}): Promise<{ text: string; model: AiModelSpec }> {
  const maxTokens = params.maxTokens ?? 1800

  if (params.provider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing')
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
        temperature: 0.25,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`DeepSeek failed (${response.status}): ${detail.slice(0, 280)}`)
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('DeepSeek returned empty JSON response')
    return {
      text,
      model: { provider: 'deepseek', modelId: DEEPSEEK_MODEL, label: `DeepSeek (${DEEPSEEK_MODEL})` },
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')
  const response = await fetch(`${openaiBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`OpenAI failed (${response.status}): ${detail.slice(0, 280)}`)
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned empty JSON response')
  return {
    text,
    model: { provider: 'openai', modelId: OPENAI_MODEL, label: `OpenAI (${OPENAI_MODEL})` },
  }
}

function buildSinglePairPrompt(params: {
  med: LabCorrelationMedicationInput
  lab: LabObservationInput
  clinicalNotes?: string
  kbHint?: MedicationLabCorrelationKnowledge | null
  provider: LabCorrelationAiProvider
  priorAiResult?: LabCorrelationAIResult | null
  language: ClinicalLanguage
}): { systemPrompt: string; userPrompt: string } {
  const { med, lab, clinicalNotes, kbHint, provider, priorAiResult, language } = params

  const systemPrompt = [
    'Du bist ein klinisch-pharmakologischer Assistent für Psychiatrie.',
    'Beurteile einen möglichen Zusammenhang zwischen einem Psychopharmakon und einem Laborbefund.',
    'Verwende vorsichtige Formulierungen: möglich, vereinbar mit, zeitlich plausibel — niemals sichere Kausalität.',
    clinicalLanguagePromptInstruction(language),
    'Antworte NUR als valides JSON-Objekt (json) ohne Markdown.',
    'Felder: correlationStrength, zusammenhang, mechanism, recommendation, monitoring, alternatives, temporalPlausibility, rationale, uncertainties (Array), provenance.',
    `correlationStrength ∈ ${JSON.stringify(VALID_STRENGTHS)}`,
    `temporalPlausibility ∈ ${JSON.stringify(VALID_TEMPORAL)}`,
    'Bei fehlendem plausiblen Zusammenhang: correlationStrength "none".',
    provider === 'openai'
      ? 'Du lieferst eine unabhängige Zweitmeinung nach Abweisung eines DeepSeek-Vorschlags.'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  const userPrompt = [
    `Medikament: ${med.substance}`,
    med.doseLineGerman ? `Dosierung: ${med.doseLineGerman}` : '',
    med.strength ? `Stärke: ${med.strength}` : '',
    med.startDate ? `Therapiebeginn: ${med.startDate}` : '',
    med.lastChangeAt ? `Letzte Dosisänderung: ${med.lastChangeAt} (${med.lastChangeType ?? 'unbekannt'})` : '',
    '',
    `Laborparameter: ${lab.parameterName} (${lab.normalizedParameter})`,
    `Wert: ${lab.value} ${lab.unit}`,
    lab.refText ? `Referenz: ${lab.refText}` : '',
    `Auffälligkeit: ${lab.abnormality}`,
    lab.trend ? `Trend: ${lab.trend}` : '',
    `Labor-Datum: ${lab.labDate}`,
    '',
    clinicalNotes?.trim() ? `Klinische Notizen: ${clinicalNotes.trim()}` : '',
    kbHint ? `Hinweis interne Wissensdatenbank (nur Abgleich): ${kbHint.zusammenhang}` : '',
    priorAiResult
      ? `\nZuvor abgelehnter DeepSeek-Vorschlag (Vergleich): ${priorAiResult.zusammenhang}`
      : '',
    '',
    'JSON-Beispiel:',
    '{"correlationStrength":"possible","zusammenhang":"…","mechanism":"…","recommendation":"…","monitoring":"…","alternatives":"…","temporalPlausibility":"plausible","rationale":"…","uncertainties":[],"provenance":"…"}',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}

function buildBatchPrompt(params: {
  medications: LabCorrelationMedicationInput[]
  lastTwoLabSnapshots: LabBefundSnapshotInput[]
  abnormalParameters: LabObservationInput[]
  clinicalNotes?: string
  focusPairs: Array<{
    substanceId: string
    substanceName: string
    labParameter: string
    labParameterLabel: string
    kbHint?: MedicationLabCorrelationKnowledge | null
  }>
  language: ClinicalLanguage
}): { systemPrompt: string; userPrompt: string } {
  const { medications, lastTwoLabSnapshots, abnormalParameters, clinicalNotes, focusPairs, language } =
    params

  const systemPrompt = [
    'Du bist ein klinisch-pharmakologischer Assistent für Psychiatrie.',
    'Prüfe mögliche Zusammenhänge zwischen aktiven Psychopharmaka und Laborwerten.',
    'Verwende vorsichtige Formulierungen — niemals sichere Kausalität.',
    clinicalLanguagePromptInstruction(language),
    'Antworte NUR als valides JSON-Objekt ohne Markdown.',
    'Format: {"correlations":[{substanceName,labParameter,correlationStrength,zusammenhang,mechanism,recommendation,monitoring,alternatives,temporalPlausibility,rationale,uncertainties,provenance}]}',
    `correlationStrength ∈ ${JSON.stringify(VALID_STRENGTHS)}`,
    'Nur Paare mit plausiblen Zusammenhängen aufnehmen (correlationStrength ≠ "none").',
    'Berücksichtige die letzten zwei Laborresultate, Referenzbereiche und Trends.',
  ].join(' ')

  const medBlock = medications.map((med) =>
    [
      `- ${med.substance}`,
      med.doseLineGerman ? `  Dosierung: ${med.doseLineGerman}` : '',
      med.strength ? `  Stärke: ${med.strength}` : '',
      med.startDate ? `  Beginn: ${med.startDate}` : '',
      med.lastChangeAt ? `  Letzte Änderung: ${med.lastChangeAt}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  const snapshotBlock = lastTwoLabSnapshots.map((snap) => {
    const params = snap.parameters.map((p) => {
      const ref = p.refText ? ` Ref: ${p.refText}` : ''
      return `    ${p.parameterName}: ${p.value} ${p.unit}${ref} (${p.abnormality})`
    })
    return [`  Datum ${snap.labDate}${snap.label ? ` (${snap.label})` : ''}:`, ...params].join('\n')
  })

  const abnormalBlock = abnormalParameters.map((lab) =>
    [
      `- ${lab.parameterName} (${lab.normalizedParameter}): ${lab.value} ${lab.unit}`,
      lab.refText ? `  Referenz: ${lab.refText}` : '',
      `  Auffälligkeit: ${lab.abnormality}`,
      lab.trend ? `  Trend: ${lab.trend}` : '',
      `  Datum: ${lab.labDate}`,
    ]
      .filter(Boolean)
      .join('\n'),
  )

  const focusBlock = focusPairs.map((pair) => {
    const kb = pair.kbHint?.zusammenhang ? ` KB-Hinweis: ${pair.kbHint.zusammenhang}` : ''
    return `- ${pair.substanceName} × ${pair.labParameterLabel} (${pair.labParameter})${kb}`
  })

  const userPrompt = [
    'AKTIVE MEDIKAMENTE:',
    ...medBlock,
    '',
    'LETZTE ZWEI LABORRESULTATE:',
    ...snapshotBlock,
    '',
    abnormalParameters.length > 0 ? 'AUFFÄLLIGE PARAMETER:' : 'AUFFÄLLIGE PARAMETER: (keine — prüfe dennoch Zusammenhänge)',
    ...abnormalBlock,
    '',
    'ZU PRÜFENDE PAARE (Medikament × Laborparameter):',
    ...focusBlock,
    '',
    clinicalNotes?.trim() ? `Klinische Notizen: ${clinicalNotes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}

function parseAiResult(
  raw: unknown,
  substanceId: string,
  substanceName: string,
  labParameter: string,
): LabCorrelationAIResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const zusammenhang = coerceString(r.zusammenhang)
  const strength = coerceStrength(r.correlationStrength)

  if (!zusammenhang && strength === 'none') {
    return {
      correlationKey: buildCorrelationKey(substanceId, labParameter),
      substanceName,
      labParameter,
      labParameterLabelDe: labParameterLabelDe(labParameter),
      correlationStrength: 'none',
      zusammenhang: 'Kein plausibler Medikament-Labor-Zusammenhang identifiziert',
      recommendation: 'Weitere klinische Abklärung differentialdiagnostisch',
    }
  }
  if (!zusammenhang) return null
  if (strength === 'none') return null

  const uncertainties = Array.isArray(r.uncertainties)
    ? r.uncertainties.map((u) => String(u).trim()).filter(Boolean)
    : undefined

  return {
    correlationKey: buildCorrelationKey(substanceId, labParameter),
    substanceName,
    labParameter,
    labParameterLabelDe: labParameterLabelDe(labParameter),
    correlationStrength: strength,
    zusammenhang,
    mechanism: coerceString(r.mechanism) || undefined,
    recommendation: coerceString(r.recommendation) || 'Klinische Korrelation und Verlaufskontrolle',
    monitoring: coerceString(r.monitoring) || undefined,
    alternatives: coerceString(r.alternatives) || undefined,
    temporalPlausibility: coerceTemporal(r.temporalPlausibility),
    rationale: coerceString(r.rationale) || undefined,
    uncertainties,
    provenance: coerceString(r.provenance) || undefined,
  }
}

function matchSubstanceId(
  substanceName: string,
  resolvedByName: Map<string, { substanceId: string }>,
): string {
  return resolvedByName.get(substanceName.trim().toLowerCase())?.substanceId
    ?? `name:${substanceName.trim().toLowerCase()}`
}

export async function assessLabCorrelationsBatchWithAi(params: {
  medications: LabCorrelationMedicationInput[]
  lastTwoLabSnapshots: LabBefundSnapshotInput[]
  abnormalParameters: LabObservationInput[]
  clinicalNotes?: string
  focusPairs: Array<{
    substanceId: string
    substanceName: string
    labParameter: string
    labParameterLabel: string
    kbHint?: MedicationLabCorrelationKnowledge | null
  }>
  resolvedByName: Map<string, { substanceId: string }>
  language: ClinicalLanguage
}): Promise<{ results: LabCorrelationAIResult[]; parseFailed: boolean }> {
  if (params.focusPairs.length === 0) {
    return { results: [], parseFailed: false }
  }

  const { systemPrompt, userPrompt } = buildBatchPrompt({
    medications: params.medications,
    lastTwoLabSnapshots: params.lastTwoLabSnapshots,
    abnormalParameters: params.abnormalParameters,
    clinicalNotes: params.clinicalNotes,
    focusPairs: params.focusPairs,
    language: params.language,
  })

  try {
    const { text } = await callProviderLlm({
      provider: 'deepseek',
      systemPrompt,
      userPrompt,
      maxTokens: 4000,
    })
    const parsed = parseStructuredJson(text)
    if (!parsed || typeof parsed !== 'object') {
      return { results: [], parseFailed: true }
    }

    const correlations = (parsed as Record<string, unknown>).correlations
    if (!Array.isArray(correlations)) {
      return { results: [], parseFailed: true }
    }

    const results: LabCorrelationAIResult[] = []
    for (const item of correlations) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const substanceName = coerceString(row.substanceName)
      const labParameterRaw = coerceString(row.labParameter)
      if (!substanceName || !labParameterRaw) continue

      const focus = params.focusPairs.find(
        (p) =>
          p.substanceName.toLowerCase() === substanceName.toLowerCase() &&
          (p.labParameter === labParameterRaw ||
            p.labParameterLabel.toLowerCase().includes(labParameterRaw.toLowerCase())),
      )
      const substanceId = focus?.substanceId ?? matchSubstanceId(substanceName, params.resolvedByName)
      const labParameter = focus?.labParameter ?? labParameterRaw

      const result = parseAiResult(row, substanceId, substanceName, labParameter)
      if (result) results.push(result)
    }

    return { results, parseFailed: false }
  } catch (error) {
    console.error('[lab-med-correlation/batch-ai] failed:', error)
    return { results: [], parseFailed: true }
  }
}

export async function assessLabCorrelationWithAi(params: {
  med: LabCorrelationMedicationInput
  lab: LabObservationInput
  clinicalNotes?: string
  kbHint?: MedicationLabCorrelationKnowledge | null
  provider?: LabCorrelationAiProvider
  priorAiResult?: LabCorrelationAIResult | null
  substanceId: string
  language: ClinicalLanguage
}): Promise<LabCorrelationAIResult | null> {
  const provider = params.provider ?? 'deepseek'
  const language = params.language
  const { systemPrompt, userPrompt } = buildSinglePairPrompt({
    med: params.med,
    lab: params.lab,
    clinicalNotes: params.clinicalNotes,
    kbHint: params.kbHint,
    provider,
    priorAiResult: params.priorAiResult,
    language,
  })

  try {
    const { text } = await callProviderLlm({ provider, systemPrompt, userPrompt, maxTokens: 2000 })
    const parsed = parseStructuredJson(text)
    return parseAiResult(parsed, params.substanceId, params.med.substance, params.lab.normalizedParameter)
  } catch (error) {
    console.error('[lab-med-correlation/single-ai] failed:', error)
    return null
  }
}

// Deferred (not MVP): batch multi-pair assessment, cumulative organ burden clusters.
