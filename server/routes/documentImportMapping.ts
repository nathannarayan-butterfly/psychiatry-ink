/**
 * Document Import — AI-assisted mapping suggestion route (flag-gated, OFF by default).
 *
 * Returns 404 unless ENABLE_DOCUMENT_IMPORT_AI=true. Receives only DE-IDENTIFIED
 * text (the client de-identifies before calling). Returns advisory module
 * suggestions; it never returns or persists clinical content.
 */
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { isDocumentImportAiEnabled } from '../utils/featureFlags'
import {
  SafeLlmEgressError,
  sanitizeText,
} from '../services/safeLlmEgress'
import { runAiFeature, InsufficientCreditsError } from '../ai/runAiFeature'
import { tierToMode } from '../ai/aiRouter'
import {
  CANDIDATE_MODULES,
  type CandidateModule,
} from '../../src/schemas/documentImport/envelope'
import {
  ImportMappingRequestSchema,
  ImportAnalyzeRequestSchema,
  type ImportMappingResponse,
  type ImportMappingSuggestion,
  type ImportAnalyzeResponse,
  type OverviewWidgetSuggestion,
  type ImportAnalyzeMetadata,
} from '../../src/schemas/documentImport/aiSuggestion'

export const documentImportMappingRouter: Router = createRouter()

function isLlmMockMode(): boolean {
  return (
    !process.env.OPENAI_API_KEY?.trim() &&
    !process.env.DEEPSEEK_API_KEY?.trim() &&
    !process.env.GOOGLE_API_KEY?.trim()
  )
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
  const { items, language, patientHints } = parsed.data

  // Egress PHI guard — the client provides `deidentifiedText` and asserts it
  // is scrubbed. We DO NOT TRUST that. Re-run the authoritative server-side
  // scrubber on every item; if a high-confidence PHI residual remains after
  // sanitization, fail closed with HTTP 422.
  let safeItems: typeof items
  try {
    safeItems = items.map((item) => ({
      ...item,
      deidentifiedText: sanitizeText(item.deidentifiedText, { patientHints }),
    }))
  } catch (guardError) {
    if (guardError instanceof SafeLlmEgressError) {
      console.error('[document-import] mapping PHI guard blocked request:', guardError.message)
      res.status(422).json({
        error:
          'PHI guard could not sanitize document-import payload; refusing to forward to LLM provider.',
      })
      return
    }
    throw guardError
  }

  // Mock mode: deterministic echo so the path is exercisable without API keys.
  if (isLlmMockMode()) {
    const response: ImportMappingResponse = {
      mock: true,
      suggestions: safeItems.map((item) => ({
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
    safeItems.map((item) => ({ candidateId: item.candidateId, currentModule: item.currentModule, text: item.deidentifiedText })),
  )

  try {
    const llmModel = parseLlmModelRequest((req.body ?? {}) as Record<string, unknown>, 'fast')
    const result = await runAiFeature({
      featureKey: 'document_import_mapping',
      tier: llmModel.tier,
      mode: tierToMode(llmModel.tier ?? 'fast'),
      model: llmModel.model,
      systemPrompt,
      userPrompt,
      jsonResponse: true,
    })
    const suggestions = extractSuggestions(result.text, parsed.data.items)
    const response: ImportMappingResponse = { suggestions }
    res.json(response)
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(402).json({ error: (error as Error).message })
      return
    }
    if (error instanceof SafeLlmEgressError) {
      console.error('[document-import] mapping outbound prompt blocked:', error.message)
      res.status(422).json({
        error:
          'PHI guard could not sanitize prompt; refusing to forward to LLM provider.',
      })
      return
    }
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

documentImportMappingRouter.post('/analyze', async (req: Request, res: Response) => {
  if (!isDocumentImportAiEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const parsed = ImportAnalyzeRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }
  const { metadata, mappingItems, language, patientHints } = parsed.data

  // Re-scrub every client-asserted `deidentifiedText` server-side. If the
  // high-confidence residual check fires we block with HTTP 422 below.
  let safeMappingItems: typeof mappingItems
  try {
    safeMappingItems = mappingItems.map((item) => ({
      ...item,
      deidentifiedText: sanitizeText(item.deidentifiedText, { patientHints }),
    }))
  } catch (guardError) {
    if (guardError instanceof SafeLlmEgressError) {
      console.error('[document-import] analyze PHI guard blocked request:', guardError.message)
      res.status(422).json({
        error:
          'PHI guard could not sanitize document-import payload; refusing to forward to LLM provider.',
      })
      return
    }
    throw guardError
  }

  if (isLlmMockMode()) {
    const response: ImportAnalyzeResponse = {
      mock: true,
      mappingSuggestions: safeMappingItems.map((item) => ({
        candidateId: item.candidateId,
        suggestedModule: mockModuleFromHint(item.deidentifiedText, item.currentModule),
        confidence: 'low',
        rationale: 'Mock-Modus: heuristische Zuordnung aus Strukturhinweis.',
      })),
      overviewWidgetSuggestions: mockOverviewSuggestions(metadata),
      patientSubheading: mockPatientSubheading(metadata),
    }
    res.json(response)
    return
  }

  const systemPrompt = [
    'You analyze de-identified clinical import metadata (structure only — no patient narrative).',
    'Return ONLY JSON:',
    '{"mappingSuggestions":[{"candidateId","suggestedModule","confidence","rationale"}],',
    '"overviewWidgetSuggestions":[{"widget", ...fields per widget type...}],',
    '"patientSubheading":"one sentence de-identified clinical context for the chart header"}.',
    `Target modules for mapping: ${CANDIDATE_MODULES.join(', ')}.`,
    'Overview widget types:',
    '- compliance: {widget:"compliance",itemLabel,itemGroup:"medication"|"therapy",status:"yes"|"partial"|"no",rationale}',
    '- angemeldete-therapien: {widget:"angemeldete-therapien",kind,label,goalSummary?,rationale}',
    '- psychotherapy: {widget:"psychotherapy",method?,mainGoal?,rationale}',
    '- verlaufstendenz: {widget:"verlaufstendenz",courseDirection:"improved"|"stable"|"worsened"|"fluctuating"|"resolved"|"unclear",rationale}',
    '- safety: {widget:"safety",category:"risk"|"allergy"|"interaction"|"monitoring",title,detail?,rationale}',
    'patientSubheading: one German sentence summarizing admission/presentation context implied by module structure — no names, dates of birth, or identifiers.',
    'Do not invent clinical facts beyond what metadata implies. Text is de-identified.',
    `Write rationale fields and patientSubheading in language code "${language}".`,
  ].join(' ')

  const userPrompt = JSON.stringify({
    metadata,
    mappingItems: safeMappingItems.map((item) => ({
      candidateId: item.candidateId,
      currentModule: item.currentModule,
      text: item.deidentifiedText,
    })),
  })

  try {
    const llmModel = parseLlmModelRequest((req.body ?? {}) as Record<string, unknown>, 'fast')
    const result = await runAiFeature({
      featureKey: 'document_import_mapping',
      tier: llmModel.tier,
      mode: tierToMode(llmModel.tier ?? 'fast'),
      model: llmModel.model,
      systemPrompt,
      userPrompt,
      jsonResponse: true,
    })
    const analyze = extractAnalyzeResponse(result.text, safeMappingItems, metadata)
    res.json(analyze)
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(402).json({ error: (error as Error).message })
      return
    }
    if (error instanceof SafeLlmEgressError) {
      console.error('[document-import] analyze outbound prompt blocked:', error.message)
      res.status(422).json({
        error:
          'PHI guard could not sanitize prompt; refusing to forward to LLM provider.',
      })
      return
    }
    console.error('[document-import] analyze failed:', error)
    res.status(500).json({ error: 'Analyze failed' })
  }
})

function mockModuleFromHint(hint: string, fallback: CandidateModule): CandidateModule {
  const lower = hint.toLowerCase()
  if (/\b(diagnos|icd|f\d{2}|depression|schizophren)/.test(lower)) return 'diagnosis'
  if (/\b(medik|substanz|dosis|mg\b|depot)/.test(lower)) return 'medication'
  if (/\b(labor|blut|leuk|crp|tsh)/.test(lower)) return 'lab'
  if (/\b(verlauf|tagesbericht|kontakt)/.test(lower)) return 'verlauf'
  if (/\b(therap|psychother|ergo|sport|gruppe)/.test(lower)) return 'therapy'
  if (/\b(risiko|suizid|aggress)/.test(lower)) return 'risk'
  if (/\b(anamn|aufnahme|vorgesch)/.test(lower)) return 'anamnese'
  return fallback
}

function mockOverviewSuggestions(metadata: ImportAnalyzeMetadata): OverviewWidgetSuggestion[] {
  const suggestions: OverviewWidgetSuggestion[] = []
  const medCount = metadata.moduleCounts.medication ?? 0
  const therapyCount =
    (metadata.moduleCounts.therapy ?? 0) + (metadata.moduleCounts.complementaryTherapy ?? 0)
  const riskCount = metadata.moduleCounts.risk ?? 0
  const verlaufCount = metadata.moduleCounts.verlauf ?? 0

  if (medCount > 0) {
    suggestions.push({
      widget: 'compliance',
      itemLabel: 'Medikation',
      itemGroup: 'medication',
      status: 'partial',
      rationale: 'Mock: Medikamentenmodule erkannt — Compliance prüfen.',
    })
  }
  if (therapyCount > 0) {
    suggestions.push({
      widget: 'angemeldete-therapien',
      kind: 'Therapie',
      label: 'Importierte Therapie',
      goalSummary: 'Aus Import erkannt',
      rationale: 'Mock: Therapie-Module im Import.',
    })
  }
  if (riskCount > 0) {
    suggestions.push({
      widget: 'safety',
      category: 'risk',
      title: 'Risikohinweis aus Import',
      rationale: 'Mock: Risiko-Modul erkannt.',
    })
  }
  if (verlaufCount > 0) {
    suggestions.push({
      widget: 'verlaufstendenz',
      courseDirection: 'unclear',
      rationale: 'Mock: Verlaufseinträge — Tendenz manuell prüfen.',
    })
  }
  return suggestions
}

function mockPatientSubheading(metadata: ImportAnalyzeMetadata): string | undefined {
  const anamneseCount = metadata.moduleCounts.anamnese ?? 0
  const diagnosisCount = metadata.moduleCounts.diagnosis ?? 0
  const verlaufCount = metadata.moduleCounts.verlauf ?? 0
  if (anamneseCount > 0 || diagnosisCount > 0) {
    return 'Mock: stationäre Aufnahme bei psychischer Dekompensation — Medikation und Verlauf prüfen.'
  }
  if (verlaufCount > 0) {
    return 'Mock: laufende stationäre Behandlung — Verlauf und Therapieplanung prüfen.'
  }
  const total = Object.values(metadata.moduleCounts).reduce((sum, n) => sum + n, 0)
  if (total > 0) {
    return 'Mock: importierte Akte — klinischen Kontext manuell ergänzen.'
  }
  return undefined
}

function parsePatientSubheading(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.replace(/\s+/g, ' ').trim()
  if (trimmed.length < 10) return undefined
  return trimmed.length > 280 ? `${trimmed.slice(0, 279)}…` : trimmed
}

function extractAnalyzeResponse(
  text: string,
  mappingItems: { candidateId: string; currentModule: CandidateModule }[],
  metadata: ImportAnalyzeMetadata,
): ImportAnalyzeResponse {
  const fallbackByCandidate = new Map(mappingItems.map((i) => [i.candidateId, i.currentModule]))
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end < 0) {
      return {
        mappingSuggestions: [],
        overviewWidgetSuggestions: mockOverviewSuggestions(metadata),
        patientSubheading: mockPatientSubheading(metadata),
      }
    }
    const json = JSON.parse(text.slice(start, end + 1)) as {
      mappingSuggestions?: unknown
      overviewWidgetSuggestions?: unknown
      patientSubheading?: unknown
    }
    const mappingSuggestions = Array.isArray(json.mappingSuggestions)
      ? parseMappingSuggestions(json.mappingSuggestions, fallbackByCandidate)
      : extractSuggestions(text, mappingItems)
    const overviewWidgetSuggestions = parseOverviewSuggestions(json.overviewWidgetSuggestions)
    const patientSubheading = parsePatientSubheading(json.patientSubheading) ?? mockPatientSubheading(metadata)
    return { mappingSuggestions, overviewWidgetSuggestions, patientSubheading }
  } catch {
    return {
      mappingSuggestions: extractSuggestions(text, mappingItems),
      overviewWidgetSuggestions: mockOverviewSuggestions(metadata),
      patientSubheading: mockPatientSubheading(metadata),
    }
  }
}

function parseMappingSuggestions(
  raw: unknown,
  fallbackByCandidate: Map<string, CandidateModule>,
): ImportMappingSuggestion[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): ImportMappingSuggestion | null => {
      if (!item || typeof item !== 'object') return null
      const candidateId = (item as { candidateId?: unknown }).candidateId
      if (typeof candidateId !== 'string' || !fallbackByCandidate.has(candidateId)) return null
      return {
        candidateId,
        suggestedModule: coerceModule(
          (item as { suggestedModule?: unknown }).suggestedModule,
          fallbackByCandidate.get(candidateId)!,
        ),
        confidence: coerceConfidence((item as { confidence?: unknown }).confidence),
        rationale:
          typeof (item as { rationale?: unknown }).rationale === 'string'
            ? (item as { rationale: string }).rationale
            : '',
      }
    })
    .filter((s): s is ImportMappingSuggestion => s !== null)
}

const COURSE_DIRECTIONS = ['improved', 'stable', 'worsened', 'fluctuating', 'resolved', 'unclear'] as const
type CourseDirection = (typeof COURSE_DIRECTIONS)[number]

function isCourseDirection(value: unknown): value is CourseDirection {
  return typeof value === 'string' && (COURSE_DIRECTIONS as readonly string[]).includes(value)
}

function parseOverviewSuggestions(raw: unknown): OverviewWidgetSuggestion[] {
  if (!Array.isArray(raw)) return []
  const out: OverviewWidgetSuggestion[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const widget = (item as { widget?: unknown }).widget
    if (widget === 'compliance') {
      const status = (item as { status?: unknown }).status
      const itemGroup = (item as { itemGroup?: unknown }).itemGroup
      const itemLabel = (item as { itemLabel?: unknown }).itemLabel
      if (
        typeof itemLabel === 'string' &&
        itemLabel.trim() &&
        (status === 'yes' || status === 'partial' || status === 'no') &&
        (itemGroup === 'medication' || itemGroup === 'therapy')
      ) {
        out.push({
          widget: 'compliance',
          itemLabel: itemLabel.trim(),
          itemGroup,
          status,
          rationale: typeof (item as { rationale?: unknown }).rationale === 'string'
            ? (item as { rationale: string }).rationale
            : '',
        })
      }
    } else if (widget === 'angemeldete-therapien') {
      const kind = (item as { kind?: unknown }).kind
      const label = (item as { label?: unknown }).label
      if (typeof kind === 'string' && kind.trim() && typeof label === 'string' && label.trim()) {
        out.push({
          widget: 'angemeldete-therapien',
          kind: kind.trim(),
          label: label.trim(),
          goalSummary:
            typeof (item as { goalSummary?: unknown }).goalSummary === 'string'
              ? (item as { goalSummary: string }).goalSummary
              : undefined,
          rationale: typeof (item as { rationale?: unknown }).rationale === 'string'
            ? (item as { rationale: string }).rationale
            : '',
        })
      }
    } else if (widget === 'psychotherapy') {
      out.push({
        widget: 'psychotherapy',
        method:
          typeof (item as { method?: unknown }).method === 'string'
            ? (item as { method: string }).method
            : undefined,
        mainGoal:
          typeof (item as { mainGoal?: unknown }).mainGoal === 'string'
            ? (item as { mainGoal: string }).mainGoal
            : undefined,
        rationale: typeof (item as { rationale?: unknown }).rationale === 'string'
          ? (item as { rationale: string }).rationale
          : '',
      })
    } else if (widget === 'verlaufstendenz') {
      const courseDirection = (item as { courseDirection?: unknown }).courseDirection
      if (isCourseDirection(courseDirection)) {
        out.push({
          widget: 'verlaufstendenz',
          courseDirection,
          rationale: typeof (item as { rationale?: unknown }).rationale === 'string'
            ? (item as { rationale: string }).rationale
            : '',
        })
      }
    } else if (widget === 'safety') {
      const category = (item as { category?: unknown }).category
      const title = (item as { title?: unknown }).title
      if (
        typeof title === 'string' &&
        title.trim() &&
        (category === 'risk' || category === 'allergy' || category === 'interaction' || category === 'monitoring')
      ) {
        out.push({
          widget: 'safety',
          category,
          title: title.trim(),
          detail:
            typeof (item as { detail?: unknown }).detail === 'string'
              ? (item as { detail: string }).detail
              : undefined,
          rationale: typeof (item as { rationale?: unknown }).rationale === 'string'
            ? (item as { rationale: string }).rationale
            : '',
        })
      }
    }
  }
  return out
}
