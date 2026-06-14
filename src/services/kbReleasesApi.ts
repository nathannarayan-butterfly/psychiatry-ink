import type { KbRelease } from '../types/kbReleases'
import { getSupabase } from '../lib/supabase'

export const KB_RELEASES_TABLE = 'kb_releases'

function mapReleaseRow(row: Record<string, unknown>): KbRelease {
  return {
    id: String(row.id),
    versionLabel: String(row.version_label),
    source: String(row.source),
    publishedAt: String(row.published_at),
    syncedAt: String(row.synced_at),
    notes: row.notes ? String(row.notes) : null,
    isCurrent: Boolean(row.is_current),
    snapshotMetadata:
      row.snapshot_metadata && typeof row.snapshot_metadata === 'object'
        ? (row.snapshot_metadata as Record<string, unknown>)
        : null,
    createdAt: String(row.created_at),
  }
}

export function isKbReleasesSupabaseReady(): boolean {
  return getSupabase() != null
}

/** Fetch the current published KB release (read-only metadata for clinician UI). */
export async function fetchCurrentKbRelease(): Promise<KbRelease | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from(KB_RELEASES_TABLE)
    .select('*')
    .eq('is_current', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapReleaseRow(data as Record<string, unknown>)
}
