import { listKbSubstances, updateKbSubstance } from './kbNormalizedStore'
import { projectAndUpsertKnowledgeBaseDrug } from './kbProjection'

export type BulkPublishItem = {
  id: string
  genericName: string
  projectedDrugId?: string
  reason?: string
  error?: string
}

export type BulkPublishSummary = {
  total: number
  succeeded: BulkPublishItem[]
  skipped: BulkPublishItem[]
  failed: BulkPublishItem[]
}

export type PublishAllFilters = {
  status?: string
  category?: string
  reviewStatus?: string
}

/** Publish one normalized substance and project to knowledge_base_drugs. */
export async function publishKbSubstance(id: string): Promise<string> {
  await updateKbSubstance(
    id,
    {
      status: 'published',
      reviewStatus: 'approved',
      // Visible in Psychopharmacologie; clinician still expected to verify before relying.
      needsClinicalReview: true,
    },
    'publish',
  )
  return projectAndUpsertKnowledgeBaseDrug(id)
}

function resolvePublishAllFilters(filters?: PublishAllFilters): PublishAllFilters {
  if (filters?.status || filters?.reviewStatus || filters?.category) return filters
  // Default: all substances; caller skips already published / archived.
  return {}
}

/** Bulk publish unpublished kb_substances (server-side; no HTTP). */
export async function publishAllKbSubstances(
  filters?: PublishAllFilters,
): Promise<BulkPublishSummary> {
  const resolved = resolvePublishAllFilters(filters)
  const substances = await listKbSubstances(resolved)
  const succeeded: BulkPublishItem[] = []
  const skipped: BulkPublishItem[] = []
  const failed: BulkPublishItem[] = []

  for (const s of substances) {
    if (s.status === 'published') {
      skipped.push({ id: s.id, genericName: s.genericName, reason: 'already_published' })
      continue
    }
    if (s.status === 'archived') {
      skipped.push({ id: s.id, genericName: s.genericName, reason: 'archived' })
      continue
    }
    try {
      const projectedDrugId = await publishKbSubstance(s.id)
      succeeded.push({ id: s.id, genericName: s.genericName, projectedDrugId })
    } catch (err) {
      failed.push({
        id: s.id,
        genericName: s.genericName,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { total: substances.length, succeeded, skipped, failed }
}

/** Set needs_clinical_review and re-project all published substances (idempotent). */
export async function syncPublishedKbProjections(): Promise<BulkPublishSummary> {
  const substances = await listKbSubstances({ status: 'published' })
  const succeeded: BulkPublishItem[] = []
  const skipped: BulkPublishItem[] = []
  const failed: BulkPublishItem[] = []

  for (const s of substances) {
    try {
      if (!s.needsClinicalReview) {
        await updateKbSubstance(s.id, { needsClinicalReview: true }, 'publish')
      }
      const projectedDrugId = await projectAndUpsertKnowledgeBaseDrug(s.id)
      succeeded.push({ id: s.id, genericName: s.genericName, projectedDrugId })
    } catch (err) {
      failed.push({
        id: s.id,
        genericName: s.genericName,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { total: substances.length, succeeded, skipped, failed }
}
