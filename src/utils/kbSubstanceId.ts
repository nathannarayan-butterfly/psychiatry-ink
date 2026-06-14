import type { KnowledgeBaseDrug } from '../types/knowledgeBase'

/** Resolve normalized kb_substances UUID from a projected or legacy drug record. */
export function extractKbSubstanceId(drug: KnowledgeBaseDrug): string | null {
  const tag = drug.tags?.find((entry) => entry.startsWith('kb-substance:'))
  if (tag) return tag.slice('kb-substance:'.length)
  if (drug.id.startsWith('kb-norm-')) return drug.id.slice('kb-norm-'.length)
  return null
}
