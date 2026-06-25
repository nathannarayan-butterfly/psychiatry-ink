import type { IcdTitleLookupItem, IcdTitleResult, IcdTitleVersion } from '../../shared/icdTitle'
import { findDiagnosisCodeByColumn, findDiagnosisCodeBySystemCode } from '../data/diagnosis'
import {
  getCachedIcdTitle,
  icdTitleCacheKey,
  setCachedIcdTitle,
} from './icdTitleCache'
import { fetchWhoIcdTitle } from './whoIcdClient'

function normalizeLanguage(raw: string | undefined): string {
  const lang = (raw ?? 'de').trim().toLowerCase()
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('es')) return 'es'
  return 'en'
}

function normalizeVersion(raw: string | undefined): IcdTitleVersion | null {
  if (raw === 'icd11') return 'icd11'
  if (raw === 'dsm' || raw === 'dsm5tr') return 'dsm'
  if (raw === 'icd10') return 'icd10'
  return null
}

function normalizeCode(code: string, version: IcdTitleVersion): string {
  const trimmed = code.trim()
  return version === 'icd11' ? trimmed : trimmed.toUpperCase()
}

function crosswalkSystem(version: IcdTitleVersion): 'icd10' | 'icd11' | 'dsm5tr' {
  if (version === 'icd11') return 'icd11'
  if (version === 'dsm') return 'dsm5tr'
  return 'icd10'
}

async function lookupCrosswalkTitle(code: string, version: IcdTitleVersion): Promise<string | null> {
  const normalized = normalizeCode(code, version)
  if (!normalized) return null

  const system = crosswalkSystem(version)
  const row = await findDiagnosisCodeBySystemCode(system, normalized)
  if (row?.labelDe?.trim()) return row.labelDe.trim()

  if (version === 'icd10') {
    const byAnchor = await findDiagnosisCodeByColumn('icd10_code', normalized)
    if (byAnchor?.icd10Label?.trim()) return byAnchor.icd10Label.trim()
    if (byAnchor?.labelDe?.trim()) return byAnchor.labelDe.trim()
  }

  if (version === 'icd11') {
    const byAnchor = await findDiagnosisCodeByColumn('icd11_code', normalized)
    if (byAnchor?.icd11Label?.trim()) return byAnchor.icd11Label.trim()
  }

  if (version === 'dsm') {
    const byAnchor = await findDiagnosisCodeByColumn('dsm_code', normalized)
    if (byAnchor?.dsmLabel?.trim()) return byAnchor.dsmLabel.trim()
  }

  return null
}

export async function resolveIcdDisplayTitle(params: {
  code: string
  version: IcdTitleVersion
  language?: string
}): Promise<IcdTitleResult> {
  const language = normalizeLanguage(params.language)
  const version = params.version
  const code = normalizeCode(params.code, version)

  const empty: IcdTitleResult = {
    code,
    version,
    title: '',
    language,
    source: 'none',
  }

  if (!code) return empty

  const cacheKey = icdTitleCacheKey(version, language, code)
  const cached = getCachedIcdTitle(cacheKey)
  if (cached) return cached

  let title: string | null = null
  let source: IcdTitleResult['source'] = 'none'

  if (version === 'icd10' || version === 'icd11') {
    title = await fetchWhoIcdTitle(code, version, language)
    if (title) source = 'who'
  }

  if (!title) {
    title = await lookupCrosswalkTitle(code, version)
    if (title) source = 'crosswalk'
  }

  const result: IcdTitleResult = {
    code,
    version,
    title: title ?? '',
    language,
    source,
  }

  if (result.title) {
    setCachedIcdTitle(cacheKey, result)
  }

  return result
}

export async function resolveIcdDisplayTitles(
  items: IcdTitleLookupItem[],
  languageRaw?: string,
): Promise<IcdTitleResult[]> {
  const language = normalizeLanguage(languageRaw)
  const unique = new Map<string, IcdTitleLookupItem>()

  for (const item of items) {
    const version = item.version
    const code = normalizeCode(item.code, version)
    if (!code) continue
    unique.set(`${version}:${code}`, { code, version })
  }

  return Promise.all(
    [...unique.values()].map((item) => resolveIcdDisplayTitle({ ...item, language })),
  )
}

export { normalizeLanguage, normalizeVersion }
