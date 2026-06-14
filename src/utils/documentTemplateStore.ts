import { safeSetItem } from './safeStorage'
import type { DocumentTemplate, TemplateAvailability, TemplateCategory, TemplateField, TemplateStatus } from '../types/documentTemplate'
import { DEFAULT_PAGE_SETTINGS, migrateTemplate } from './documentTemplate/pageSettings'

const STORAGE_KEY = 'psychiatry-ink:documentTemplates'

export const TEMPLATES_CHANGED_EVENT = 'psychiatry-ink:document-templates:changed'

function loadRaw(): DocumentTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DocumentTemplate[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((t) => migrateTemplate(t as DocumentTemplate))
  } catch {
    return []
  }
}

function persist(templates: DocumentTemplate[]): void {
  safeSetItem(STORAGE_KEY, JSON.stringify(templates))
  try {
    window.dispatchEvent(new CustomEvent(TEMPLATES_CHANGED_EVENT))
  } catch {
    // ignore
  }
}

export function loadDocumentTemplates(): DocumentTemplate[] {
  return loadRaw().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getDocumentTemplate(id: string): DocumentTemplate | null {
  return loadRaw().find((t) => t.id === id) ?? null
}

export function countGeneratedDocsUsingTemplate(_templateId: string): number {
  // Checked asynchronously via generatedDocumentsVault; sync stub returns 0
  return 0
}

export interface CreateTemplateInput {
  title: string
  description?: string
  category: TemplateCategory
  language?: 'de' | 'en'
  availability?: Partial<TemplateAvailability>
  fields?: TemplateField[]
}

const DEFAULT_AVAILABILITY: TemplateAvailability = {
  emptyWorkspace: true,
  patientWorkspace: true,
  patientDocuments: true,
}

export function createDocumentTemplate(input: CreateTemplateInput): DocumentTemplate {
  const now = new Date().toISOString()
  const template: DocumentTemplate = {
    id: crypto.randomUUID(),
    title: input.title.trim() || 'Neue Vorlage',
    description: input.description?.trim(),
    category: input.category,
    language: input.language ?? 'de',
    version: 1,
    status: 'draft',
    availability: { ...DEFAULT_AVAILABILITY, ...input.availability },
    fields: input.fields ?? [],
    pageSettings: { ...DEFAULT_PAGE_SETTINGS },
    createdAt: now,
    updatedAt: now,
  }
  persist([template, ...loadRaw()])
  return template
}

export function updateDocumentTemplate(
  id: string,
  patch: Partial<Omit<DocumentTemplate, 'id' | 'createdAt'>>,
): DocumentTemplate | null {
  const existing = loadRaw()
  const idx = existing.findIndex((t) => t.id === id)
  if (idx < 0) return null
  const updated: DocumentTemplate = {
    ...existing[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  const next = [...existing]
  next[idx] = updated
  persist(next)
  return updated
}

export function duplicateDocumentTemplate(id: string): DocumentTemplate | null {
  const source = getDocumentTemplate(id)
  if (!source) return null
  const now = new Date().toISOString()
  const copy: DocumentTemplate = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} (Kopie)`,
    status: 'draft',
    version: 1,
    fields: source.fields.map((f) => ({ ...f, id: crypto.randomUUID() })),
    createdAt: now,
    updatedAt: now,
  }
  persist([copy, ...loadRaw()])
  return copy
}

export function setTemplateStatus(id: string, status: TemplateStatus): DocumentTemplate | null {
  return updateDocumentTemplate(id, { status })
}

export function deleteDocumentTemplate(id: string): boolean {
  const existing = loadRaw()
  const next = existing.filter((t) => t.id !== id)
  if (next.length === existing.length) return false
  persist(next)
  return true
}

export function searchTemplates(
  templates: DocumentTemplate[],
  query: string,
  category?: TemplateCategory | 'all',
): DocumentTemplate[] {
  const q = query.trim().toLowerCase()
  return templates.filter((t) => {
    if (category && category !== 'all' && t.category !== category) return false
    if (t.status === 'archived' && !q) return false
    if (!q) return t.status !== 'archived'
    const haystack = [t.title, t.description ?? '', t.category].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

export function filterTemplatesByAvailability(
  templates: DocumentTemplate[],
  context: keyof TemplateAvailability,
): DocumentTemplate[] {
  return templates.filter(
    (t) => t.status === 'active' && t.availability[context],
  )
}
