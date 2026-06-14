import type { KbRelease } from '../../src/types/kbReleases'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

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

/** Current published KB release for Psychiatry.ink consumption. */
export async function getCurrentKbRelease(): Promise<KbRelease | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_releases')
    .select('*')
    .eq('is_current', true)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapReleaseRow(data as Record<string, unknown>)
}

export async function getKbReleaseByVersion(versionLabel: string): Promise<KbRelease | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_releases')
    .select('*')
    .eq('version_label', versionLabel)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapReleaseRow(data as Record<string, unknown>)
}
