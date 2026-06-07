import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  addBefund,
  deleteBefund,
  loadBefunde,
  loadPinnedWidgets,
  saveBefunde,
  savePinnedWidgets,
  type LaborBefund,
  type LaborCategory,
  type LaborValue,
  type PinnedLaborWidget,
} from '../../utils/laborArchive'
import { parseLabText } from '../../utils/laborParser'
import { showNotionToast } from './NotionToast'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  } catch {
    return iso.slice(0, 10)
  }
}

function shortDate(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}`
  } catch {
    return iso.slice(5, 10)
  }
}

// ---------------------------------------------------------------------------
// Trend calculation
// ---------------------------------------------------------------------------

type TrendDir = 'up' | 'down' | 'stable' | 'none'

function getTrend(
  current: LaborValue,
  previousBefund: LaborBefund | null,
): { dir: TrendDir; prevValue?: number } {
  if (!previousBefund) return { dir: 'none' }
  const prev = previousBefund.categories
    .flatMap((c) => c.values)
    .find((v) => v.name.toLowerCase() === current.name.toLowerCase())
  if (!prev || prev.numericValue === undefined || current.numericValue === undefined) {
    return { dir: 'none' }
  }
  if (current.numericValue > prev.numericValue) return { dir: 'up', prevValue: prev.numericValue }
  if (current.numericValue < prev.numericValue) return { dir: 'down', prevValue: prev.numericValue }
  return { dir: 'stable', prevValue: prev.numericValue }
}

// ---------------------------------------------------------------------------
// Graph colours (cycle)
// ---------------------------------------------------------------------------

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6b7280',
]

// ---------------------------------------------------------------------------
// Add-Befund Dialog
// ---------------------------------------------------------------------------

interface AddBefundDialogProps {
  onSave: (date: string, rawText: string, categories: LaborCategory[], label?: string) => void
  onClose: () => void
}

function AddBefundDialog({ onSave, onClose }: AddBefundDialogProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [rawText, setRawText] = useState('')
  const [label, setLabel] = useState('')
  const [parsed, setParsed] = useState<LaborCategory[] | null>(null)
  const [showAiFallback, setShowAiFallback] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const totalParams = parsed?.reduce((sum, c) => sum + c.values.length, 0) ?? 0

  const handleAnalyze = useCallback(() => {
    if (!rawText.trim()) return
    const cats = parseLabText(rawText)
    setParsed(cats)
    const total = cats.reduce((sum, c) => sum + c.values.length, 0)
    setShowAiFallback(total < 3)
  }, [rawText])

  const handleSave = useCallback(() => {
    if (!parsed || parsed.length === 0) return
    onSave(date, rawText, parsed, label.trim() || undefined)
  }, [date, label, onSave, parsed, rawText])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className="labor-dialog-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="labor-dialog" role="dialog" aria-modal="true" aria-label="Laborbefund hinzufügen">
        <div className="labor-dialog__header">
          <h2 className="labor-dialog__title">Laborbefund hinzufügen</h2>
          <button type="button" className="labor-dialog__close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>

        <div className="labor-dialog__body">
          <div className="labor-dialog__row">
            <label className="labor-dialog__label">
              Datum
              <input
                type="date"
                className="labor-dialog__input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="labor-dialog__label">
              Bezeichnung (optional)
              <input
                type="text"
                className="labor-dialog__input"
                placeholder="z. B. Aufnahmelabor"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
              />
            </label>
          </div>

          <label className="labor-dialog__label labor-dialog__label--full">
            Laborbefund einfügen
            <textarea
              className="labor-dialog__textarea"
              placeholder="Laborbefund hier einfügen..."
              value={rawText}
              onChange={(e) => { setRawText(e.target.value); setParsed(null); setShowAiFallback(false) }}
              rows={10}
            />
          </label>

          <div className="labor-dialog__actions-row">
            <button
              type="button"
              className="labor-dialog__btn labor-dialog__btn--primary"
              onClick={handleAnalyze}
              disabled={!rawText.trim()}
            >
              Analysieren
            </button>
            {showAiFallback && (
              <button
                type="button"
                className="labor-dialog__btn labor-dialog__btn--ai"
                onClick={() => showNotionToast('KI-Analyse kommt bald')}
              >
                Nicht erkannt? Mit KI analysieren
              </button>
            )}
          </div>

          {parsed !== null && (
            <div className="labor-dialog__preview">
              <p className="labor-dialog__preview-title">
                {totalParams > 0
                  ? `${totalParams} Parameter erkannt in ${parsed.length} Kategorien`
                  : 'Keine Parameter erkannt'}
              </p>
              {parsed.map((cat) => (
                <div key={cat.id} className="labor-dialog__preview-cat">
                  <strong className="labor-dialog__preview-cat-label">{cat.label}</strong>
                  <span className="labor-dialog__preview-cat-count">
                    {' '}({cat.values.length}):{' '}
                  </span>
                  <span className="labor-dialog__preview-params">
                    {cat.values.map((v) => v.name).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="labor-dialog__footer">
          <button type="button" className="labor-dialog__btn labor-dialog__btn--cancel" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="labor-dialog__btn labor-dialog__btn--save"
            onClick={handleSave}
            disabled={!parsed || totalParams === 0}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Graph Modal
// ---------------------------------------------------------------------------

interface GraphModalProps {
  category: LaborCategory
  befunde: LaborBefund[]
  onClose: () => void
}

function GraphModal({ category, befunde, onClose }: GraphModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Build chart data: x=date, series per parameter
  const sortedBefunde = [...befunde].sort((a, b) => a.date.localeCompare(b.date))

  const paramNames = useMemo(() => {
    const names = new Set<string>()
    for (const b of sortedBefunde) {
      for (const c of b.categories) {
        if (c.id === category.id || c.label === category.label) {
          for (const v of c.values) names.add(v.name)
        }
      }
    }
    return Array.from(names)
  }, [sortedBefunde, category])

  const chartData = sortedBefunde.map((b) => {
    const catMatch = b.categories.find((c) => c.id === category.id || c.label === category.label)
    const row: Record<string, string | number> = { date: shortDate(b.date) }
    for (const name of paramNames) {
      const v = catMatch?.values.find((val) => val.name === name)
      if (v?.numericValue !== undefined) {
        row[name] = v.numericValue
      }
    }
    return row
  })

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className="labor-graph-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="labor-graph-modal" role="dialog" aria-modal="true">
        <div className="labor-graph-modal__header">
          <h3 className="labor-graph-modal__title">{category.label} — Verlauf</h3>
          <button type="button" className="labor-graph-modal__close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="labor-graph-modal__body">
          {chartData.length < 2 ? (
            <p className="labor-graph-modal__hint">Mindestens 2 Befunde für Verlaufsgrafik erforderlich.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Legend />
                {paramNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Category section (accordion)
// ---------------------------------------------------------------------------

interface CategorySectionProps {
  category: LaborCategory
  previousBefund: LaborBefund | null
  caseId: string
  onPinWidget: (paramName: string, catLabel: string) => void
  onShowGraph: (cat: LaborCategory) => void
}

function CategorySection({
  category,
  previousBefund,
  caseId,
  onPinWidget,
  onShowGraph,
}: CategorySectionProps) {
  const [open, setOpen] = useState(true)
  const pinnedWidgets = loadPinnedWidgets(caseId)
  const isPinned = (paramName: string) =>
    pinnedWidgets.some((w) => w.parameterName === paramName && w.categoryLabel === category.label)

  return (
    <section className="labor-category">
      <button
        type="button"
        className="labor-category__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="labor-category__chevron">{open ? '▾' : '▸'}</span>
        <span className="labor-category__label">{category.label}</span>
        <span className="labor-category__count">({category.values.length})</span>
        {open && (
          <button
            type="button"
            className="labor-category__graph-btn"
            onClick={(e) => { e.stopPropagation(); onShowGraph(category) }}
            title="Grafik anzeigen"
          >
            📈 Grafik
          </button>
        )}
      </button>

      {open && (
        <div className="labor-category__body">
          <table className="labor-table">
            <thead>
              <tr className="labor-table__head-row">
                <th className="labor-table__th">Parameter</th>
                <th className="labor-table__th labor-table__th--num">Wert</th>
                <th className="labor-table__th">Einheit</th>
                <th className="labor-table__th">Referenz</th>
                <th className="labor-table__th labor-table__th--trend">Trend</th>
                <th className="labor-table__th labor-table__th--pin" aria-label="Pin" />
              </tr>
            </thead>
            <tbody>
              {category.values.map((val) => {
                const { dir, prevValue } = getTrend(val, previousBefund)
                const pinned = isPinned(val.name)
                return (
                  <tr
                    key={val.name}
                    className={[
                      'labor-table__row',
                      val.isAbnormal ? 'labor-table__row--abnormal' : '',
                    ].join(' ').trim()}
                  >
                    <td className="labor-table__td labor-table__td--name">{val.name}</td>
                    <td className={['labor-table__td labor-table__td--num', val.isAbnormal ? 'labor-table__td--abnormal-val' : ''].join(' ').trim()}>
                      {val.value}
                    </td>
                    <td className="labor-table__td labor-table__td--unit">{val.unit}</td>
                    <td className="labor-table__td labor-table__td--ref">{val.refText ?? '–'}</td>
                    <td className="labor-table__td labor-table__td--trend">
                      {dir === 'none' ? (
                        <span className="labor-trend labor-trend--none">–</span>
                      ) : dir === 'up' ? (
                        <span className={['labor-trend labor-trend--up', val.isAbnormal ? 'labor-trend--abnormal' : ''].join(' ').trim()} title={`Vorher: ${prevValue}`}>
                          ↑
                          {prevValue !== undefined && <small className="labor-trend__prev"> {prevValue}</small>}
                        </span>
                      ) : dir === 'down' ? (
                        <span className={['labor-trend labor-trend--down', val.isAbnormal ? 'labor-trend--abnormal' : ''].join(' ').trim()} title={`Vorher: ${prevValue}`}>
                          ↓
                          {prevValue !== undefined && <small className="labor-trend__prev"> {prevValue}</small>}
                        </span>
                      ) : (
                        <span className="labor-trend labor-trend--stable" title={`Vorher: ${prevValue}`}>
                          →
                          {prevValue !== undefined && <small className="labor-trend__prev"> {prevValue}</small>}
                        </span>
                      )}
                    </td>
                    <td className="labor-table__td labor-table__td--pin">
                      <button
                        type="button"
                        className={['labor-pin-btn', pinned ? 'labor-pin-btn--active' : ''].join(' ').trim()}
                        onClick={() => onPinWidget(val.name, category.label)}
                        title={pinned ? 'Widget entfernen' : 'Als Dashboard-Widget anheften'}
                        aria-pressed={pinned}
                      >
                        📌
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main LaborPage
// ---------------------------------------------------------------------------

interface LaborPageProps {
  caseId: string
}

export function LaborPage({ caseId }: LaborPageProps) {
  const [befunde, setBefunde] = useState<LaborBefund[]>(() =>
    [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date)),
  )
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const sorted = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0]?.id ?? null
  })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [graphCategory, setGraphCategory] = useState<LaborCategory | null>(null)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)

  // Reload when caseId changes
  useEffect(() => {
    const loaded = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))
    setBefunde(loaded)
    setSelectedId(loaded[0]?.id ?? null)
  }, [caseId])

  const selectedBefund = useMemo(
    () => befunde.find((b) => b.id === selectedId) ?? null,
    [befunde, selectedId],
  )

  // Find previous befund (chronologically before selected)
  const previousBefund = useMemo(() => {
    if (!selectedBefund) return null
    const sorted = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
    const idx = sorted.findIndex((b) => b.id === selectedBefund.id)
    return idx > 0 ? sorted[idx - 1] : null
  }, [befunde, selectedBefund])

  const handleSaveBefund = useCallback(
    (date: string, rawText: string, categories: LaborCategory[], label?: string) => {
      const befund: LaborBefund = {
        id: crypto.randomUUID(),
        caseId,
        date,
        rawText,
        categories,
        createdAt: new Date().toISOString(),
        label,
      }
      addBefund(caseId, befund)
      const next = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))
      setBefunde(next)
      setSelectedId(befund.id)
      setShowAddDialog(false)
      showNotionToast('Laborbefund gespeichert')
    },
    [caseId],
  )

  const handleDelete = useCallback(() => {
    if (!selectedId) return
    if (!window.confirm('Laborbefund löschen?')) return
    deleteBefund(caseId, selectedId)
    const next = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))
    setBefunde(next)
    setSelectedId(next[0]?.id ?? null)
  }, [caseId, selectedId])

  const handleEditLabel = useCallback(() => {
    if (!selectedBefund) return
    setLabelDraft(selectedBefund.label ?? '')
    setEditingLabel(true)
    setTimeout(() => labelInputRef.current?.focus(), 50)
  }, [selectedBefund])

  const handleSaveLabel = useCallback(() => {
    if (!selectedBefund) return
    const updated = befunde.map((b) =>
      b.id === selectedBefund.id ? { ...b, label: labelDraft.trim() || undefined } : b,
    )
    saveBefunde(caseId, updated)
    setBefunde(updated)
    setEditingLabel(false)
  }, [befunde, caseId, labelDraft, selectedBefund])

  const handlePinWidget = useCallback(
    (paramName: string, catLabel: string) => {
      const current = loadPinnedWidgets(caseId)
      const existing = current.find(
        (w) => w.parameterName === paramName && w.categoryLabel === catLabel,
      )
      if (existing) {
        savePinnedWidgets(
          caseId,
          current.filter((w) => w.id !== existing.id),
        )
        showNotionToast('Widget entfernt')
      } else {
        const widget: PinnedLaborWidget = {
          id: crypto.randomUUID(),
          caseId,
          parameterName: paramName,
          categoryLabel: catLabel,
          pinnedAt: new Date().toISOString(),
        }
        savePinnedWidgets(caseId, [...current, widget])
        showNotionToast('Als Dashboard-Widget angeheftet')
      }
      // Force re-render to reflect pin state
      setBefunde((prev) => [...prev])
    },
    [caseId],
  )

  return (
    <div className="labor-page">
      {/* Sidebar */}
      <aside className="labor-page__sidebar">
        <button
          type="button"
          className="labor-page__add-btn"
          onClick={() => setShowAddDialog(true)}
        >
          + Laborbefund
        </button>

        {befunde.length === 0 ? (
          <p className="labor-page__sidebar-empty">Kein Laborbefund vorhanden</p>
        ) : (
          <ul className="labor-page__befund-list" role="listbox" aria-label="Laborbefunde">
            {befunde.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={b.id === selectedId}
                  className={[
                    'labor-page__befund-item',
                    b.id === selectedId ? 'labor-page__befund-item--active' : '',
                  ].join(' ').trim()}
                  onClick={() => setSelectedId(b.id)}
                >
                  <span className="labor-page__befund-date">{formatDate(b.date)}</span>
                  {b.label && (
                    <span className="labor-page__befund-label">{b.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main area */}
      <div className="labor-page__main">
        {!selectedBefund ? (
          <div className="labor-page__empty">
            <p className="labor-page__empty-text">
              Laborbefund einfügen oder auswählen
            </p>
          </div>
        ) : (
          <div className="labor-page__content">
            {/* Befund header */}
            <header className="labor-befund-header">
              <div className="labor-befund-header__left">
                <h2 className="labor-befund-header__date">{formatDate(selectedBefund.date)}</h2>
                {editingLabel ? (
                  <div className="labor-befund-header__label-edit">
                    <input
                      ref={labelInputRef}
                      className="labor-befund-header__label-input"
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLabel()
                        if (e.key === 'Escape') setEditingLabel(false)
                      }}
                      maxLength={80}
                      placeholder="Bezeichnung"
                    />
                    <button type="button" className="labor-befund-header__label-save" onClick={handleSaveLabel}>
                      ✓
                    </button>
                    <button type="button" className="labor-befund-header__label-cancel" onClick={() => setEditingLabel(false)}>
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="labor-befund-header__label"
                    onClick={handleEditLabel}
                    title="Bezeichnung bearbeiten"
                  >
                    {selectedBefund.label ?? '+ Bezeichnung'}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="labor-befund-header__delete-btn"
                onClick={handleDelete}
                title="Befund löschen"
              >
                Löschen
              </button>
            </header>

            {/* Categories */}
            {selectedBefund.categories.length === 0 ? (
              <p className="labor-page__no-params">Keine Parameter erkannt.</p>
            ) : (
              <div className="labor-page__categories">
                {selectedBefund.categories.map((cat) => (
                  <CategorySection
                    key={cat.id}
                    category={cat}
                    previousBefund={previousBefund}
                    caseId={caseId}
                    onPinWidget={handlePinWidget}
                    onShowGraph={setGraphCategory}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showAddDialog && (
        <AddBefundDialog
          onSave={handleSaveBefund}
          onClose={() => setShowAddDialog(false)}
        />
      )}

      {graphCategory && (
        <GraphModal
          category={graphCategory}
          befunde={befunde}
          onClose={() => setGraphCategory(null)}
        />
      )}
    </div>
  )
}
