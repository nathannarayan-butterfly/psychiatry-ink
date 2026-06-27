import type { DemoPatientFixture } from '../../src/demo/types'
import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'

export interface CanonicalDemoPatientRecord {
  seedVersion: string
  fixture: DemoPatientFixture
  publishedBy: string | null
  publishedByEmail: string | null
  publishedAt: string
}

export function isDemoPatientCanonicalStoreConfigured(): boolean {
  return isKbAdminConfigured()
}

export async function getCanonicalDemoPatient(): Promise<CanonicalDemoPatientRecord | null> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('demo_patient_canonical')
    .select('seed_version, fixture, published_by, published_by_email, published_at')
    .eq('id', 'canonical')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    seedVersion: String(data.seed_version),
    fixture: data.fixture as DemoPatientFixture,
    publishedBy: data.published_by ? String(data.published_by) : null,
    publishedByEmail: data.published_by_email ? String(data.published_by_email) : null,
    publishedAt: String(data.published_at),
  }
}

export async function publishCanonicalDemoPatient(input: {
  seedVersion: string
  fixture: DemoPatientFixture
  publishedBy: string
  publishedByEmail: string | null
}): Promise<CanonicalDemoPatientRecord> {
  const now = new Date().toISOString()
  const { data, error } = await getKbSupabaseAdmin()
    .from('demo_patient_canonical')
    .upsert(
      {
        id: 'canonical',
        seed_version: input.seedVersion,
        fixture: input.fixture,
        published_by: input.publishedBy,
        published_by_email: input.publishedByEmail,
        published_at: now,
      },
      { onConflict: 'id' },
    )
    .select('seed_version, fixture, published_by, published_by_email, published_at')
    .single()

  if (error) throw error

  return {
    seedVersion: String(data.seed_version),
    fixture: data.fixture as DemoPatientFixture,
    publishedBy: data.published_by ? String(data.published_by) : null,
    publishedByEmail: data.published_by_email ? String(data.published_by_email) : null,
    publishedAt: String(data.published_at),
  }
}
