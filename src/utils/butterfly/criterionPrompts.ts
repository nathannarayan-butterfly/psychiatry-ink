/**
 * Butterfly Feature-A helpers: turn unresolved (`unknown`) criteria into
 * actionable, per-criterion clinician prompts and deep-links.
 */

import type { NotionPageId } from '../../components/notion/notionPages'
import type { Disorder } from '../../data/diagnosisCriteria'
import type { DisorderEvaluation } from '../diagnosisCriteria/evaluateDisorder'
import type { ButterflyCriterionQuery } from '../../services/butterflyExtractApi'

/** Map a criterion's documentation deep-link hint to a workspace page id. */
const HINT_PAGE_MAP: Record<string, NotionPageId> = {
  psychopathologie: 'psychopath',
  psychopath: 'psychopath',
  anamnese: 'aufnahme',
  aufnahme: 'aufnahme',
  verlauf: 'verlauf',
}

/** Unresolved inclusion/exclusion criteria (status `unknown`) for one disorder. */
export function selectUnresolvedCriteria(evaluation: DisorderEvaluation): ButterflyCriterionQuery[] {
  const seen = new Set<string>()
  const out: ButterflyCriterionQuery[] = []
  for (const result of evaluation.perCriterion) {
    if (result.status !== 'unknown') continue
    if (seen.has(result.criterionId)) continue
    seen.add(result.criterionId)
    out.push({ id: result.criterionId, text: result.text_de })
  }
  return out
}

/** The workspace page a clinician should open to document a given criterion. */
export function resolveDeepLinkPage(disorder: Disorder, criterionId: string): NotionPageId | undefined {
  for (const group of disorder.groups) {
    const criterion = group.criteria.find((item) => item.id === criterionId)
    if (!criterion) continue
    for (const hint of criterion.mappingHints) {
      if (hint.deepLinkPageId && HINT_PAGE_MAP[hint.deepLinkPageId]) {
        return HINT_PAGE_MAP[hint.deepLinkPageId]
      }
    }
  }
  return undefined
}
