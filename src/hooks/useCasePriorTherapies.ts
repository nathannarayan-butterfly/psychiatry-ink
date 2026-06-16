import { useEffect, useMemo, useRef, useState } from 'react'
import type { MedicationEntry } from '../types/medicationPlan'
import type {
  FailureAnalysis,
  PriorTherapiesRunResponse,
  PriorTherapyExtractionItem,
  PriorTherapyFailureAnalysisResponse,
  PriorTherapyFailureDrugInput,
  PriorTherapyItem,
} from '../types/priorTherapies'
import {
  extractPriorTherapiesFromPlan,
  mergePriorTherapies,
  normalizeSubstanceKey,
} from '../utils/medication/priorTherapies'
import {
  type FailureAnalysisContext,
  computeFailureSignals,
  detectSmoking,
  isInefficacyFailure,
} from '../utils/medication/priorTherapyFailureAnalysis'
import { buildFailureAnalysisFromSignals } from '../utils/medication/failureAnalysisSynthesis'
import { loadNotionDocumentSnapshot } from '../utils/notionDocumentActions'
import { loadVerlaufFeed } from '../utils/verlaufFeed'
import { loadBefunde } from '../utils/laborArchive'
import { extractSpiegelwerte } from '../components/notion/SpiegelwerteSection'
import {
  runPriorTherapyExtraction,
  runPriorTherapyFailureAnalysis,
} from '../services/priorTherapiesApi'
import { medicationTrials } from '../utils/clinicalMetadata/accessor'
import {
  indexTrialFactsBySubstance,
  medicationTrialFactsToItems,
} from '../utils/medication/priorTherapyFacts'
import { isCmeaConsumerReadEnabled } from '../utils/featureFlags'

/** Aufnahme sections most likely to mention prior medication trials. */
const AUFNAHME_PRIOR_MED_SECTIONS = [
  'medikamentenanamnese',
  'psychiatrische-vorgeschichte',
  'aktuelle-krankheitsanamnese',
  'suchtanamnese',
  'diagnostische-einschaetzung',
]

const MAX_SOURCE_CHARS = 18_000

export type PriorTherapyLlmStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CasePriorTherapies {
  /** Deterministic (plan) + inferred (LLM), de-duplicated by substance; failed
   * agents carry a `failureAnalysis` ("mögliche Ursache"). */
  items: PriorTherapyItem[]
  /** Deterministic plan-derived items only (always available, no network). */
  deterministic: PriorTherapyItem[]
  /** True once at least one inferred (LLM) item is present. */
  hasInferred: boolean
  llmStatus: PriorTherapyLlmStatus
  /** True when the LLM result came from the mock provider (no API key). */
  mock: boolean
  /** Background status of the failure-analysis ("mögliche Ursache") synthesis. */
  failureAnalysisStatus: PriorTherapyLlmStatus
  /** Substance keys whose failure analysis was AI-synthesised (not deterministic). */
  aiAnalyzedSubstances: Set<string>
}

interface CacheEntry {
  signature: string
  response: PriorTherapiesRunResponse
}

interface FailureCacheEntry {
  signature: string
  response: PriorTherapyFailureAnalysisResponse
}

// Low document volume per case (one Aufnahme + a few Verlauf notes), so a tiny
// per-case cache keyed by a source signature avoids re-spending AI on re-mounts.
const extractionCache = new Map<string, CacheEntry>()
const failureAnalysisCache = new Map<string, FailureCacheEntry>()

function responseToMaps(response: PriorTherapyFailureAnalysisResponse): {
  byKey: Map<string, FailureAnalysis>
  aiKeys: Set<string>
} {
  const byKey = new Map<string, FailureAnalysis>()
  const aiKeys = new Set<string>()
  for (const analysis of response.analyses) {
    const key = normalizeSubstanceKey(analysis.substance)
    byKey.set(key, { likelyCauses: analysis.likelyCauses })
    // Only a real (non-mock) LLM pass counts as "AI-synthesised"; the mock path
    // mirrors the deterministic synthesis, so it isn't flagged as AI.
    if (!response.mock) aiKeys.add(key)
  }
  return { byKey, aiKeys }
}

function hashString(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return `${value.length}:${hash}`
}

function buildAufnahmeText(caseId: string): string {
  const snapshot = loadNotionDocumentSnapshot('aufnahme', caseId)
  if (!snapshot) return ''
  const blocks: string[] = []
  for (const id of AUFNAHME_PRIOR_MED_SECTIONS) {
    const content = snapshot.sectionContents[id]?.trim()
    if (content) blocks.push(content)
  }
  return blocks.join('\n\n').slice(0, MAX_SOURCE_CHARS)
}

function buildVerlaufText(caseId: string): string {
  const blocks: string[] = []
  for (const entry of loadVerlaufFeed(caseId)) {
    if (entry.content?.trim()) blocks.push(entry.content.trim())
  }
  const snapshot = loadNotionDocumentSnapshot('verlauf', caseId)
  if (snapshot) {
    for (const content of Object.values(snapshot.sectionContents)) {
      if (content?.trim()) blocks.push(content.trim())
    }
  }
  // De-duplicate identical blocks (feed + snapshot can overlap) and clamp.
  return [...new Set(blocks)].join('\n\n').slice(0, MAX_SOURCE_CHARS)
}

function toInferredItems(items: PriorTherapyExtractionItem[]): PriorTherapyItem[] {
  return items.map((item) => ({
    substance: item.substance,
    event: item.event,
    reason: item.reason ?? null,
    timeframe: item.timeframe,
    source: item.source,
    evidenceQuote: item.evidenceQuote || null,
    inferred: true,
  }))
}

/**
 * Surfaces the patient's previously-tried medications for the Übersicht and
 * Medikation pages. The deterministic plan layer is available synchronously; the
 * free-text LLM extraction runs in the background (non-blocking) and is merged
 * in when it resolves. Graceful on failure — deterministic items always show.
 */
export function useCasePriorTherapies(
  caseId: string,
  medications: MedicationEntry[],
  options: { patientName?: string; enabled?: boolean } = {},
): CasePriorTherapies {
  const { patientName, enabled = true } = options

  // CMEA Phase 3: when consumer reads are enabled, the inferred (free-text)
  // trials + their why-failed signals come from pre-computed facts via the
  // accessor instead of the bespoke LLM routes. Deterministic plan data is
  // unchanged either way.
  const cmeaRead = isCmeaConsumerReadEnabled()

  const deterministic = useMemo(
    () => extractPriorTherapiesFromPlan(medications),
    [medications],
  )

  const factTrials = useMemo(
    () => (cmeaRead ? medicationTrials(caseId) : []),
    [cmeaRead, caseId, medications],
  )
  const factInferred = useMemo(() => medicationTrialFactsToItems(factTrials), [factTrials])

  const sources = useMemo(() => {
    const aufnahmeText = buildAufnahmeText(caseId)
    const verlaufText = buildVerlaufText(caseId)
    return { aufnahmeText, verlaufText }
  }, [caseId])

  const signature = useMemo(
    () => hashString(`${caseId}|${sources.aufnahmeText}|${sources.verlaufText}`),
    [caseId, sources],
  )

  const cached = extractionCache.get(caseId)
  const [response, setResponse] = useState<PriorTherapiesRunResponse | null>(
    cached?.signature === signature ? cached.response : null,
  )
  const [llmStatus, setLlmStatus] = useState<PriorTherapyLlmStatus>(
    cached?.signature === signature ? 'ready' : 'idle',
  )
  const activeSignature = useRef<string>('')

  useEffect(() => {
    // Facts path owns the inferred items — never call the bespoke LLM route.
    if (cmeaRead) {
      setResponse(null)
      setLlmStatus('ready')
      return
    }
    const hasText = sources.aufnahmeText.trim().length > 0 || sources.verlaufText.trim().length > 0
    if (!enabled || !hasText) {
      setResponse(null)
      setLlmStatus('idle')
      return
    }

    const existing = extractionCache.get(caseId)
    if (existing?.signature === signature) {
      setResponse(existing.response)
      setLlmStatus('ready')
      return
    }

    let cancelled = false
    activeSignature.current = signature
    setLlmStatus('loading')

    runPriorTherapyExtraction({
      caseId,
      aufnahmeText: sources.aufnahmeText,
      verlaufText: sources.verlaufText,
      patientName,
    })
      .then((result) => {
        extractionCache.set(caseId, { signature, response: result })
        if (cancelled || activeSignature.current !== signature) return
        setResponse(result)
        setLlmStatus('ready')
      })
      .catch(() => {
        if (cancelled || activeSignature.current !== signature) return
        setResponse(null)
        setLlmStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [caseId, enabled, signature, sources, patientName, cmeaRead])

  const inferred = useMemo(
    () => (cmeaRead ? factInferred : response ? toInferredItems(response.items) : []),
    [cmeaRead, factInferred, response],
  )

  const mergedItems = useMemo(
    () => mergePriorTherapies(deterministic, inferred),
    [deterministic, inferred],
  )

  // ── Failure analysis ("mögliche Ursache") ──────────────────────────────────
  // Deterministic-first: signals come from structured data (serum levels,
  // smoking + CYP dependence, adherence, dose/duration) and synthesise an
  // immediate, offline "mögliche Ursache". The LLM pass then refines/extends it
  // (e.g. receptor mismatch) in the background.
  const failureCtx = useMemo<FailureAnalysisContext>(() => {
    const entriesBySubstance = new Map<string, MedicationEntry>()
    for (const med of medications) {
      entriesBySubstance.set(normalizeSubstanceKey(med.substance), med)
    }
    return {
      spiegelSeries: extractSpiegelwerte(loadBefunde(caseId)),
      smoking: detectSmoking(sources.aufnahmeText),
      entriesBySubstance,
      trialFactsBySubstance: cmeaRead ? indexTrialFactsBySubstance(factTrials) : undefined,
    }
  }, [caseId, sources.aufnahmeText, medications, cmeaRead, factTrials])

  const failureInputs = useMemo(() => {
    return mergedItems.filter(isInefficacyFailure).map((item) => {
      const signals = computeFailureSignals(item, failureCtx)
      return {
        key: normalizeSubstanceKey(item.substance),
        drug: {
          substance: item.substance,
          event: item.event,
          reason: item.reason,
          signals,
        } satisfies PriorTherapyFailureDrugInput,
        deterministic: buildFailureAnalysisFromSignals(signals),
      }
    })
  }, [mergedItems, failureCtx])

  const deterministicAnalysisByKey = useMemo(() => {
    const map = new Map<string, FailureAnalysis>()
    for (const input of failureInputs) map.set(input.key, input.deterministic)
    return map
  }, [failureInputs])

  const drugsPayload = useMemo(() => failureInputs.map((input) => input.drug), [failureInputs])

  const failureSignature = useMemo(
    () => hashString(`${caseId}|${JSON.stringify(drugsPayload)}`),
    [caseId, drugsPayload],
  )

  const failureCached = failureAnalysisCache.get(caseId)
  const initialFailure =
    failureCached?.signature === failureSignature ? responseToMaps(failureCached.response) : null
  const [llmAnalyses, setLlmAnalyses] = useState<Map<string, FailureAnalysis>>(
    initialFailure?.byKey ?? new Map(),
  )
  const [aiAnalyzedSubstances, setAiAnalyzedSubstances] = useState<Set<string>>(
    initialFailure?.aiKeys ?? new Set(),
  )
  const [failureAnalysisStatus, setFailureAnalysisStatus] = useState<PriorTherapyLlmStatus>(
    initialFailure ? 'ready' : 'idle',
  )
  const activeFailureSignature = useRef<string>('')

  useEffect(() => {
    // Facts path: why-failed is a pure function over facts + drug reference
    // (deterministic synthesis already folds in the fact-enriched signals), so
    // the bespoke failure-analysis route is never called.
    if (cmeaRead) {
      setLlmAnalyses(new Map())
      setAiAnalyzedSubstances(new Set())
      setFailureAnalysisStatus(drugsPayload.length === 0 ? 'idle' : 'ready')
      return
    }
    if (!enabled || drugsPayload.length === 0) {
      setLlmAnalyses(new Map())
      setAiAnalyzedSubstances(new Set())
      setFailureAnalysisStatus('idle')
      return
    }

    const cached = failureAnalysisCache.get(caseId)
    if (cached?.signature === failureSignature) {
      const maps = responseToMaps(cached.response)
      setLlmAnalyses(maps.byKey)
      setAiAnalyzedSubstances(maps.aiKeys)
      setFailureAnalysisStatus('ready')
      return
    }

    let cancelled = false
    activeFailureSignature.current = failureSignature
    setFailureAnalysisStatus('loading')

    runPriorTherapyFailureAnalysis({
      caseId,
      aufnahmeText: sources.aufnahmeText,
      verlaufText: sources.verlaufText,
      patientName,
      drugs: drugsPayload,
    })
      .then((result) => {
        failureAnalysisCache.set(caseId, { signature: failureSignature, response: result })
        if (cancelled || activeFailureSignature.current !== failureSignature) return
        const maps = responseToMaps(result)
        setLlmAnalyses(maps.byKey)
        setAiAnalyzedSubstances(maps.aiKeys)
        setFailureAnalysisStatus('ready')
      })
      .catch(() => {
        if (cancelled || activeFailureSignature.current !== failureSignature) return
        // Deterministic analysis still shows; just flag the LLM pass as failed.
        setFailureAnalysisStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [caseId, enabled, failureSignature, drugsPayload, sources, patientName, cmeaRead])

  const items = useMemo(() => {
    if (deterministicAnalysisByKey.size === 0 && llmAnalyses.size === 0) return mergedItems
    return mergedItems.map((item) => {
      if (!isInefficacyFailure(item)) return item
      const key = normalizeSubstanceKey(item.substance)
      const failureAnalysis = llmAnalyses.get(key) ?? deterministicAnalysisByKey.get(key)
      return failureAnalysis ? { ...item, failureAnalysis } : item
    })
  }, [mergedItems, llmAnalyses, deterministicAnalysisByKey])

  return {
    items,
    deterministic,
    hasInferred: inferred.length > 0,
    llmStatus,
    mock: response?.mock ?? false,
    failureAnalysisStatus,
    aiAnalyzedSubstances,
  }
}
