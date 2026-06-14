import type { SubstanceProfileDraft } from '../../src/schemas/kb/substanceProfile'
import type { KbProvenanceSourceType } from '../../src/types/kbReleases'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

interface ProvenanceInsert {
  substance_id: string
  field_path: string
  value_snapshot: unknown
  source_type: KbProvenanceSourceType
  source_citation: string | null
  confidence: string | null
}

function buildAiSeedProvenanceRows(substanceId: string, draft: SubstanceProfileDraft): ProvenanceInsert[] {
  const rows: ProvenanceInsert[] = []

  if (draft.mechanismSummary) {
    rows.push({
      substance_id: substanceId,
      field_path: 'mechanismSummary',
      value_snapshot: draft.mechanismSummary,
      source_type: 'ai_draft',
      source_citation: 'AI seed (DeepSeek) — unverified draft',
      confidence: 'low',
    })
  }

  const receptors = draft.receptorAffinityProfile.slice(0, 2)
  for (const receptor of receptors) {
    rows.push({
      substance_id: substanceId,
      field_path: `receptorAffinities.${receptor.receptor}.action`,
      value_snapshot: {
        receptor: receptor.receptor,
        effectType: receptor.effectType,
        affinityPercent: receptor.affinityPercent,
      },
      source_type: 'ai_draft',
      source_citation: 'AI seed receptor profile — unverified draft',
      confidence: receptor.confidence ?? 'estimated',
    })
  }

  return rows
}

/** Write field-level provenance rows after AI seed insert. */
export async function writeAiSeedProvenance(substanceId: string, draft: SubstanceProfileDraft): Promise<void> {
  const rows = buildAiSeedProvenanceRows(substanceId, draft)
  if (!rows.length) return

  const supabase = getKbSupabaseAdmin()
  await supabase.from('kb_field_provenance').delete().eq('substance_id', substanceId)

  const { error } = await supabase.from('kb_field_provenance').insert(rows)
  if (error) throw error
}
