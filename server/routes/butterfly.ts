import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { tierToMode } from '../ai/aiRouter'
import { resolveAccountId } from '../middleware/auth'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import {
  runButterflyExtraction,
  type ButterflyCriterionQuery,
} from '../services/butterflyExtract'
import {
  generateInterviewQuestions,
  type InterviewQuestionCriterion,
} from '../services/interviewQuestions'
import type { DiscussPackageContent, DiscussPackageSection } from '../../src/types/discussCase'

export const butterflyRouter: Router = createRouter()

const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']
const MAX_CRITERIA = 40
const MAX_CRITERION_TEXT = 400
const MAX_CITATION_TEXT = 120
const MAX_SECTIONS = 40

function sanitizeCriteria(raw: unknown): ButterflyCriterionQuery[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: ButterflyCriterionQuery[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id.trim() : ''
    const text = typeof r.text === 'string' ? r.text.trim().slice(0, MAX_CRITERION_TEXT) : ''
    if (!id || !text || seen.has(id)) continue
    seen.add(id)
    out.push({ id, text })
    if (out.length >= MAX_CRITERIA) break
  }
  return out
}

/**
 * Sanitize the generic (non-PHI) criterion references used to generate
 * interview questions. Unlike {@link sanitizeCriteria}, this also carries an
 * optional language-neutral citation string for prompt grounding.
 */
function sanitizeInterviewCriteria(raw: unknown): InterviewQuestionCriterion[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: InterviewQuestionCriterion[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id.trim() : ''
    const text = typeof r.text === 'string' ? r.text.trim().slice(0, MAX_CRITERION_TEXT) : ''
    if (!id || !text || seen.has(id)) continue
    const citation =
      typeof r.citation === 'string' && r.citation.trim()
        ? r.citation.trim().slice(0, MAX_CITATION_TEXT)
        : undefined
    seen.add(id)
    out.push({ id, text, citation })
    if (out.length >= MAX_CRITERIA) break
  }
  return out
}

function sanitizePackage(raw: unknown, caseId: string): DiscussPackageContent | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rawSections = Array.isArray(r.sections) ? r.sections : []
  const sections: DiscussPackageSection[] = rawSections
    .slice(0, MAX_SECTIONS)
    .map((item) => {
      const s = (item ?? {}) as Record<string, unknown>
      return {
        key: 'anamnesis',
        id: typeof s.id === 'string' ? s.id : 'section',
        label: typeof s.label === 'string' ? s.label : '',
        content: typeof s.content === 'string' ? s.content : '',
      } as DiscussPackageSection
    })
    .filter((section) => section.content.trim().length > 0)

  return {
    version: 1,
    builtAt: new Date().toISOString(),
    caseId,
    patientLabel: typeof r.patientLabel === 'string' ? r.patientLabel : 'Patient',
    sections,
    isDeidentified: true,
  }
}

// POST /api/butterfly/extract — batched, de-identified criteria extraction.
butterflyRouter.post('/extract', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const disorderName = typeof body.disorderName === 'string' ? body.disorderName.trim().slice(0, 160) : ''
    const criteria = sanitizeCriteria(body.criteria)

    if (!caseId || !disorderName || criteria.length === 0) {
      res.status(400).json({ error: 'caseId, disorderName and criteria are required' })
      return
    }

    const packageContent = sanitizePackage(body.package, caseId)
    if (!packageContent) {
      res.status(400).json({ error: 'package with sections is required' })
      return
    }

    if (!(await assertAiGenerationAllowed(req, res, caseId))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const tier: AiModelTier = VALID_TIERS.includes(body.tier as AiModelTier)
      ? (body.tier as AiModelTier)
      : 'fast'

    const userId = resolveAccountId(req)
    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId,
      featureKey: 'butterfly',
      metadata: { route: 'butterfly-extract', tier, disorderName, criterionCount: criteria.length },
    })

    const extraction = await runButterflyExtraction({
      packageContent,
      disorderName,
      criteria,
      tier,
      // Bill at the selected tier's mode (economic 1× / standard 2× / gruendlich 4×).
      mode: tierToMode(tier),
      language,
      usageContext,
    })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId,
        metadata: { route: 'butterfly-extract', tier, disorderName },
      })
    }

    // Advisory provenance — never auto-accepted, never a diagnosis assertion.
    res.json({
      disorderName,
      model: extraction.model,
      mock: extraction.mock,
      results: extraction.results.map((result) => ({
        ...result,
        provenance: 'pending_clinician_review' as const,
        evidenceStrength: 'inferred' as const,
      })),
      disclaimer:
        'KI-gestützte Vorschläge aus de-identifizierter Dokumentation — vom Kliniker zu prüfen und zu bestätigen. Keine Diagnosestellung.',
    })
  } catch (error) {
    console.error('[butterfly] extract failed:', error)
    res.status(500).json({ error: 'Butterfly-Prüfung fehlgeschlagen' })
  }
})

// POST /api/butterfly/interview-questions — turn unresolved criteria into
// concrete, patient-directed interview questions. The prompt is built ONLY from
// generic clinical reference metadata (our criterion paraphrase + disorder name
// + citation); NO patient PHI is sent here.
butterflyRouter.post('/interview-questions', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const disorderName = typeof body.disorderName === 'string' ? body.disorderName.trim().slice(0, 160) : ''
    const criteria = sanitizeInterviewCriteria(body.criteria)

    if (!caseId || !disorderName || criteria.length === 0) {
      res.status(400).json({ error: 'caseId, disorderName and criteria are required' })
      return
    }

    if (!(await assertAiGenerationAllowed(req, res, caseId))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const tier: AiModelTier = VALID_TIERS.includes(body.tier as AiModelTier)
      ? (body.tier as AiModelTier)
      : 'fast'

    const userId = resolveAccountId(req)
    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId,
      featureKey: 'butterfly',
      metadata: {
        route: 'butterfly-interview-questions',
        tier,
        disorderName,
        criterionCount: criteria.length,
      },
    })

    const generation = await generateInterviewQuestions({
      disorderName,
      criteria,
      tier,
      // Bill at the selected tier's mode (economic 1× / standard 2× / gruendlich 4×).
      mode: tierToMode(tier),
      language,
      usageContext,
    })

    if (!generation.mock && userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId,
        metadata: { route: 'butterfly-interview-questions', tier, disorderName },
      })
    }

    res.json({
      disorderName,
      model: generation.model,
      mock: generation.mock,
      results: generation.results,
      disclaimer:
        'KI-formulierte Interviewfragen aus generischen Kriterien-Referenzen — vom Kliniker zu prüfen. Keine Diagnosestellung.',
    })
  } catch (error) {
    console.error('[butterfly] interview-questions failed:', error)
    res.status(500).json({ error: 'Fragegenerierung fehlgeschlagen' })
  }
})
