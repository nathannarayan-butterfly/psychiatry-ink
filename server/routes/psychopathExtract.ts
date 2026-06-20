/**
 * Psychopathology structured extraction — AI-assisted, flag-gated, OFF by default.
 *
 * Receives only DE-IDENTIFIED PPB text (client scrubs PHI before calling).
 * Returns advisory tri-state domain assessments; the client persists only after clinician review.
 */
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { isPsychopathExtractAiEnabled } from '../utils/featureFlags'
import {
  SafeLlmEgressError,
  sanitizeText,
} from '../services/safeLlmEgress'
import { runAiFeature, InsufficientCreditsError } from '../ai/runAiFeature'
import {
  PSYCHOPATH_EXTRACT_FIELD_KEYS,
  PSYCHOPATH_OVERVIEW_DOMAIN_ORDER,
  PsychopathExtractRequestSchema,
  domainsToFields,
  type PsychopathDomainAssessment,
  type PsychopathDomainStatus,
  type PsychopathExtractFieldKey,
  type PsychopathExtractResponse,
  isCourseDirection,
} from '../../src/schemas/psychopath/extraction'
import { inferTriStateFromText, sanitizePsychopathDomainAssessment } from '../../src/utils/overview/psychopathologyDomains'

export const psychopathExtractRouter: Router = createRouter()

function isLlmMockMode(): boolean {
  return (
    !process.env.OPENAI_API_KEY?.trim() &&
    !process.env.DEEPSEEK_API_KEY?.trim() &&
    !process.env.GOOGLE_API_KEY?.trim()
  )
}

/** Label → field heuristics for mock / fallback parsing. */
const LABEL_PATTERNS: Array<{ field: PsychopathExtractFieldKey; patterns: RegExp[] }> = [
  {
    field: 'consciousness',
    patterns: [
      /(?:bewusstsein|bewusst)\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(wach(?:heit)?|somnolent|sopor|komat(?:ös|ose)?)\b[^.;:\n]{0,80}/i,
    ],
  },
  {
    field: 'orientation',
    patterns: [
      /orientierung\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(orientier\w+|allseits orientiert|desorientiert)\b[^.;:\n]{0,80}/i,
    ],
  },
  {
    field: 'attention',
    patterns: [
      /aufmerksamkeit\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(aufmerksam\w*|konzentr\w*)\b[^.;:\n]{0,80}/i,
    ],
  },
  {
    field: 'memory',
    patterns: [
      /gedächtnis\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(merkspanne\w*|gedächtnis\w*)\b[^.;:\n]{0,80}/i,
    ],
  },
  {
    field: 'affect',
    patterns: [
      /(?:affekt|stimmung)\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(affekt\w*|stimmung\w*|gedrückt|euphor|dysphor|labil|eingeengt)\b[^.;:\n]{0,80}/i,
    ],
  },
  {
    field: 'drive',
    patterns: [
      /antrieb\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(antriebslos\w*|reduziert\w*|vermindert\w*|gesteigert\w*|erhöht\w*)\b/i,
    ],
  },
  {
    field: 'psychomotor',
    patterns: [
      /psychomotorik\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(psychomotor\w*|unruhig|verlangsamt|erstarrt)\b[^.;:\n]{0,80}/i,
    ],
  },
  {
    field: 'thoughtContent',
    patterns: [
      /\b(wahn\w*|überwachungs\w*|größen\w*|beziehungs\w*)\b[^.;:\n]{0,80}/i,
      /denkinhalt\s*[:–-]\s*([^.;:\n]+)/i,
    ],
  },
  {
    field: 'thoughtForm',
    patterns: [
      /(?:formaler\s+denkablauf|denkablauf|formales\s+denken)\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(gedämpft\w*|gehemmt\w*|verlangsamt\w*|umständlich\w*|zerfahren\w*|verarmt\w*|grübelnd\w*)\b/i,
    ],
  },
  {
    field: 'perception',
    patterns: [
      /\b(halluzin\w*|wahrnehm\w*|stimmen\w*)\b[^.;:\n]{0,80}/i,
      /wahrnehmung\s*[:–-]\s*([^.;:\n]+)/i,
    ],
  },
  {
    field: 'selfDisturbance',
    patterns: [/\b(ich[- ]?stör\w*|depersonal\w*|derealis\w*)\b[^.;:\n]{0,80}/i],
  },
  {
    field: 'cognition',
    patterns: [
      /\b(aufmerksam\w*|konzentr\w*|kognit\w*)\b[^.;:\n]{0,80}/i,
      /kognition\s*[:–-]\s*([^.;:\n]+)/i,
    ],
  },
  {
    field: 'sleep',
    patterns: [/\b(schlaf\w*|insomn\w*)\b[^.;:\n]{0,80}/i, /schlaf\s*[:–-]\s*([^.;:\n]+)/i],
  },
  {
    field: 'appetite',
    patterns: [/\b(appetit\w*)\b[^.;:\n]{0,80}/i, /appetit\s*[:–-]\s*([^.;:\n]+)/i],
  },
  {
    field: 'sexuality',
    patterns: [/\b(sexual\w*)\b[^.;:\n]{0,80}/i, /sexualität\s*[:–-]\s*([^.;:\n]+)/i],
  },
  {
    field: 'cooperation',
    patterns: [/\b(kooperativ\w*|mitarbeit\w*)\b[^.;:\n]{0,80}/i],
  },
  {
    field: 'insight',
    patterns: [
      /krankheitseinsicht\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(einsicht\s+(?:fehlend|vermindert|gut|vorhanden)|fehlende\s+einsicht|keine\s+einsicht)\b/i,
    ],
  },
  {
    field: 'suicidality',
    patterns: [
      /\bkeine?\s+suizid\w*[^.;:\n]{0,40}/i,
      /\b(suizid(?:gedanken|absicht|plan|versuch|androhung)\w*|selbstmord(?:gedanken|absicht)\w*)\b[^.;:\n]{0,80}/i,
    ],
  },
  {
    field: 'riskSelf',
    patterns: [/\b(selbstgefährd\w*|eigengefährd\w*)\b[^.;:\n]{0,80}/i],
  },
  {
    field: 'riskOthers',
    patterns: [/\b(fremdgefährd\w*)\b[^.;:\n]{0,80}/i],
  },
  {
    field: 'aggression',
    patterns: [/\b(aggress\w*|impulsiv\w*)\b[^.;:\n]{0,80}/i],
  },
  {
    field: 'functioning',
    patterns: [/\b(funktionsfähig\w*|alltag\w*|arbeit\w*)\b[^.;:\n]{0,80}/i],
  },
  {
    field: 'socialInteraction',
    patterns: [
      /(?:sozialverhalten|soziales\s+verhalten|kontakt)\s*[:–-]\s*([^.;:\n]+)/i,
      /\b(zurückgezogen\w*|isoliert\w*|distanzlos\w*|distanziert\w*|kontaktarm\w*|kontaktscheu\w*)\b/i,
    ],
  },
  {
    field: 'hygieneSelfCare',
    patterns: [/\b(hygiene\w*|selbstfürsorge\w*)\b[^.;:\n]{0,80}/i],
  },
]

function normalizeExtractValue(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 200)
}

function fieldHitsFromText(text: string): Partial<Record<PsychopathExtractFieldKey, string | null>> {
  const fields: Partial<Record<PsychopathExtractFieldKey, string | null>> = {}

  for (const { field, patterns } of LABEL_PATTERNS) {
    let hit: string | null = null
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (!match) continue
      hit = normalizeExtractValue(match[1] ?? match[0])
      break
    }
    if (hit) fields[field] = hit
  }

  return fields
}

function fieldsToDomains(
  fields: Partial<Record<PsychopathExtractFieldKey, string | null>>,
): PsychopathDomainAssessment[] {
  return PSYCHOPATH_OVERVIEW_DOMAIN_ORDER.map((domainKey) => {
    const raw = fields[domainKey] ?? null
    const status = inferTriStateFromText(raw)
    return sanitizePsychopathDomainAssessment({
      domainKey,
      status,
      detail: status === 'negative' ? null : raw,
    })
  })
}

const HEURISTIC_FALLBACK_WARNING =
  'KI nicht erreichbar — heuristische Extraktion verwendet.'

function mockExtractFromText(text: string, options?: { warning?: string }): PsychopathExtractResponse {
  const fields = fieldHitsFromText(text)
  const domains = fieldsToDomains(fields)

  let courseDirection: PsychopathExtractResponse['courseDirection'] = null
  if (/gebessert|verbessert|besser/i.test(text)) courseDirection = 'improved'
  else if (/verschlechter|schlechter|zunehmend/i.test(text)) courseDirection = 'worsened'
  else if (/stabil|unverändert/i.test(text)) courseDirection = 'stable'
  else if (/fluktuier|schwankend/i.test(text)) courseDirection = 'fluctuating'

  return {
    mock: true,
    warning: options?.warning,
    domains,
    fields: domainsToFields(domains),
    courseDirection,
    confidence: 'low',
  }
}

function heuristicFallbackFromText(text: string, warning = HEURISTIC_FALLBACK_WARNING): PsychopathExtractResponse {
  return mockExtractFromText(text, { warning })
}

function coerceDomainStatus(value: unknown): PsychopathDomainStatus | null {
  if (value === 'positive' || value === 'unclear' || value === 'negative') return value
  return null
}

function coerceDomains(raw: unknown): PsychopathDomainAssessment[] {
  if (!Array.isArray(raw)) return []
  const out: PsychopathDomainAssessment[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const domainKey = (item as { domainKey?: unknown }).domainKey
    const status = coerceDomainStatus((item as { status?: unknown }).status)
    if (!status) continue
    if (
      typeof domainKey !== 'string' ||
      !PSYCHOPATH_OVERVIEW_DOMAIN_ORDER.includes(domainKey as (typeof PSYCHOPATH_OVERVIEW_DOMAIN_ORDER)[number])
    ) {
      continue
    }
    const detailRaw = (item as { detail?: unknown }).detail
    const detail =
      detailRaw === null || detailRaw === undefined
        ? null
        : typeof detailRaw === 'string'
          ? normalizeExtractValue(detailRaw)
          : null
    out.push(
      sanitizePsychopathDomainAssessment({
        domainKey: domainKey as PsychopathDomainAssessment['domainKey'],
        status,
        detail: status === 'negative' ? null : detail,
      }),
    )
  }
  return out
}

const LLM_PARSE_FALLBACK_WARNING =
  'KI-Antwort unvollständig — heuristische Extraktion verwendet.'

function parseLlmResponse(text: string, fallbackText: string): PsychopathExtractResponse {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end < 0) {
      return heuristicFallbackFromText(fallbackText, LLM_PARSE_FALLBACK_WARNING)
    }
    const json = JSON.parse(text.slice(start, end + 1)) as {
      domains?: unknown
      fields?: unknown
      courseDirection?: unknown
      confidence?: unknown
    }
    let domains = coerceDomains(json.domains)
    if (domains.length === 0 && json.fields) {
      domains = fieldsToDomains(
        Object.fromEntries(
          PSYCHOPATH_EXTRACT_FIELD_KEYS.map((key) => {
            const value = (json.fields as Record<string, unknown>)[key]
            return [key, typeof value === 'string' ? normalizeExtractValue(value) : null]
          }),
        ),
      )
    }
    const courseDirection = isCourseDirection(json.courseDirection) ? json.courseDirection : null
    const confidence =
      json.confidence === 'high' || json.confidence === 'medium' || json.confidence === 'low'
        ? json.confidence
        : 'medium'
    if (domains.length === 0) {
      return heuristicFallbackFromText(fallbackText, LLM_PARSE_FALLBACK_WARNING)
    }
    return { domains, fields: domainsToFields(domains), courseDirection, confidence }
  } catch {
    return heuristicFallbackFromText(fallbackText, LLM_PARSE_FALLBACK_WARNING)
  }
}

function formatDomainHeadings(
  headings: Array<{ domainKey: string; label: string }> | undefined,
): string {
  if (!headings?.length) {
    return PSYCHOPATH_OVERVIEW_DOMAIN_ORDER.map((key) => key).join(', ')
  }
  return headings.map((h) => `${h.domainKey} (${h.label})`).join('; ')
}

const PSYCHOPATH_EXTRACT_DISABLED_ERROR =
  'Server KI deaktiviert — ENABLE_PSYCHOPATH_EXTRACT_AI auf API-Server setzen und neu starten'

psychopathExtractRouter.post('/extract', async (req: Request, res: Response) => {
  if (!isPsychopathExtractAiEnabled()) {
    res.status(404).json({ error: PSYCHOPATH_EXTRACT_DISABLED_ERROR })
    return
  }

  const parsed = PsychopathExtractRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const { deidentifiedText, language, domainHeadings, patientHints } = parsed.data

  // Egress PHI guard — the client provides `deidentifiedText` and asserts it
  // is scrubbed. We DO NOT TRUST that. Re-run the authoritative server-side
  // scrubber, and if a high-confidence PHI residual remains after sanitization,
  // fail closed with HTTP 422.
  let safeText: string
  try {
    safeText = sanitizeText(deidentifiedText, { patientHints })
  } catch (guardError) {
    if (guardError instanceof SafeLlmEgressError) {
      console.error('[psychopath] PHI guard blocked request:', guardError.message)
      res.status(422).json({
        error:
          'PHI guard could not sanitize psychopathology payload; refusing to forward to LLM provider.',
      })
      return
    }
    throw guardError
  }

  if (isLlmMockMode()) {
    res.json(mockExtractFromText(safeText))
    return
  }

  const headingList = formatDomainHeadings(domainHeadings)
  const systemPrompt = [
    'You extract structured psychopathological findings from de-identified German clinical text.',
    'Return ONLY JSON:',
    '{"domains":[{"domainKey":string,"status":"positive"|"unclear"|"negative","detail":string|null}],',
    '"courseDirection":"new"|"improved"|"worsened"|"stable"|"fluctuating"|"resolved"|"unclear"|null,',
    '"confidence":"high"|"medium"|"low"}.',
    `Assess every AMDP domain: ${headingList}.`,
    'For each domain: status "positive" when a pathological or clinically notable finding is documented;',
    '"unclear" when mentioned but not clearly assessable;',
    '"negative" when explicitly unremarkable, denied, or not mentioned.',
    'Include detail only for positive or unclear — a concise clinical qualifier (e.g. "gedrückt", "reduziert").',
    'Always assess suicidality, riskSelf (non-suicidal self-harm), and riskOthers (harm to others):',
    'mark status "negative" when explicitly denied or unremarkable;',
    'use detail only for positive or unclear findings.',
    'Suizidalität and Selbstgefährdung are distinct: suicidality = suicidal ideation; riskSelf = non-suicidal self-harm risk.',
    'Do not include patient names, dates, or identifiers. Text is already de-identified.',
    `Write detail strings in language code "${language}" (clinical German preferred for de).`,
  ].join(' ')

  try {
    const llmModel = parseLlmModelRequest((req.body ?? {}) as Record<string, unknown>, 'fast')
    const result = await runAiFeature({
      featureKey: 'psychopathology_extraction',
      tier: llmModel.tier,
      model: llmModel.model,
      systemPrompt,
      userPrompt: safeText,
      jsonResponse: true,
    })
    const response = parseLlmResponse(result.text, safeText)
    res.json(response)
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(402).json({ error: (error as Error).message })
      return
    }
    if (error instanceof SafeLlmEgressError) {
      console.error('[psychopath] outbound prompt blocked:', error.message)
      res.status(422).json({
        error:
          'PHI guard could not sanitize prompt; refusing to forward to LLM provider.',
      })
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[psychopath] extract LLM failed, using heuristic fallback:', message)
    res.json(heuristicFallbackFromText(safeText))
  }
})
