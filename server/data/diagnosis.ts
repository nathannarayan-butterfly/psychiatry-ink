import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database } from '../types/database'
import type { CatalogueSearchScope, CatalogueSearchSystem, CatalogueSystem } from '../../src/types/diagnosisCatalogue'

/**
 * diagnosisRepo — typed data-access seam for the diagnosis reference data
 * (Prisma → Supabase). Wraps the snake_case tables created in the consolidation
 * migrations:
 *   - `diagnosis_codes` (flat ICD-10/11/DSM crosswalk)
 *   - `diagnosis_catalogues` / `diagnosis_entries` / `diagnosis_synonyms` /
 *     `diagnosis_criteria_links` (structured catalogue)
 *
 * All reads go through the service-role client. This is reference data with no
 * per-user ownership; the catalogue tables ship EMPTY until re-seeded, so every
 * function must return faithfully empty results (never fabricated rows) when the
 * tables hold no data.
 */

type DiagnosisCodeRow = Database['public']['Tables']['diagnosis_codes']['Row']

/** camelCase projection of a `diagnosis_codes` row (matches the legacy Prisma shape). */
export interface DiagnosisCodeRecord {
  system: string
  code: string
  labelDe: string
  icd10Code: string
  icd10Label: string
  icd11Code: string
  icd11Label: string
  dsmCode: string
  dsmLabel: string
  searchText: string
}

function toCodeRecord(row: DiagnosisCodeRow): DiagnosisCodeRecord {
  return {
    system: row.system,
    code: row.code,
    labelDe: row.label_de,
    icd10Code: row.icd10_code,
    icd10Label: row.icd10_label,
    icd11Code: row.icd11_code,
    icd11Label: row.icd11_label,
    dsmCode: row.dsm_code,
    dsmLabel: row.dsm_label,
    searchText: row.search_text,
  }
}

/**
 * Strip characters that would break a PostgREST `or=()` filter string (top-level
 * commas, parentheses, quotes). Diagnosis search terms are codes/words, so this
 * is a no-op for realistic inputs and only guards against malformed filters.
 *
 * NOTE: the interpolated `.or(...)` strings below are PostgREST *filter* syntax
 * (sent as URL query params), NOT raw SQL — supabase-js / PostgREST bind these
 * as structured filters, so there is no SQL-injection sink here. `*` is the
 * PostgREST `LIKE` wildcard (translated to `%`).
 */
function sanitizeForOr(value: string): string {
  return value.replace(/[",()]/g, '')
}

/**
 * Search the flat crosswalk by system. Mirrors the legacy Prisma query:
 *   where system = :system AND (search_text LIKE '%q%' OR code LIKE 'Q%')
 *   order by code asc, take :limit
 */
export async function searchDiagnosisCodes(params: {
  system: string
  q: string
  limit: number
}): Promise<DiagnosisCodeRecord[]> {
  const q = sanitizeForOr(params.q)
  const codePrefix = sanitizeForOr(params.q.toUpperCase())
  const { data, error } = await getSupabaseAdmin()
    .from('diagnosis_codes')
    .select('*')
    .eq('system', params.system)
    .or(`search_text.like.*${q}*,code.like.${codePrefix}*`)
    .order('code', { ascending: true })
    .limit(params.limit)
  if (error) throw new Error(`diagnosis_codes search failed: ${error.message}`)
  return (data ?? []).map(toCodeRecord)
}

/** Find a single crosswalk row by (system, code). */
export async function findDiagnosisCodeBySystemCode(
  system: string,
  code: string,
): Promise<DiagnosisCodeRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('diagnosis_codes')
    .select('*')
    .eq('system', system)
    .eq('code', code)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`diagnosis_codes lookup failed: ${error.message}`)
  return data ? toCodeRecord(data) : null
}

/** Find the first crosswalk row where a specific anchor column equals `value`. */
export async function findDiagnosisCodeByColumn(
  column: 'icd10_code' | 'icd11_code' | 'dsm_code',
  value: string,
): Promise<DiagnosisCodeRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('diagnosis_codes')
    .select('*')
    .eq(column, value)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`diagnosis_codes anchor lookup failed: ${error.message}`)
  return data ? toCodeRecord(data) : null
}

/** Count crosswalk rows grouped by system (legacy Prisma `groupBy`). */
export async function countDiagnosisCodesBySystem(): Promise<Array<{ system: string; count: number }>> {
  const { data, error } = await getSupabaseAdmin().from('diagnosis_codes').select('system')
  if (error) throw new Error(`diagnosis_codes count failed: ${error.message}`)
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    counts.set(row.system, (counts.get(row.system) ?? 0) + 1)
  }
  return [...counts.entries()].map(([system, count]) => ({ system, count }))
}

// ---------------------------------------------------------------------------
// Structured catalogue (diagnosis_catalogues / _entries / _synonyms / _links)
// ---------------------------------------------------------------------------

export interface CatalogueMeta {
  id: string
  system: CatalogueSystem
  version: string
}

/** Active catalogues, optionally constrained to the requested search system. */
export async function listActiveCatalogues(
  system: CatalogueSearchSystem,
): Promise<CatalogueMeta[]> {
  let query = getSupabaseAdmin()
    .from('diagnosis_catalogues')
    .select('id, system, version')
    .eq('active', true)
  if (system === 'ALL') {
    query = query.in('system', ['ICD10GM', 'ICD11MMS'])
  } else {
    query = query.eq('system', system)
  }
  const { data, error } = await query
  if (error) throw new Error(`diagnosis_catalogues read failed: ${error.message}`)
  return (data ?? []).map((c) => ({ id: c.id, system: c.system as CatalogueSystem, version: c.version }))
}

/** A catalogue entry candidate returned from search, pre-joined with metadata. */
export interface CatalogueEntryCandidate {
  id: string
  code: string
  codeNormalized: string
  title: string
  searchText: string
  shortTitle: string | null
  chapterCode: string | null
  chapterTitle: string | null
  blockCode: string | null
  blockTitle: string | null
  isCategory: boolean
  isSelectable: boolean
  system: CatalogueSystem
  catalogueVersion: string
  catalogueId: string
  criteriaAvailable: boolean
}

const ENTRY_SELECT =
  'id, catalogue_id, code, code_normalized, title, short_title, description, search_text, chapter_code, chapter_title, block_code, block_title, is_category, is_selectable, is_psychiatric, is_somatic, diagnosis_criteria_links(id)'

type EntryWithLinks = {
  id: string
  catalogue_id: string
  code: string
  code_normalized: string
  title: string
  short_title: string | null
  search_text: string
  chapter_code: string | null
  chapter_title: string | null
  block_code: string | null
  block_title: string | null
  is_category: boolean
  is_selectable: boolean
  diagnosis_criteria_links: Array<{ id: string }>
}

function scopeColumn(scope: CatalogueSearchScope): 'is_psychiatric' | 'is_somatic' | null {
  if (scope === 'psychiatric') return 'is_psychiatric'
  if (scope === 'somatic') return 'is_somatic'
  return null
}

/**
 * Fetch the candidate entry pool for catalogue search. Replaces the Prisma
 * relational `findMany` (entry OR synonym match) with two service-role queries
 * (base-field match + synonym match) merged by id. Ranking/slicing stays in the
 * caller (`diagnosisCatalogueStore`) exactly as before.
 */
export async function searchCatalogueEntries(params: {
  q: string
  qCode: string
  rawTitle: string
  scope: CatalogueSearchScope
  catalogueIds: string[]
  catalogueById: Map<string, CatalogueMeta>
  poolSize: number
}): Promise<CatalogueEntryCandidate[]> {
  if (params.catalogueIds.length === 0) return []
  const admin = getSupabaseAdmin()
  const q = sanitizeForOr(params.q)
  const qCode = sanitizeForOr(params.qCode)
  const rawTitle = sanitizeForOr(params.rawTitle)
  const scopeCol = scopeColumn(params.scope)

  // Query A — base-column matches (search_text / code / title). Scope filter is
  // applied before `.or()`/`.limit()` because `.limit()` returns a transform
  // builder that no longer exposes `.eq()`.
  let baseFilter = admin
    .from('diagnosis_entries')
    .select(ENTRY_SELECT)
    .in('catalogue_id', params.catalogueIds)
  if (scopeCol) baseFilter = baseFilter.eq(scopeCol, true)
  const { data: baseData, error: baseError } = await baseFilter
    .or(`search_text.like.*${q}*,code_normalized.like.${qCode}*,title.like.*${rawTitle}*`)
    .limit(params.poolSize)
  if (baseError) throw new Error(`diagnosis_entries search failed: ${baseError.message}`)

  // Query B — synonym matches (inner-join synonyms, filtered on the embedded resource).
  let synonymFilter = admin
    .from('diagnosis_entries')
    .select(`${ENTRY_SELECT}, diagnosis_synonyms!inner(id)`)
    .in('catalogue_id', params.catalogueIds)
  if (scopeCol) synonymFilter = synonymFilter.eq(scopeCol, true)
  const { data: synonymData, error: synonymError } = await synonymFilter
    .or(`normalized_term.like.*${q}*,term.like.*${rawTitle}*`, {
      referencedTable: 'diagnosis_synonyms',
    })
    .limit(params.poolSize)
  if (synonymError) throw new Error(`diagnosis_entries synonym search failed: ${synonymError.message}`)

  const merged = new Map<string, EntryWithLinks>()
  for (const row of [...((baseData ?? []) as unknown as EntryWithLinks[]), ...((synonymData ?? []) as unknown as EntryWithLinks[])]) {
    if (!merged.has(row.id)) merged.set(row.id, row)
  }

  const candidates: CatalogueEntryCandidate[] = []
  for (const row of merged.values()) {
    const cat = params.catalogueById.get(row.catalogue_id)
    if (!cat) continue
    candidates.push({
      id: row.id,
      code: row.code,
      codeNormalized: row.code_normalized,
      title: row.title,
      searchText: row.search_text,
      shortTitle: row.short_title,
      chapterCode: row.chapter_code,
      chapterTitle: row.chapter_title,
      blockCode: row.block_code,
      blockTitle: row.block_title,
      isCategory: row.is_category,
      isSelectable: row.is_selectable,
      system: cat.system,
      catalogueVersion: cat.version,
      catalogueId: row.catalogue_id,
      criteriaAvailable: (row.diagnosis_criteria_links ?? []).length > 0,
    })
  }
  return candidates
}

export interface CatalogueRow {
  id: string
  system: CatalogueSystem
  version: string
  language: string
  active: boolean
  importedAt: string
}

/** Active catalogues ordered by system asc, version desc (for coverage report). */
export async function listActiveCataloguesOrdered(): Promise<CatalogueRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('diagnosis_catalogues')
    .select('id, system, version, language, active, imported_at')
    .eq('active', true)
    .order('system', { ascending: true })
    .order('version', { ascending: false })
  if (error) throw new Error(`diagnosis_catalogues read failed: ${error.message}`)
  return (data ?? []).map((c) => ({
    id: c.id,
    system: c.system as CatalogueSystem,
    version: c.version,
    language: c.language,
    active: c.active,
    importedAt: c.imported_at,
  }))
}

/** Count entries for a catalogue, optionally filtered by a boolean flag column. */
export async function countCatalogueEntries(
  catalogueId: string,
  flag?: 'is_psychiatric' | 'is_somatic',
): Promise<number> {
  let query = getSupabaseAdmin()
    .from('diagnosis_entries')
    .select('id', { count: 'exact', head: true })
    .eq('catalogue_id', catalogueId)
  if (flag) query = query.eq(flag, true)
  const { count, error } = await query
  if (error) throw new Error(`diagnosis_entries count failed: ${error.message}`)
  return count ?? 0
}

/** Count entries for a catalogue that have at least one criteria link. */
export async function countCatalogueEntriesWithCriteriaLinks(catalogueId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('diagnosis_entries')
    .select('id, diagnosis_criteria_links!inner(id)', { count: 'exact', head: true })
    .eq('catalogue_id', catalogueId)
  if (error) throw new Error(`diagnosis_entries link count failed: ${error.message}`)
  return count ?? 0
}

/** Whether any active catalogue exists. */
export async function isCatalogueSeeded(): Promise<boolean> {
  const { count, error } = await getSupabaseAdmin()
    .from('diagnosis_catalogues')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)
  if (error) throw new Error(`diagnosis_catalogues seed check failed: ${error.message}`)
  return (count ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Criteria-gap tooling support (consumed by scripts/lib/criteriaDraftGaps.ts)
// ---------------------------------------------------------------------------

export interface Icd11EntryGapInfo {
  isSelectable: boolean
  criteriaLinkCount: number
}

/** Catalogue ids for the given catalogue system (e.g. 'ICD11MMS'). */
export async function listCatalogueIdsBySystem(system: CatalogueSystem): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('diagnosis_catalogues')
    .select('id')
    .eq('system', system)
  if (error) throw new Error(`diagnosis_catalogues system lookup failed: ${error.message}`)
  return (data ?? []).map((c) => c.id)
}

/**
 * ICD-11 psychiatric entries with their criteria-link counts and selectable flag.
 * Mirrors `prisma.diagnosisEntry.findMany({ where: { catalogue.system ICD11MMS,
 * isPsychiatric }, include: { criteriaLinks } })` used by the gap summary.
 */
export async function listIcd11PsychiatricEntryGapInfo(): Promise<Icd11EntryGapInfo[]> {
  const catalogueIds = await listCatalogueIdsBySystem('ICD11MMS')
  if (catalogueIds.length === 0) return []
  const { data, error } = await getSupabaseAdmin()
    .from('diagnosis_entries')
    .select('id, is_selectable, diagnosis_criteria_links(id)')
    .in('catalogue_id', catalogueIds)
    .eq('is_psychiatric', true)
  if (error) throw new Error(`diagnosis_entries gap read failed: ${error.message}`)
  return ((data ?? []) as Array<{ is_selectable: boolean; diagnosis_criteria_links: Array<{ id: string }> }>).map(
    (row) => ({
      isSelectable: row.is_selectable,
      criteriaLinkCount: (row.diagnosis_criteria_links ?? []).length,
    }),
  )
}

export interface UnlinkedCatalogueEntry {
  id: string
  title: string
  codeNormalized: string
  chapterCode: string | null
  chapterTitle: string | null
  blockCode: string | null
  blockTitle: string | null
  description: string | null
  metadataJson: Database['public']['Tables']['diagnosis_entries']['Row']['metadata_json']
}

/**
 * Selectable, psychiatric ICD-11 Chapter-06 entries that have NO criteria links,
 * ordered by code_normalized asc. Mirrors the Prisma `buildUnlinkedCatalogueTargets`
 * query (anti-join on criteria links done in-memory).
 */
export async function listUnlinkedIcd11CatalogueEntries(limit: number): Promise<UnlinkedCatalogueEntry[]> {
  const catalogueIds = await listCatalogueIdsBySystem('ICD11MMS')
  if (catalogueIds.length === 0) return []
  const { data, error } = await getSupabaseAdmin()
    .from('diagnosis_entries')
    .select(
      'id, title, code_normalized, chapter_code, chapter_title, block_code, block_title, description, metadata_json, diagnosis_criteria_links(id)',
    )
    .in('catalogue_id', catalogueIds)
    .eq('is_psychiatric', true)
    .eq('is_selectable', true)
    .like('chapter_code', '06*')
    .order('code_normalized', { ascending: true })
  if (error) throw new Error(`diagnosis_entries unlinked read failed: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id: string
    title: string
    code_normalized: string
    chapter_code: string | null
    chapter_title: string | null
    block_code: string | null
    block_title: string | null
    description: string | null
    metadata_json: UnlinkedCatalogueEntry['metadataJson']
    diagnosis_criteria_links: Array<{ id: string }>
  }>

  return rows
    .filter((row) => (row.diagnosis_criteria_links ?? []).length === 0)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      codeNormalized: row.code_normalized,
      chapterCode: row.chapter_code,
      chapterTitle: row.chapter_title,
      blockCode: row.block_code,
      blockTitle: row.block_title,
      description: row.description,
      metadataJson: row.metadata_json,
    }))
}
