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
// Inline Paste Zone
// ---------------------------------------------------------------------------

type ParseStatus = 'idle' | 'analyzing' | 'success' | 'too-few'

interface LaborPasteZoneProps {
  onSave: (date: string, rawText: string, categories: LaborCategory[], label?: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

function LaborPasteZone({ onSave, textareaRef }: LaborPasteZoneProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [rawText, setRawText] = useState('')
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState<ParseStatus>('idle')
  const [parsed, setParsed] = useState<LaborCategory[] | null>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const isPasteRef = useRef(false)
  const resolvedRef = (textareaRef ?? internalRef) as React.RefObject<HTMLTextAreaElement>

  const totalParams = parsed?.reduce((sum, c) => sum + c.values.length, 0) ?? 0

  const runParse = useCallback((text: string) => {
    if (!text.trim()) return
    setStatus('analyzing')
    setAiMessage(null)
    setTimeout(() => {
      const cats = parseLabText(text)
      const total = cats.reduce((sum, c) => sum + c.values.length, 0)
      setParsed(cats)
      setStatus(total >= 3 ? 'success' : 'too-few')
    }, 0)
  }, [])

  const handlePaste = useCallback(() => {
    isPasteRef.current = true
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setRawText(val)
      setParsed(null)
      setStatus('idle')
      setAiMessage(null)
      if (isPasteRef.current) {
        isPasteRef.current = false
        if (val.trim()) {
          runParse(val)
        }
      }
    },
    [runParse],
  )

  const handleSave = useCallback(() => {
    if (!parsed || totalParams === 0) return
    onSave(date, rawText, parsed, label.trim() || undefined)
    setRawText('')
    setLabel('')
    setParsed(null)
    setStatus('idle')
    setAiMessage(null)
  }, [date, label, onSave, parsed, rawText, totalParams])

  const handleReject = useCallback(() => {
    setRawText('')
    setParsed(null)
    setStatus('idle')
    setAiMessage(null)
  }, [])

  const handleEdit = useCallback(() => {
    setParsed(null)
    setStatus('idle')
    setAiMessage(null)
    resolvedRef.current?.focus()
  }, [resolvedRef])

  return (
    <div className="labor-paste-zone">
      <div className="labor-paste-zone__meta-row">
        <label className="labor-paste-zone__meta-label">
          <span>Datum</span>
          <input
            type="date"
            className="labor-paste-zone__meta-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="labor-paste-zone__meta-label">
          <span>Bezeichnung (optional)</span>
          <input
            type="text"
            className="labor-paste-zone__meta-input"
            placeholder="z. B. Aufnahmelabor"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
        </label>
      </div>

      <textarea
        ref={resolvedRef}
        className="labor-paste-zone__textarea"
        placeholder="Laborbefund hier einfügen (Strg+V) — wird automatisch strukturiert"
        value={rawText}
        onPaste={handlePaste}
        onChange={handleChange}
        rows={6}
      />
      <p className="labor-paste-zone__hint">
        Einfach einfügen — die automatische Strukturierung beginnt sofort
      </p>

      {status === 'idle' && rawText.trim() && (
        <div className="labor-paste-zone__actions">
          <button
            type="button"
            className="labor-paste-zone__btn labor-paste-zone__btn--primary"
            onClick={() => runParse(rawText)}
          >
            Analysieren
          </button>
        </div>
      )}

      {status === 'analyzing' && (
        <p className="labor-paste-zone__status">
          <span className="labor-paste-zone__dots">Wird strukturiert…</span>
        </p>
      )}

      {status === 'success' && parsed && (
        <>
          <div className="labor-paste-zone__preview">
            <p className="labor-paste-zone__preview-title">
              {totalParams} Parameter in {parsed.length} Kategorien erkannt
            </p>
            {parsed.map((cat) => (
              <div key={cat.id} className="labor-paste-zone__preview-cat">
                <strong>{cat.label}</strong>
                <span className="labor-paste-zone__preview-count"> ({cat.values.length}): </span>
                <span className="labor-paste-zone__preview-names">
                  {cat.values.map((v) => v.name).join(', ')}
                </span>
              </div>
            ))}
          </div>
          <div className="labor-paste-zone__actions">
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--save"
              onClick={handleSave}
              disabled={totalParams === 0}
            >
              Übernehmen
            </button>
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--reject"
              onClick={handleReject}
            >
              Ablehnen
            </button>
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--edit"
              onClick={handleEdit}
            >
              Bearbeiten
            </button>
          </div>
          <div className="labor-paste-zone__ai-row">
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--ai"
              onClick={() => setAiMessage('KI-Analyse kommt bald')}
            >
              Mit KI analysieren
            </button>
            {aiMessage && <span className="labor-paste-zone__ai-msg">{aiMessage}</span>}
          </div>
        </>
      )}

      {status === 'too-few' && (
        <>
          <p className="labor-paste-zone__status labor-paste-zone__status--warn">
            Automatische Strukturierung nicht möglich
          </p>
          <div className="labor-paste-zone__actions">
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--ai"
              onClick={() => setAiMessage('KI-Strukturierung kommt bald')}
            >
              Mit KI strukturieren
            </button>
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--edit"
              onClick={handleEdit}
            >
              Bearbeiten
            </button>
          </div>
          <div className="labor-paste-zone__ai-row">
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--ai"
              onClick={() => setAiMessage('KI-Analyse kommt bald')}
            >
              Mit KI analysieren
            </button>
            {aiMessage && <span className="labor-paste-zone__ai-msg">{aiMessage}</span>}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Patient assignment collapsible
// ---------------------------------------------------------------------------

interface PatientsZuordnenProps {
  onCreatePatient?: () => void
}

function PatientsZuordnen({ onCreatePatient }: PatientsZuordnenProps) {
  const [open, setOpen] = useState(false)
  const [showVorhandener, setShowVorhandener] = useState(false)

  return (
    <div className="labor-section-collapse">
      <button
        type="button"
        className="labor-section-collapse__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="labor-section-collapse__chevron">{open ? '▾' : '▶'}</span>
        Patienten zuordnen
      </button>
      {open && (
        <div className="labor-section-collapse__body">
          <button
            type="button"
            className="labor-section-collapse__option-btn"
            onClick={() => {
              if (onCreatePatient) {
                onCreatePatient()
              } else {
                showNotionToast('Kommt bald')
              }
            }}
          >
            Neuer Patient
          </button>
          <button
            type="button"
            className="labor-section-collapse__option-btn"
            onClick={() => setShowVorhandener((v) => !v)}
          >
            Vorhandener Patient
          </button>
          {showVorhandener && (
            <p className="labor-section-collapse__placeholder">
              Wählen Sie einen Patienten aus dem Dashboard
            </p>
          )}
        </div>
      )}
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
  onCreatePatient?: () => void
}

export function LaborPage({ caseId, onCreatePatient }: LaborPageProps) {
  const [befunde, setBefunde] = useState<LaborBefund[]>(() =>
    [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date)),
  )
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const sorted = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0]?.id ?? null
  })
  const [graphCategory, setGraphCategory] = useState<LaborCategory | null>(null)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const loaded = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))
    setBefunde(loaded)
    setSelectedId(loaded[0]?.id ?? null)
  }, [caseId])

  const selectedBefund = useMemo(
    () => befunde.find((b) => b.id === selectedId) ?? null,
    [befunde, selectedId],
  )

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
          onClick={() => pasteTextareaRef.current?.focus()}
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
        {/* Inline paste zone — always visible at top */}
        <LaborPasteZone onSave={handleSaveBefund} textareaRef={pasteTextareaRef} />

        {selectedBefund ? (
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

            {/* Patient assignment collapsible */}
            <PatientsZuordnen onCreatePatient={onCreatePatient} />
          </div>
        ) : (
          <div className="labor-page__empty">
            <p className="labor-page__empty-text">
              Laborbefund einfügen oder auswählen
            </p>
          </div>
        )}
      </div>

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
