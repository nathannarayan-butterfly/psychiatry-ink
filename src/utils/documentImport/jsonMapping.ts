/**
 * Deterministic mapping of arbitrary clinical JSON/JSONL into candidates.
 *
 * Supported shapes (all optional, mixed freely):
 *   - A top-level object with collection keys: `anamnese`, `diagnoses`/`diagnosen`,
 *     `medications`/`medikation`, `labs`/`labor`, `verlauf`, `therapy`/`therapie`,
 *     `investigations`/`befunde`, `risk`/`risiko`, `documents`.
 *   - An array of records, each either tagged (`module`/`type`) or inferred by fields.
 *   - A single record (object) inferred by its fields.
 *
 * Unknown records degrade to a `document` candidate so nothing is silently dropped.
 */
import type {
  CandidateModule,
  ClinicalImportCandidate,
  ImportSourceLocation,
} from '../../schemas/documentImport/envelope'
import { makeCandidate } from './candidateFactory'

type Json = unknown
type JsonObject = Record<string, unknown>

function isObject(v: Json): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return undefined
}

function firstString(obj: JsonObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const found = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase())
    if (found) {
      const s = str(obj[found])
      if (s) return s
    }
  }
  return undefined
}

const MODULE_ALIASES: Record<string, CandidateModule> = {
  anamnese: 'anamnese',
  history: 'anamnese',
  verlauf: 'verlauf',
  course: 'verlauf',
  progress: 'verlauf',
  diagnosis: 'diagnosis',
  diagnose: 'diagnosis',
  diagnoses: 'diagnosis',
  diagnosen: 'diagnosis',
  medication: 'medication',
  medikation: 'medication',
  medications: 'medication',
  medikamente: 'medication',
  drug: 'medication',
  lab: 'lab',
  labor: 'lab',
  labs: 'lab',
  laboratory: 'lab',
  investigation: 'investigation',
  investigations: 'investigation',
  befund: 'investigation',
  befunde: 'investigation',
  therapy: 'therapy',
  therapie: 'therapy',
  risk: 'risk',
  risiko: 'risk',
  document: 'document',
  documents: 'document',
  dokument: 'document',
}

function resolveTaggedModule(obj: JsonObject): CandidateModule | null {
  const tag = firstString(obj, ['module', 'type', 'kind', 'category'])
  if (!tag) return null
  return MODULE_ALIASES[tag.toLowerCase()] ?? null
}

function inferModule(obj: JsonObject): CandidateModule | null {
  const keys = Object.keys(obj).map((k) => k.toLowerCase())
  const has = (k: string) => keys.includes(k)
  if (has('icd10') || has('icd10code') || has('icd') || (has('code') && has('label') && !has('substance'))) {
    return 'diagnosis'
  }
  if (has('substance') || has('drug') || has('medication') || has('wirkstoff') || has('dose') || has('dosage')) {
    return 'medication'
  }
  if (has('values') || has('labvalues') || (has('value') && (has('unit') || has('parameter')))) return 'lab'
  if (has('sectionid') || has('section')) return 'anamnese'
  if (has('text') && has('date')) return 'verlauf'
  return null
}

function mapDiagnosis(obj: JsonObject, loc: ImportSourceLocation, raw: string): ClinicalImportCandidate | null {
  const label = firstString(obj, ['label', 'name', 'title', 'text', 'bezeichnung', 'diagnosis'])
  const icd10Code = firstString(obj, ['icd10', 'icd10Code', 'icd', 'code'])
  if (!label && !icd10Code) return null
  return makeCandidate({
    module: 'diagnosis',
    confidence: icd10Code ? 'high' : 'medium',
    sourceLocation: loc,
    rawText: raw,
    data: {
      label: label ?? icd10Code ?? '',
      icd10Code,
      icd11Code: firstString(obj, ['icd11', 'icd11Code']),
      dsmCode: firstString(obj, ['dsm', 'dsmCode']),
    },
  })
}

function mapMedication(obj: JsonObject, loc: ImportSourceLocation, raw: string): ClinicalImportCandidate | null {
  const substance = firstString(obj, ['substance', 'wirkstoff', 'drug', 'medication', 'name', 'praeparat'])
  if (!substance) return null
  return makeCandidate({
    module: 'medication',
    confidence: 'high',
    sourceLocation: loc,
    rawText: raw,
    data: {
      substance,
      strength: firstString(obj, ['strength', 'staerke', 'dose', 'dosis']),
      doseText: firstString(obj, ['doseText', 'schedule', 'einnahme', 'dosage', 'doseLine']),
      formulation: firstString(obj, ['formulation', 'form', 'darreichungsform']),
      indication: firstString(obj, ['indication', 'indikation']),
      status: firstString(obj, ['status']),
      startDate: firstString(obj, ['startDate', 'start', 'beginn']),
    },
  })
}

function mapLab(obj: JsonObject, loc: ImportSourceLocation, raw: string): ClinicalImportCandidate | null {
  const rawValues = obj['values'] ?? obj['labValues'] ?? obj['werte']
  const values: { name: string; value: string; unit?: string; refText?: string }[] = []
  if (Array.isArray(rawValues)) {
    for (const v of rawValues) {
      if (!isObject(v)) continue
      const name = firstString(v, ['name', 'parameter', 'analyte', 'bezeichnung'])
      const value = firstString(v, ['value', 'wert', 'result'])
      if (name && value) {
        values.push({
          name,
          value,
          unit: firstString(v, ['unit', 'einheit']),
          refText: firstString(v, ['refText', 'reference', 'referenz', 'normwert']),
        })
      }
    }
  } else {
    const name = firstString(obj, ['name', 'parameter', 'analyte'])
    const value = firstString(obj, ['value', 'wert', 'result'])
    if (name && value) {
      values.push({ name, value, unit: firstString(obj, ['unit', 'einheit']), refText: firstString(obj, ['refText', 'reference', 'referenz']) })
    }
  }
  if (values.length === 0) return null
  return makeCandidate({
    module: 'lab',
    confidence: 'high',
    sourceLocation: loc,
    rawText: raw,
    data: { date: firstString(obj, ['date', 'datum']), panelLabel: firstString(obj, ['panel', 'panelLabel', 'kategorie', 'label']), values },
  })
}

function mapText(
  module: 'anamnese' | 'verlauf' | 'investigation' | 'therapy' | 'risk' | 'document',
  obj: JsonObject,
  loc: ImportSourceLocation,
  raw: string,
): ClinicalImportCandidate | null {
  const text = firstString(obj, ['text', 'content', 'body', 'inhalt', 'notiz', 'note'])
  if (!text) return null
  const title = firstString(obj, ['title', 'heading', 'label', 'titel']) ?? defaultTitle(module)
  switch (module) {
    case 'anamnese':
      return makeCandidate({ module, sourceLocation: loc, rawText: raw, data: { sectionId: firstString(obj, ['sectionId', 'section']), title, text } })
    case 'verlauf':
      return makeCandidate({ module, sourceLocation: loc, rawText: raw, data: { date: firstString(obj, ['date', 'datum']), sectionLabel: firstString(obj, ['sectionLabel', 'section']), text } })
    case 'risk':
      return makeCandidate({ module, sourceLocation: loc, rawText: raw, data: { text, category: firstString(obj, ['category', 'kategorie']) } })
    case 'investigation':
      return makeCandidate({ module, sourceLocation: loc, rawText: raw, data: { title, text, examType: firstString(obj, ['examType', 'type']) } })
    case 'therapy':
      return makeCandidate({ module, sourceLocation: loc, rawText: raw, data: { title, text, date: firstString(obj, ['date', 'datum']) } })
    case 'document':
    default:
      return makeCandidate({ module: 'document', sourceLocation: loc, rawText: raw, data: { title, text } })
  }
}

function defaultTitle(module: CandidateModule): string {
  const titles: Record<CandidateModule, string> = {
    anamnese: 'Anamnese',
    verlauf: 'Verlauf',
    diagnosis: 'Diagnose',
    medication: 'Medikation',
    lab: 'Labor',
    investigation: 'Befund',
    therapy: 'Therapie',
    risk: 'Risiko',
    document: 'Dokument',
  }
  return titles[module]
}

function mapRecord(value: Json, module: CandidateModule | null, loc: ImportSourceLocation): ClinicalImportCandidate[] {
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    const m = module ?? 'document'
    if (m === 'diagnosis') return compact([mapDiagnosis({ label: text }, loc, raw)])
    if (m === 'medication') return compact([mapMedication({ substance: text }, loc, raw)])
    return compact([mapText(asTextModule(m), { text }, loc, raw)])
  }
  if (!isObject(value)) return []

  const resolved = module ?? resolveTaggedModule(value) ?? inferModule(value)
  switch (resolved) {
    case 'diagnosis':
      return compact([mapDiagnosis(value, loc, raw)])
    case 'medication':
      return compact([mapMedication(value, loc, raw)])
    case 'lab':
      return compact([mapLab(value, loc, raw)])
    case 'anamnese':
    case 'verlauf':
    case 'investigation':
    case 'therapy':
    case 'risk':
      return compact([mapText(resolved, value, loc, raw)])
    case 'document':
      return compact([mapText('document', value, loc, raw)])
    default:
      // Unknown object — surface the JSON so the clinician can still file it.
      return compact([
        mapText('document', { text: JSON.stringify(value, null, 2), title: 'Importierter Datensatz' }, loc, raw),
      ])
  }
}

function asTextModule(m: CandidateModule): 'anamnese' | 'verlauf' | 'investigation' | 'therapy' | 'risk' | 'document' {
  if (m === 'anamnese' || m === 'verlauf' || m === 'investigation' || m === 'therapy' || m === 'risk') return m
  return 'document'
}

function compact(items: (ClinicalImportCandidate | null)[]): ClinicalImportCandidate[] {
  return items.filter((c): c is ClinicalImportCandidate => c !== null)
}

const COLLECTION_KEY_MODULE: Record<string, CandidateModule> = MODULE_ALIASES

/** Entry point: map a parsed JSON value (object/array/scalar) into candidates. */
export function mapJsonValueToCandidates(value: Json, basePath = ''): ClinicalImportCandidate[] {
  // Array → map each element.
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      mapRecord(item, null, { path: `${basePath || 'item'}[${index}]` }),
    )
  }

  if (!isObject(value)) {
    return mapRecord(value, null, { path: basePath || 'value' })
  }

  // Object with recognised collection keys → expand each collection.
  const collected: ClinicalImportCandidate[] = []
  let matchedCollection = false
  for (const key of Object.keys(value)) {
    const module = COLLECTION_KEY_MODULE[key.toLowerCase()]
    if (!module) continue
    matchedCollection = true
    const child = value[key]
    if (Array.isArray(child)) {
      child.forEach((item, index) => {
        collected.push(...mapRecord(item, module, { path: `${key}[${index}]` }))
      })
    } else if (isObject(child) || typeof child === 'string') {
      collected.push(...mapRecord(child, module, { path: key }))
    }
  }

  if (matchedCollection) return collected

  // Plain object without collection keys → treat as a single record.
  return mapRecord(value, null, { path: basePath || 'record' })
}
