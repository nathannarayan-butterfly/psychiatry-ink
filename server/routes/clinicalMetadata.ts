import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { resolveAccountId } from '../middleware/auth'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import {
  runClinicalMetadataExtraction,
  type CmeaSectionInput,
} from '../services/clinicalMetadataExtract'
import type { ClinicalSourceType } from '../../src/types/clinicalImprint'

export const clinicalMetadataRouter: Router = createRouter()

const VALID_SOURCE_TYPES: ClinicalSourceType[] = [
  'anamnesis',
  'verlauf',
  'arztbrief',
  'medication',
  'lab',
  'risk',
  'diagnosis',
  'manual_note',
  'ai_generation',
]
const MAX_SECTIONS = 40
const MAX_TEXT_CHARS = 20_000

function sanitizeSections(raw: unknown): CmeaSectionInput[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: CmeaSectionInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const sourceId = typeof r.sourceId === 'string' ? r.sourceId.trim() : ''
    const text = typeof r.text === 'string' ? r.text.slice(0, MAX_TEXT_CHARS) : ''
    if (!sourceId || !text.trim() || seen.has(sourceId)) continue
    const sourceType = VALID_SOURCE_TYPES.includes(r.sourceType as ClinicalSourceType)
      ? (r.sourceType as ClinicalSourceType)
      : 'manual_note'
    const sourceDate =
      typeof r.sourceDate === 'string' && r.sourceDate.trim()
        ? r.sourceDate
        : new Date().toISOString()
    seen.add(sourceId)
    out.push({ sourceId, sourceType, sourceDate, text })
    if (out.length >= MAX_SECTIONS) break
  }
  return out
}

// POST /api/clinical-metadata/extract — single batched, de-identified extraction.
clinicalMetadataRouter.post('/extract', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const sections = sanitizeSections(body.sections)

    if (!caseId || sections.length === 0) {
      res.status(400).json({ error: 'caseId and at least one section are required' })
      return
    }

    if (!(await assertAiGenerationAllowed(req, res, caseId))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const llmModel = parseLlmModelRequest(body, 'standard')
    const tier = llmModel.tier ?? 'standard'
    const patientName = typeof body.patientName === 'string' ? body.patientName : undefined

    const userId = resolveAccountId(req)
    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId,
      featureKey: 'clinical_metadata_extraction',
      metadata: { route: 'clinical-metadata-extract', tier, sectionCount: sections.length },
    })

    const extraction = await runClinicalMetadataExtraction({
      caseId,
      sections,
      patientName,
      tier,
      model: llmModel.model,
      language,
      usageContext,
    })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId,
        metadata: { route: 'clinical-metadata-extract', tier, factCount: extraction.facts.length },
      })
    }

    res.json({
      caseId,
      model: extraction.model,
      mock: extraction.mock,
      facts: extraction.facts,
      deidentified: true,
      disclaimer:
        'KI-gestützte, de-identifizierte Faktenextraktion — beratend, vom Kliniker zu prüfen. Keine Diagnosestellung.',
    })
  } catch (error) {
    console.error('[clinical-metadata] extract failed:', error)
    res.status(500).json({ error: 'Klinische Faktenextraktion fehlgeschlagen' })
  }
})
