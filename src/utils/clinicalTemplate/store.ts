import { safeSetItem } from '../safeStorage'
import {
  CLINICAL_TEMPLATE_SCHEMA_VERSION,
  type ClinicalTemplate,
  type ClinicalTemplateCategory,
  type ClinicalTemplateScope,
  type ClinicalTemplateStatus,
  type TemplateBlock,
} from '../../types/clinicalTemplate'
import { parseClinicalTemplate } from './schema'

const STORAGE_KEY = 'psychiatry-ink:clinicalTemplates'
export const CLINICAL_TEMPLATES_CHANGED_EVENT = 'psychiatry-ink:clinical-templates:changed'

function loadRaw(): ClinicalTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((entry) => parseClinicalTemplate(entry))
      .filter((entry): entry is ClinicalTemplate => entry !== null)
  } catch {
    return []
  }
}

function persist(templates: ClinicalTemplate[]): void {
  safeSetItem(STORAGE_KEY, JSON.stringify(templates))
  try {
    window.dispatchEvent(new CustomEvent(CLINICAL_TEMPLATES_CHANGED_EVENT))
  } catch {
    /* non-browser environment */
  }
}

export function loadClinicalTemplates(): ClinicalTemplate[] {
  return loadRaw().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getClinicalTemplate(id: string): ClinicalTemplate | null {
  return loadRaw().find((t) => t.id === id) ?? null
}

export interface CreateClinicalTemplateInput {
  title: string
  description?: string
  category: ClinicalTemplateCategory
  language?: 'de' | 'en'
  scope?: ClinicalTemplateScope
  blocks?: TemplateBlock[]
  createdBy?: string
}

export function createClinicalTemplate(input: CreateClinicalTemplateInput): ClinicalTemplate {
  const now = new Date().toISOString()
  const template: ClinicalTemplate = {
    schemaVersion: CLINICAL_TEMPLATE_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    title: input.title.trim() || 'Neue Vorlage',
    description: input.description?.trim() || undefined,
    category: input.category,
    language: input.language ?? 'de',
    status: 'draft',
    scope: input.scope ?? 'personal',
    version: 1,
    blocks: input.blocks ?? [],
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  }
  persist([template, ...loadRaw()])
  return template
}

export function updateClinicalTemplate(
  id: string,
  patch: Partial<Omit<ClinicalTemplate, 'id' | 'createdAt' | 'schemaVersion'>>,
): ClinicalTemplate | null {
  const existing = loadRaw()
  const idx = existing.findIndex((t) => t.id === id)
  if (idx < 0) return null
  const updated: ClinicalTemplate = {
    ...existing[idx]!,
    ...patch,
    schemaVersion: CLINICAL_TEMPLATE_SCHEMA_VERSION,
    id,
    createdAt: existing[idx]!.createdAt,
    updatedAt: new Date().toISOString(),
  }
  const next = [...existing]
  next[idx] = updated
  persist(next)
  return updated
}

/**
 * Activate a template. Activating an already-active template snapshots the
 * current blocks into history and bumps the version number.
 */
export function activateClinicalTemplate(id: string): ClinicalTemplate | null {
  const existing = getClinicalTemplate(id)
  if (!existing) return null
  if (existing.status === 'active') {
    const history = [
      { version: existing.version, blocks: existing.blocks, savedAt: new Date().toISOString() },
      ...(existing.history ?? []),
    ].slice(0, 20)
    return updateClinicalTemplate(id, { version: existing.version + 1, history })
  }
  return updateClinicalTemplate(id, { status: 'active' })
}

export function setClinicalTemplateStatus(
  id: string,
  status: ClinicalTemplateStatus,
): ClinicalTemplate | null {
  return updateClinicalTemplate(id, { status })
}

export function duplicateClinicalTemplate(id: string): ClinicalTemplate | null {
  const source = getClinicalTemplate(id)
  if (!source) return null
  const now = new Date().toISOString()
  const copy: ClinicalTemplate = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} (Kopie)`,
    status: 'draft',
    version: 1,
    history: undefined,
    blocks: cloneBlocks(source.blocks),
    createdAt: now,
    updatedAt: now,
  }
  persist([copy, ...loadRaw()])
  return copy
}

export function deleteClinicalTemplate(id: string): boolean {
  const existing = loadRaw()
  const next = existing.filter((t) => t.id !== id)
  if (next.length === existing.length) return false
  persist(next)
  return true
}

/** Re-key all block ids (used on duplicate so block ids stay unique). */
export function cloneBlocks(blocks: TemplateBlock[]): TemplateBlock[] {
  return blocks.map((block) => {
    const next = { ...block, id: crypto.randomUUID() }
    if (next.type === 'conditional') {
      next.children = cloneBlocks(next.children)
    }
    return next
  })
}

export function searchClinicalTemplates(
  templates: ClinicalTemplate[],
  query: string,
  category: ClinicalTemplateCategory | 'all',
): ClinicalTemplate[] {
  const q = query.trim().toLowerCase()
  return templates.filter((t) => {
    if (category !== 'all' && t.category !== category) return false
    if (t.status === 'archived' && !q && category === 'all') return false
    if (!q) return true
    return [t.title, t.description ?? '', t.category].join(' ').toLowerCase().includes(q)
  })
}
