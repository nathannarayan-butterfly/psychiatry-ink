import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

interface DiagnoseEntry {
  id: string
  icdCode: string
  description: string
  createdAt: string
}

function storageKey(caseId: string): string {
  return `diagnosen:${caseId}`
}

function loadEntries(caseId: string): DiagnoseEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as DiagnoseEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveEntries(caseId: string, entries: DiagnoseEntry[]): void {
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(entries))
  } catch {
    // ignore quota errors
  }
}

function newEntry(): DiagnoseEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    icdCode: '',
    description: '',
    createdAt: new Date().toISOString(),
  }
}

interface DiagnoseRowProps {
  index: number
  entry: DiagnoseEntry
  onUpdate: (id: string, patch: Partial<DiagnoseEntry>) => void
  onDelete: (id: string) => void
  icdRef?: React.RefCallback<HTMLInputElement>
}

function DiagnoseRow({ index, entry, onUpdate, onDelete, icdRef }: DiagnoseRowProps) {
  const { t } = useTranslation()

  return (
    <li className="diagnosen-widget__row">
      <span className="diagnosen-widget__index" aria-hidden>{index}.</span>
      <input
        ref={icdRef}
        type="text"
        className="diagnosen-widget__icd-input"
        value={entry.icdCode}
        onChange={e => onUpdate(entry.id, { icdCode: e.target.value })}
        placeholder={t('diagnosenIcdCode')}
        aria-label={`${t('diagnosenIcdCode')} ${index}`}
        spellCheck={false}
      />
      <input
        type="text"
        className="diagnosen-widget__desc-input"
        value={entry.description}
        onChange={e => onUpdate(entry.id, { description: e.target.value })}
        placeholder={t('diagnosenDescription')}
        aria-label={`${t('diagnosenDescription')} ${index}`}
      />
      <button
        type="button"
        className="diagnosen-widget__delete-btn"
        onClick={() => onDelete(entry.id)}
        aria-label={t('diagnosenDeleteEntry')}
        title={t('diagnosenDeleteEntry')}
      >
        <X className="h-3 w-3" strokeWidth={2} aria-hidden />
      </button>
    </li>
  )
}

interface DiagnosenWidgetProps {
  caseId: string
}

export function DiagnosenWidget({ caseId }: DiagnosenWidgetProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<DiagnoseEntry[]>(() => loadEntries(caseId))
  const [collapsed, setCollapsed] = useState(false)
  const pendingNewRef = useRef<string | null>(null)
  const newIcdRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Reload when caseId changes
  useEffect(() => {
    setEntries(loadEntries(caseId))
  }, [caseId])

  // Persist on any change
  useEffect(() => {
    saveEntries(caseId, entries)
  }, [caseId, entries])

  // Focus new row's ICD input after adding
  useEffect(() => {
    if (pendingNewRef.current) {
      const id = pendingNewRef.current
      pendingNewRef.current = null
      const el = newIcdRefs.current[id]
      if (el) el.focus()
    }
  })

  const handleUpdate = useCallback((id: string, patch: Partial<DiagnoseEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleAdd = useCallback(() => {
    const entry = newEntry()
    pendingNewRef.current = entry.id
    setEntries(prev => [...prev, entry])
    if (collapsed) setCollapsed(false)
  }, [collapsed])

  return (
    <section className="diagnosen-widget">
      <div className="diagnosen-widget__header">
        <button
          type="button"
          className="diagnosen-widget__title-btn"
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
        >
          <span className="diagnosen-widget__title">{t('diagnosenTitle')}</span>
          <span className="diagnosen-widget__collapse-icon" aria-hidden>
            {collapsed ? '›' : '‹'}
          </span>
        </button>
        <button
          type="button"
          className="diagnosen-widget__add-btn"
          onClick={handleAdd}
          aria-label={t('diagnosenAddEntry')}
          title={t('diagnosenAddEntry')}
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      {!collapsed ? (
        <div className="diagnosen-widget__body">
          {entries.length === 0 ? (
            <p className="diagnosen-widget__empty">{t('diagnosenEmpty')}</p>
          ) : (
            <ol className="diagnosen-widget__list" aria-label={t('diagnosenTitle')}>
              {entries.map((entry, index) => (
                <DiagnoseRow
                  key={entry.id}
                  index={index + 1}
                  entry={entry}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  icdRef={el => { newIcdRefs.current[entry.id] = el }}
                />
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  )
}
