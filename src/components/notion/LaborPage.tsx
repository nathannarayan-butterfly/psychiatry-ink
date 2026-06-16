import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clipboard, Printer, Trash2, X as XIcon } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
  LabelList,
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
import { syncLaborDokumente } from '../../utils/laborDokumente'
import { appendDokument, deleteDokument } from '../../utils/dokumenteArchive'
import { parseLabText } from '../../utils/laborParser'
import { showNotionToast } from './NotionToast'
import { API_BASE } from '../../services/apiClient'
import { useTranslation } from '../../context/TranslationContext'
import { loadMedicationPlanState } from '../../utils/medication/storage'
import { isMedicationVisible } from '../../utils/medication/planOps'
import {
  buildLabRelevance,
  classifyAnalyte,
  formatRationaleCaption,
} from '../../utils/diagnostics/labRelevance'
import { loadDiagnosen } from '../../utils/diagnosenArchive'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { loadNotionDocumentSnapshot } from '../../utils/notionDocumentActions'
import type { MedicationStatus } from '../../types/medicationPlan'
import { consumeDiagnosticsSectionPref } from '../../utils/befundArchive'
import {
  DiagnostikBefundeMain,
  DiagnostikBefundeSidebar,
  useDiagnostikBefunde,
} from '../diagnostik/DiagnostikBefundeSection'
import { DIAGNOSTICS_SECTIONS, type DiagnosticsSectionId } from '../../data/diagnosticsSections'
import { useLaborBefundeList } from '../../hooks/useLaborBefundeList'
import { useDiagnosticsSectionNavOptional } from '../../contexts/DiagnosticsSectionNavContext'

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
// KI Analysis Modal
// ---------------------------------------------------------------------------

interface KiAnalyseModalProps {
  text: string
  title: string
  onAccept: () => void
  onReject: () => void
  onCopy?: () => void
}

function KiAnalyseModal({ text, title, onAccept, onReject, onCopy }: KiAnalyseModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onReject()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onReject])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onReject()
  }

  return (
    <div
      className="therapy-modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="therapy-modal therapy-modal--wide labor-ki-modal">
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <span className="labor-ki-modal__icon">🤖</span>
            <h2 className="therapy-modal__title">{title}</h2>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={onReject}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="therapy-modal__body">
          <p className="labor-ki-modal__text">{text}</p>
        </div>
        <div className="therapy-modal__footer">
          <button
            type="button"
            className="labor-ki-modal__btn labor-ki-modal__btn--reject"
            onClick={onReject}
          >
            <XIcon size={15} />
            Ablehnen
          </button>
          {onCopy && (
            <button
              type="button"
              className="labor-ki-modal__btn labor-ki-modal__btn--copy"
              onClick={onCopy}
            >
              <Clipboard size={15} />
              Kopieren
            </button>
          )}
          <button
            type="button"
            className="labor-ki-modal__btn labor-ki-modal__btn--accept"
            onClick={onAccept}
          >
            <Check size={15} />
            Annehmen
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline Paste Zone
// ---------------------------------------------------------------------------

type ParseStatus = 'idle' | 'analyzing' | 'success' | 'too-few'

interface LaborPasteZoneProps {
  caseId?: string
  onSave: (date: string, rawText: string, categories: LaborCategory[], label?: string) => void
  onKiAnalysisAccept?: (text: string, date: string, label?: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

const KI_STRUKTUR_SYSTEM_PROMPT = `Du bist ein medizinischer Datenassistent. Extrahiere ALLE Laborwerte mit ihren gemessenen Werten, Einheiten und Referenzbereichen aus dem folgenden Text.

WICHTIG:
- "value" = der tatsächlich gemessene Wert aus dem Text (z.B. "5.2", "12.5", "0.45")
- "unit" = die Einheit aus dem Text (z.B. "g/dL", "10^9/L", "mmol/L")
- "refText" = der Referenzbereich aus dem Text (z.B. "13.5-17.5", "< 5.0")
- "isAbnormal" = true wenn der Wert außerhalb des Referenzbereichs liegt
- Lasse KEINEN gemessenen Wert weg — auch wenn kein Referenzbereich vorhanden ist

Kategorien: Blutbild, Nierenwerte, Leberwerte, Elektrolyte, Medikamentenspiegel, Schilddrüse, Stoffwechsel, Gerinnung, Entzündung, Sonstiges.

Antworte NUR mit einem gültigen JSON-Array (kein Markdown, keine Erklärungen):
[{"id":"blutbild","label":"Blutbild","values":[{"name":"Hämoglobin","value":"12.5","unit":"g/dL","refText":"13.5-17.5","isAbnormal":true},{"name":"Leukozyten","value":"7.8","unit":"10^9/L","refText":"4.0-10.0","isAbnormal":false}]},{"id":"medikamentenspiegel","label":"Medikamentenspiegel","values":[{"name":"Olanzapin","value":"32","unit":"ng/mL","refText":"20-80","isAbnormal":false}]}]`

const KI_ANALYSE_SYSTEM_PROMPT = `Du bist ein Facharzt für Psychiatrie und Innere Medizin. Analysiere die folgenden Laborwerte klinisch im Kontext der mitgegebenen Patienteninformationen.

Beachte insbesondere:
- Auffällige und pathologische Werte sowie deren klinische Relevanz
- Mögliche medikamentös bedingte Laborveränderungen (z.B. Clozapin → Leukozyten/Agranulozytose-Risiko, Lithium → TSH/Kreatinin/GFR, Valproat → Leberwerte/Thrombozyten, Antipsychotika → Prolaktin/Glukose/Lipide, SSRI → Natrium/Hyponatriämie)
- Zusammenhänge zwischen Laborveränderungen, psychiatrischen Diagnosen und somatischen Komorbiditäten
- Handlungsbedarf (z.B. Dosisanpassung, Verlaufskontrolle, Konsiliaruntersuchung)

Falls klinischer Kontext (Medikamente, Diagnosen, Demografie) mitgeliefert wird, nutze ihn aktiv für die Interpretation. Fehlen Angaben, analysiere anhand der Laborwerte allein.
Antworte auf Deutsch in 4–6 Sätzen. Beginne direkt mit der klinischen Einschätzung ohne einleitende Floskeln.`

const ACTIVE_MED_STATUSES: ReadonlySet<MedicationStatus> = new Set<MedicationStatus>([
  'active',
  'paused',
  'reduced',
  'increased',
])

/**
 * Gather available clinical context for AI lab analysis.
 * Gracefully omits any piece that is missing or empty.
 */
function gatherClinicalContext(caseId: string): string {
  const parts: string[] = []

  // Patient age & sex from case registry
  const meta = getCaseMeta(caseId)
  const ageSexParts: string[] = []
  if (meta?.localAge?.trim()) ageSexParts.push(`Alter: ${meta.localAge} Jahre`)
  if (meta?.localGeschlecht) {
    const sexMap: Record<string, string> = {
      maennlich: 'männlich',
      weiblich: 'weiblich',
      divers: 'divers',
    }
    ageSexParts.push(`Geschlecht: ${sexMap[meta.localGeschlecht] ?? meta.localGeschlecht}`)
  }
  if (ageSexParts.length > 0) parts.push(ageSexParts.join(', '))

  // Diagnoses (ICD-10 preferred)
  try {
    const diagnosen = loadDiagnosen(caseId)
    if (diagnosen.length > 0) {
      const diagLines = diagnosen
        .map((d) => {
          const code = d.icd10.code.trim()
          const label = d.icd10.label.trim()
          if (code && label) return `${code} ${label}`
          return code || label
        })
        .filter(Boolean)
      if (diagLines.length > 0) parts.push(`Diagnosen: ${diagLines.join('; ')}`)
    }
  } catch {
    // Non-critical — skip if unavailable
  }

  // Active/relevant medications from the current medication plan
  try {
    const planState = loadMedicationPlanState(caseId)
    if (planState) {
      const currentPlan = planState.plans.find((p) => p.id === planState.currentPlanId)
      if (currentPlan) {
        const activeMeds = currentPlan.medications.filter((m) =>
          isMedicationVisible(m) && ACTIVE_MED_STATUSES.has(m.status),
        )
        if (activeMeds.length > 0) {
          const medLines = activeMeds.map((m) => {
            const line = m.doseLineGerman.trim() || `${m.substance} ${m.strength}`.trim()
            const statusNote = m.status !== 'active' ? ` (${m.status})` : ''
            return `${line}${statusNote}`
          })
          parts.push(`Aktuelle Medikation:\n${medLines.map((l) => `  - ${l}`).join('\n')}`)
        }
      }
    }
  } catch {
    // Non-critical — skip if unavailable
  }

  // Somatic anamnese excerpt from Aufnahme document
  try {
    const aufnahme = loadNotionDocumentSnapshot('aufnahme', caseId)
    if (aufnahme) {
      const somaticRaw = [
        aufnahme.sectionContents['somatische-anamnese'],
        aufnahme.sectionContents['somatischer-befund'],
      ]
        .map((s) => s?.trim() ?? '')
        .filter(Boolean)
        .join('\n')
      if (somaticRaw) {
        const excerpt = somaticRaw.length > 600 ? somaticRaw.slice(0, 600) + '…' : somaticRaw
        parts.push(`Somatische Anamnese:\n${excerpt}`)
      }
    }
  } catch {
    // Non-critical — skip if unavailable
  }

  if (parts.length === 0) return ''
  return `KLINISCHER KONTEXT:\n${parts.join('\n\n')}`
}

function extractJsonFromAiText(text: string): string {
  // Strip markdown code fences
  let cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  // If the AI wrapped the JSON in prose, extract just the array
  const arrayStart = cleaned.indexOf('[')
  const arrayEnd = cleaned.lastIndexOf(']')
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    cleaned = cleaned.slice(arrayStart, arrayEnd + 1)
  }

  return cleaned
}

function parseAiCategories(text: string): LaborCategory[] {
  const cleaned = extractJsonFromAiText(text)
  const raw = JSON.parse(cleaned) as unknown
  if (!Array.isArray(raw)) throw new Error('Expected JSON array')
  return (raw as Record<string, unknown>[]).map((cat) => ({
    id: String(cat.id ?? 'sonstiges'),
    label: String(cat.label ?? 'Sonstiges'),
    values: Array.isArray(cat.values)
      ? (cat.values as Record<string, unknown>[]).map((v) => {
          const numericValue = parseFloat(String(v.value ?? '').replace(',', '.'))
          return {
            name: String(v.name ?? ''),
            value: String(v.value ?? ''),
            numericValue: Number.isNaN(numericValue) ? undefined : numericValue,
            unit: String(v.unit ?? ''),
            refMin: typeof v.refMin === 'number' ? (v.refMin as number) : undefined,
            refMax: typeof v.refMax === 'number' ? (v.refMax as number) : undefined,
            refText: typeof v.refText === 'string' ? (v.refText as string) : undefined,
            isAbnormal: typeof v.isAbnormal === 'boolean' ? (v.isAbnormal as boolean) : undefined,
          } satisfies LaborValue
        })
      : [],
  }))
}

async function callAiGenerate(
  systemPrompt: string,
  userPrompt: string,
  caseId?: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier: 'fast',
      systemPrompt,
      userPrompt,
      ...(caseId?.trim() ? { caseId: caseId.trim() } : {}),
    }),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(detail?.error ?? `AI-Anfrage fehlgeschlagen (${response.status})`)
  }
  const data = await response.json() as { text: string }
  return data.text
}

function LaborPasteZone({ caseId, onSave, onKiAnalysisAccept, textareaRef }: LaborPasteZoneProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [rawText, setRawText] = useState('')
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState<ParseStatus>('idle')
  const [parsed, setParsed] = useState<LaborCategory[] | null>(null)
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null)
  const [isKiStructuring, setIsKiStructuring] = useState(false)
  const [isKiAnalysing, setIsKiAnalysing] = useState(false)
  const [kiAnalysisText, setKiAnalysisText] = useState<string | null>(null)
  const [kiError, setKiError] = useState<string | null>(null)
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const isPasteRef = useRef(false)
  const resolvedRef = (textareaRef ?? internalRef) as React.RefObject<HTMLTextAreaElement>

  const totalParams = parsed?.reduce((sum, c) => sum + c.values.length, 0) ?? 0

  const runParse = useCallback((text: string) => {
    if (!text.trim()) return
    setStatus('analyzing')
    setKiError(null)
    setKiAnalysisText(null)
    setTimeout(() => {
      const result = parseLabText(text)
      const { title, date: detectedDate, categories: cats } = result
      const total = cats.reduce((sum, c) => sum + c.values.length, 0)
      setParsed(cats)
      setDetectedTitle(title)
      // Auto-fill date field if the text contained a recognisable date
      if (detectedDate && !isNaN(detectedDate.getTime())) {
        const iso = detectedDate.toISOString().slice(0, 10)
        setDate(iso)
      }
      // Auto-fill label from detected heading
      if (title && !label.trim()) {
        setLabel(title)
      }
      setStatus(total >= 3 ? 'success' : 'too-few')
    }, 0)
  }, [label])

  const handlePaste = useCallback(() => {
    isPasteRef.current = true
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setRawText(val)
      setParsed(null)
      setStatus('idle')
      setKiError(null)
      setKiAnalysisText(null)
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
    onSave(date, rawText, parsed, label.trim() || detectedTitle || undefined)
    setRawText('')
    setLabel('')
    setParsed(null)
    setDetectedTitle(null)
    setStatus('idle')
    setKiError(null)
    setKiAnalysisText(null)
  }, [date, detectedTitle, label, onSave, parsed, rawText, totalParams])

  const handleReject = useCallback(() => {
    setRawText('')
    setParsed(null)
    setDetectedTitle(null)
    setStatus('idle')
    setKiError(null)
    setKiAnalysisText(null)
  }, [])

  const handleEdit = useCallback(() => {
    setParsed(null)
    setStatus('idle')
    setKiError(null)
    setKiAnalysisText(null)
    resolvedRef.current?.focus()
  }, [resolvedRef])

  const handleKiModalAccept = useCallback(() => {
    if (!kiAnalysisText) return
    if (onKiAnalysisAccept) onKiAnalysisAccept(kiAnalysisText, date, label.trim() || detectedTitle || undefined)
    setKiAnalysisText(null)
  }, [kiAnalysisText, onKiAnalysisAccept, date, label, detectedTitle])

  const handleKiModalReject = useCallback(() => {
    setKiAnalysisText(null)
  }, [])

  const handleKiStrukturieren = useCallback(async () => {
    if (!rawText.trim() || isKiStructuring) return
    setIsKiStructuring(true)
    setKiError(null)
    setKiAnalysisText(null)
    try {
      const aiText = await callAiGenerate(KI_STRUKTUR_SYSTEM_PROMPT, rawText, caseId)
      const cats = parseAiCategories(aiText)
      const total = cats.reduce((sum, c) => sum + c.values.length, 0)
      if (total === 0) throw new Error('Keine Laborwerte erkannt')
      setParsed(cats)
      setStatus('success')
    } catch {
      setKiError('KI-Strukturierung fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setIsKiStructuring(false)
    }
  }, [rawText, isKiStructuring])

  const handleKiAnalysieren = useCallback(async () => {
    if (isKiAnalysing) return
    setIsKiAnalysing(true)
    setKiError(null)
    try {
      let labSection: string
      if (parsed && parsed.length > 0) {
        labSection = parsed
          .map((cat) => {
            const values = cat.values
              .map((v) => {
                const ref = v.refText ? ` (Ref: ${v.refText})` : ''
                const flag = v.isAbnormal ? ' ⚠' : ''
                return `  ${v.name}: ${v.value} ${v.unit}${ref}${flag}`
              })
              .join('\n')
            return `${cat.label}:\n${values}`
          })
          .join('\n\n')
      } else {
        labSection = rawText
      }
      const clinicalContext = caseId ? gatherClinicalContext(caseId) : ''
      const userPrompt = clinicalContext
        ? `${clinicalContext}\n\nLABORWERTE:\n${labSection}`
        : `LABORWERTE:\n${labSection}`
      const aiText = await callAiGenerate(KI_ANALYSE_SYSTEM_PROMPT, userPrompt, caseId)
      setKiAnalysisText(aiText.trim())
    } catch {
      setKiError('KI-Analyse fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setIsKiAnalysing(false)
    }
  }, [parsed, rawText, isKiAnalysing, caseId])

  const kiLoading = isKiStructuring || isKiAnalysing

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
      <div className="labor-paste-zone__features">
        <span>📊 KI-Strukturierung</span>
        <span>🔬 KI-Analyse</span>
        <span>📈 Grafiken & Verläufe</span>
        <span>📋 Kopieren · Drucken · PDF</span>
      </div>

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

      {isKiStructuring && (
        <p className="labor-paste-zone__status">
          <span className="labor-paste-zone__dots">KI analysiert…</span>
        </p>
      )}

      {status === 'success' && parsed && !isKiStructuring && (
        <>
          <div className="labor-paste-zone__preview">
            {detectedTitle && (
              <div className="labor-paste-zone__detected-heading">
                <span className="labor-paste-zone__detected-heading-icon">📋</span>
                {detectedTitle}
              </div>
            )}
            <p className="labor-paste-zone__preview-title">
              {totalParams} Parameter in {parsed.length} Kategorien erkannt
            </p>
            {parsed.map((cat) => (
              <div key={cat.id} className="labor-paste-zone__preview-cat">
                <div className="labor-paste-zone__preview-cat-label">
                  {cat.label} <span className="labor-paste-zone__preview-count">({cat.values.length})</span>
                </div>
                <table className="labor-paste-zone__preview-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Wert</th>
                      <th>Einheit</th>
                      <th>Referenz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.values.map((v) => (
                      <tr key={v.name} className={v.isAbnormal ? 'labor-paste-zone__preview-row--abnormal' : ''}>
                        <td>{v.name}</td>
                        <td className={v.isAbnormal ? 'labor-paste-zone__preview-val--abnormal' : ''}>{v.value}</td>
                        <td>{v.unit}</td>
                        <td>{v.refText ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              onClick={handleKiAnalysieren}
              disabled={kiLoading}
            >
              {isKiAnalysing ? 'KI analysiert…' : 'Mit KI analysieren'}
            </button>
          </div>
          {kiError && <p className="labor-paste-zone__ki-error">{kiError}</p>}
        </>
      )}

      {status === 'too-few' && !isKiStructuring && (
        <>
          <p className="labor-paste-zone__status labor-paste-zone__status--warn">
            Automatische Strukturierung nicht möglich
          </p>
          <div className="labor-paste-zone__actions">
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--ai"
              onClick={handleKiStrukturieren}
              disabled={kiLoading}
            >
              Mit KI strukturieren
            </button>
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--edit"
              onClick={handleEdit}
              disabled={kiLoading}
            >
              Bearbeiten
            </button>
          </div>
          <div className="labor-paste-zone__ai-row">
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--ai"
              onClick={handleKiAnalysieren}
              disabled={kiLoading}
            >
              {isKiAnalysing ? 'KI analysiert…' : 'Mit KI analysieren'}
            </button>
          </div>
          {kiError && <p className="labor-paste-zone__ki-error">{kiError}</p>}
        </>
      )}

      {kiAnalysisText && (
        <KiAnalyseModal
          text={kiAnalysisText}
          title="KI-Analyse"
          onAccept={handleKiModalAccept}
          onReject={handleKiModalReject}
        />
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
  selectedParams: string[]
  onClose: () => void
  onCloseAndPin: () => void
}

function GraphModal({ category, befunde, selectedParams, onClose, onCloseAndPin }: GraphModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'busy' | 'done' | 'err'>('idle')
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'busy' | 'done' | 'err'>('idle')
  const [isMaximized, setIsMaximized] = useState(false)

  const sortedBefunde = useMemo(
    () => [...befunde].sort((a, b) => a.date.localeCompare(b.date)),
    [befunde],
  )

  // chartData includes abnormal flags as `${name}__abn` keys
  const chartData = useMemo(
    () =>
      sortedBefunde.map((b) => {
        const catMatch = b.categories.find(
          (c) => c.id === category.id || c.label === category.label,
        )
        const row: Record<string, string | number | boolean> = { date: shortDate(b.date) }
        for (const name of selectedParams) {
          const v = catMatch?.values.find((val) => val.name === name)
          if (v?.numericValue !== undefined) {
            row[name] = v.numericValue
            row[`${name}__abn`] = v.isAbnormal ?? false
          }
        }
        return row
      }),
    [sortedBefunde, category, selectedParams],
  )

  // Collect reference ranges per param (first befund that has them)
  const refRanges = useMemo<Record<string, { min?: number; max?: number }>>(() => {
    const result: Record<string, { min?: number; max?: number }> = {}
    for (const name of selectedParams) {
      for (const b of sortedBefunde) {
        const catMatch = b.categories.find(
          (c) => c.id === category.id || c.label === category.label,
        )
        const v = catMatch?.values.find((val) => val.name === name)
        if (v && (v.refMin !== undefined || v.refMax !== undefined)) {
          result[name] = { min: v.refMin, max: v.refMax }
          break
        }
      }
    }
    return result
  }, [selectedParams, sortedBefunde, category])

  const isSingleParam = selectedParams.length === 1
  const hasChart = chartData.length >= 2

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  async function handleCopyImage() {
    const el = chartContainerRef.current
    if (!el || copyStatus === 'busy') return
    setCopyStatus('busy')
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error('toBlob failed')); return }
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            resolve()
          } catch (err) { reject(err) }
        }, 'image/png')
      })
      setCopyStatus('done')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('err')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  function handlePrint() {
    const el = chartContainerRef.current
    if (!el) return
    el.setAttribute('data-labor-print', 'true')
    const style = document.createElement('style')
    style.id = '__labor_graph_print__'
    style.textContent = `@media print {
      body * { visibility: hidden !important; }
      [data-labor-print="true"], [data-labor-print="true"] * { visibility: visible !important; }
      [data-labor-print="true"] { position: fixed; top: 0; left: 0; right: 0; width: 100%; }
    }`
    document.head.appendChild(style)
    window.print()
    setTimeout(() => {
      style.remove()
      el.removeAttribute('data-labor-print')
    }, 300)
  }

  async function handleExportPdf() {
    const el = chartContainerRef.current
    if (!el || pdfStatus === 'busy') return
    setPdfStatus('busy')
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const w = canvas.width / 2
      const h = canvas.height / 2
      const pdf = new jsPDF({
        orientation: w > h ? 'landscape' : 'portrait',
        unit: 'px',
        format: [w, h],
      })
      pdf.addImage(imgData, 'JPEG', 0, 0, w, h)
      const safeName = (selectedParams[0] ?? category.label).replace(/[^\w\-äöüÄÖÜß]/g, '_')
      pdf.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`)
      setPdfStatus('done')
      setTimeout(() => setPdfStatus('idle'), 2000)
    } catch {
      setPdfStatus('err')
      setTimeout(() => setPdfStatus('idle'), 2000)
    }
  }

  return (
    <div className="labor-graph-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={['labor-graph-modal', isMaximized ? 'labor-graph-modal--maximized' : ''].join(' ').trim()} role="dialog" aria-modal="true">
        <div className="labor-graph-modal__header">
          <h3 className="labor-graph-modal__title">
            {category.label}
            {isSingleParam ? ` — ${selectedParams[0]}` : ''} — Verlauf
          </h3>
          <button
            type="button"
            className="labor-graph-modal__maximize"
            onClick={() => setIsMaximized((v) => !v)}
            aria-label={isMaximized ? 'Verkleinern' : 'Maximieren'}
            title={isMaximized ? 'Verkleinern' : 'Maximieren'}
          >
            {isMaximized ? '⊡' : '⊞'}
          </button>
          <button
            type="button"
            className="labor-graph-modal__close"
            onClick={onClose}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        {hasChart && (
          <div className="labor-graph-modal__toolbar">
            <button
              type="button"
              className={[
                'labor-graph-modal__tool-btn',
                copyStatus === 'done' ? 'labor-graph-modal__tool-btn--success' : '',
                copyStatus === 'err' ? 'labor-graph-modal__tool-btn--error' : '',
              ].join(' ').trim()}
              onClick={handleCopyImage}
              disabled={copyStatus === 'busy'}
              title="Grafik als Bild in die Zwischenablage kopieren"
            >
              {copyStatus === 'done' ? 'Kopiert!' : copyStatus === 'err' ? 'Fehler' : 'Kopieren'}
            </button>
            <button
              type="button"
              className="labor-graph-modal__tool-btn"
              onClick={handlePrint}
              title="Grafik drucken"
            >
              Drucken
            </button>
            <button
              type="button"
              className={[
                'labor-graph-modal__tool-btn',
                pdfStatus === 'done' ? 'labor-graph-modal__tool-btn--success' : '',
                pdfStatus === 'err' ? 'labor-graph-modal__tool-btn--error' : '',
              ].join(' ').trim()}
              onClick={handleExportPdf}
              disabled={pdfStatus === 'busy'}
              title="Grafik als PDF exportieren"
            >
              {pdfStatus === 'done' ? 'Gespeichert!' : pdfStatus === 'err' ? 'Fehler' : 'PDF'}
            </button>
            <button
              type="button"
              className="labor-graph-modal__tool-btn labor-graph-modal__tool-btn--close-pin"
              onClick={onCloseAndPin}
              title="Grafik schließen und im linken Panel speichern"
            >
              ✕ Schließen
            </button>
          </div>
        )}

        <div className="labor-graph-modal__body">
          {!hasChart ? (
            <p className="labor-graph-modal__hint">
              Mindestens 2 Befunde für Verlaufsgrafik erforderlich.
            </p>
          ) : (
            <div ref={chartContainerRef} className="labor-graph-modal__chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 22, right: 24, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={45} />
                  <Tooltip />
                  <Legend />

                  {/* Single-param: shaded reference band */}
                  {isSingleParam &&
                    (() => {
                      const range = refRanges[selectedParams[0]]
                      if (!range) return null
                      const elements: React.ReactElement[] = []
                      if (range.min !== undefined && range.max !== undefined) {
                        elements.push(
                          <ReferenceArea
                            key="ref-area"
                            y1={range.min}
                            y2={range.max}
                            fill="#22c55e"
                            fillOpacity={0.09}
                            ifOverflow="extendDomain"
                          />,
                        )
                        elements.push(
                          <ReferenceLine
                            key="ref-min"
                            y={range.min}
                            stroke="#22c55e"
                            strokeDasharray="4 2"
                            label={{
                              value: String(range.min),
                              position: 'insideBottomLeft',
                              fontSize: 11,
                              fill: '#16a34a',
                            }}
                          />,
                        )
                        elements.push(
                          <ReferenceLine
                            key="ref-max"
                            y={range.max}
                            stroke="#22c55e"
                            strokeDasharray="4 2"
                            label={{
                              value: String(range.max),
                              position: 'insideTopLeft',
                              fontSize: 11,
                              fill: '#16a34a',
                            }}
                          />,
                        )
                      } else if (range.max !== undefined) {
                        elements.push(
                          <ReferenceLine
                            key="ref-max"
                            y={range.max}
                            stroke="#22c55e"
                            strokeDasharray="4 2"
                            label={{
                              value: `<${range.max}`,
                              position: 'insideTopLeft',
                              fontSize: 11,
                              fill: '#16a34a',
                            }}
                          />,
                        )
                      } else if (range.min !== undefined) {
                        elements.push(
                          <ReferenceLine
                            key="ref-min"
                            y={range.min}
                            stroke="#22c55e"
                            strokeDasharray="4 2"
                            label={{
                              value: `>${range.min}`,
                              position: 'insideBottomLeft',
                              fontSize: 11,
                              fill: '#16a34a',
                            }}
                          />,
                        )
                      }
                      return elements
                    })()}

                  {/* Multi-param: dashed reference lines per series */}
                  {!isSingleParam &&
                    selectedParams.flatMap((name, i) => {
                      const range = refRanges[name]
                      if (!range) return []
                      const color = LINE_COLORS[i % LINE_COLORS.length]
                      const lines: React.ReactElement[] = []
                      if (range.min !== undefined) {
                        lines.push(
                          <ReferenceLine
                            key={`ref-min-${name}`}
                            y={range.min}
                            stroke={color}
                            strokeDasharray="3 3"
                            strokeOpacity={0.45}
                          />,
                        )
                      }
                      if (range.max !== undefined) {
                        lines.push(
                          <ReferenceLine
                            key={`ref-max-${name}`}
                            y={range.max}
                            stroke={color}
                            strokeDasharray="3 3"
                            strokeOpacity={0.45}
                          />,
                        )
                      }
                      return lines
                    })}

                  {selectedParams.map((name, i) => {
                    const baseColor = LINE_COLORS[i % LINE_COLORS.length]
                    return (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={baseColor}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        dot={(dotProps: any) => {
                          const { cx, cy, payload } = dotProps as {
                            cx: number
                            cy: number
                            payload: Record<string, unknown>
                          }
                          const isAbn = payload[`${name}__abn`] === true
                          const fill = isAbn ? '#ef4444' : baseColor
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill={fill}
                              stroke={fill}
                              strokeWidth={1}
                            />
                          )
                        }}
                        connectNulls
                      >
                        <LabelList
                          dataKey={name}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          content={(labelProps: any) => {
                            const { x, y, value, index } = labelProps as {
                              x: number
                              y: number
                              value: number | string | undefined
                              index: number
                            }
                            if (value === undefined || value === null || value === '') return null
                            const isAbn = chartData[index]?.[`${name}__abn`] === true
                            return (
                              <text
                                x={Number(x)}
                                y={Number(y) - 9}
                                fill={isAbn ? '#ef4444' : '#6b7280'}
                                fontSize={11}
                                textAnchor="middle"
                                fontWeight={isAbn ? 700 : 400}
                              >
                                {value}
                              </text>
                            )
                          }}
                        />
                      </Line>
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parameter selection dialog
// ---------------------------------------------------------------------------

interface LaborGraphParamDialogProps {
  category: LaborCategory
  befunde: LaborBefund[]
  onConfirm: (paramNames: string[]) => void
  onClose: () => void
}

function LaborGraphParamDialog({
  category,
  befunde,
  onConfirm,
  onClose,
}: LaborGraphParamDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const sortedBefunde = useMemo(
    () => [...befunde].sort((a, b) => b.date.localeCompare(a.date)),
    [befunde],
  )

  // Collect all param names + their most recent value across befunde
  const params = useMemo(() => {
    const names = new Set<string>()
    for (const b of sortedBefunde) {
      for (const c of b.categories) {
        if (c.id === category.id || c.label === category.label) {
          for (const v of c.values) names.add(v.name)
        }
      }
    }
    return Array.from(names).map((name) => {
      let latestValue: LaborValue | undefined
      for (const b of sortedBefunde) {
        const catMatch = b.categories.find(
          (c) => c.id === category.id || c.label === category.label,
        )
        const v = catMatch?.values.find((val) => val.name === name)
        if (v) {
          latestValue = v
          break
        }
      }
      return { name, latestValue }
    })
  }, [sortedBefunde, category])

  const [checked, setChecked] = useState<Set<string>>(() => new Set(params.map((p) => p.name)))

  // Keep all pre-checked if params list changes
  useEffect(() => {
    setChecked(new Set(params.map((p) => p.name)))
  }, [params])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  function toggleParam(name: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function handleConfirm() {
    const selected = params.map((p) => p.name).filter((n) => checked.has(n))
    if (selected.length === 0) return
    onConfirm(selected)
  }

  return (
    <div className="labor-graph-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="labor-graph-modal labor-graph-param-dialog" role="dialog" aria-modal="true">
        <div className="labor-graph-modal__header">
          <h3 className="labor-graph-modal__title">{category.label} — Parameter auswählen</h3>
          <button
            type="button"
            className="labor-graph-modal__close"
            onClick={onClose}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="labor-graph-modal__body">
          <p className="labor-graph-param-dialog__hint">
            Wähle die Parameter für die Verlaufsgrafik aus:
          </p>
          <ul className="labor-graph-param-dialog__list">
            {params.map(({ name, latestValue }) => (
              <li key={name} className="labor-graph-param-dialog__item">
                <label className="labor-graph-param-dialog__label">
                  <input
                    type="checkbox"
                    className="labor-graph-param-dialog__checkbox"
                    checked={checked.has(name)}
                    onChange={() => toggleParam(name)}
                  />
                  <span className="labor-graph-param-dialog__name">{name}</span>
                  {latestValue && (
                    <span
                      className={[
                        'labor-graph-param-dialog__value',
                        latestValue.isAbnormal ? 'labor-graph-param-dialog__value--abnormal' : '',
                      ]
                        .join(' ')
                        .trim()}
                    >
                      {latestValue.value} {latestValue.unit}
                      {latestValue.refText && (
                        <span className="labor-graph-param-dialog__ref">
                          {' '}
                          (Ref: {latestValue.refText})
                        </span>
                      )}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
          <div className="labor-graph-param-dialog__actions">
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--primary"
              onClick={handleConfirm}
              disabled={checked.size === 0}
            >
              Grafik erstellen
            </button>
            <button
              type="button"
              className="labor-paste-zone__btn labor-paste-zone__btn--reject"
              onClick={onClose}
            >
              Abbrechen
            </button>
          </div>
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
  befundeCount: number
  onPinWidget: (paramName: string, catLabel: string) => void
  onShowGraph: (cat: LaborCategory) => void
}

function CategorySection({
  category,
  previousBefund,
  caseId,
  befundeCount,
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
            title={befundeCount < 2 ? 'Mindestens 2 Befunde erforderlich' : 'Grafik anzeigen'}
            disabled={befundeCount < 2}
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
                        title={befundeCount < 2 ? 'Mindestens 2 Befunde erforderlich' : (pinned ? 'Widget entfernen' : 'Als Dashboard-Widget anheften')}
                        aria-pressed={pinned}
                        disabled={befundeCount < 2}
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
// Cumulative (Kumulativ) matrix view
// ---------------------------------------------------------------------------

interface KumulativViewProps {
  befunde: LaborBefund[]
  normalwerteLabel: string
  caseId?: string
}

function KumulativView({ befunde, normalwerteLabel, caseId }: KumulativViewProps) {
  const { t } = useTranslation()
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done'>('idle')
  const [kiStatus, setKiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [kiText, setKiText] = useState<string | null>(null)
  const [kiError, setKiError] = useState<string | null>(null)
  const [kiSavedId, setKiSavedId] = useState<string | null>(null)
  const [kiSavedText, setKiSavedText] = useState<string | null>(null)
  const [kiSavedOpen, setKiSavedOpen] = useState(false)

  // Sort befunde by date ascending (oldest = first column, newest = last)
  const sorted = useMemo(
    () => [...befunde].sort((a, b) => a.date.localeCompare(b.date)),
    [befunde],
  )

  // Collect categories and their params in stable insertion order (newest befund first)
  const categoryGroups = useMemo(() => {
    const catMap = new Map<string, { id: string; label: string; paramNames: string[] }>()
    const catOrder: string[] = []
    // Iterate newest → oldest so the most-recent ordering takes priority
    for (const b of [...sorted].reverse()) {
      for (const cat of b.categories) {
        const key = cat.id || cat.label
        if (!catMap.has(key)) {
          catMap.set(key, { id: cat.id, label: cat.label, paramNames: [] })
          catOrder.push(key)
        }
        const entry = catMap.get(key)!
        const seenNames = new Set(entry.paramNames)
        for (const v of cat.values) {
          if (!seenNames.has(v.name)) {
            seenNames.add(v.name)
            entry.paramNames.push(v.name)
          }
        }
      }
    }
    return catOrder.map((key) => catMap.get(key)!)
  }, [sorted])

  // All param names in flat order (for matrix / lookup computation)
  const paramNames = useMemo(
    () => categoryGroups.flatMap((g) => g.paramNames),
    [categoryGroups],
  )

  // matrix[paramName][befundIndex] = LaborValue | undefined
  const matrix = useMemo(() => {
    const m: Record<string, (LaborValue | undefined)[]> = {}
    for (const name of paramNames) {
      m[name] = sorted.map((b) => {
        for (const cat of b.categories) {
          const found = cat.values.find((v) => v.name === name)
          if (found) return found
        }
        return undefined
      })
    }
    return m
  }, [paramNames, sorted])

  // Best reference text per param (from most-recent befund that has it)
  const refTexts = useMemo(() => {
    const r: Record<string, string> = {}
    for (const name of paramNames) {
      for (const b of [...sorted].reverse()) {
        for (const cat of b.categories) {
          const v = cat.values.find((vv) => vv.name === name)
          if (v?.refText) {
            r[name] = v.refText
            break
          }
        }
        if (r[name]) break
      }
    }
    return r
  }, [paramNames, sorted])

  // Unit per param (from most-recent befund with a non-empty unit)
  const unitTexts = useMemo(() => {
    const u: Record<string, string> = {}
    for (const name of paramNames) {
      for (const b of [...sorted].reverse()) {
        for (const cat of b.categories) {
          const v = cat.values.find((vv) => vv.name === name)
          if (v?.unit) {
            u[name] = v.unit
            break
          }
        }
        if (u[name]) break
      }
    }
    return u
  }, [paramNames, sorted])

  // ── Copy as TSV ──────────────────────────────────────────────────────────
  const handleCopyTsv = useCallback(() => {
    const headerRow = [
      'Parameter',
      ...sorted.map((b) => {
        const d = formatDate(b.date)
        return b.label ? `${d} ${b.label}` : d
      }),
      t('labUnit'),
      normalwerteLabel,
    ]
    const rows: string[] = [headerRow.join('\t')]

    for (const group of categoryGroups) {
      // Group header as a single merged cell (works well in Excel)
      rows.push(group.label)
      for (const name of group.paramNames) {
        const row = matrix[name]
        const cells = sorted.map((_, i) => {
          const val = row?.[i]
          if (!val) return '—'
          const flag = val.isAbnormal ? ' ⚠' : ''
          return `${val.value}${flag}`
        })
        rows.push([name, ...cells, unitTexts[name] ?? '', refTexts[name] ?? '–'].join('\t'))
      }
    }

    const tsv = rows.join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopyStatus('done')
      setTimeout(() => setCopyStatus('idle'), 1500)
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = tsv
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyStatus('done')
      setTimeout(() => setCopyStatus('idle'), 1500)
    })
  }, [sorted, categoryGroups, matrix, unitTexts, refTexts, normalwerteLabel, t])

  // ── Print preview ─────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const meta = caseId ? getCaseMeta(caseId) : null
    const patientLine = [meta?.localName, meta?.localAge ? `(${meta.localAge} J.)` : '']
      .filter(Boolean).join(' ').trim()
    const printDate = new Date().toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const colCount = sorted.length + 3 // param + dates + unit + ref

    // Build table rows HTML
    let tbodyHtml = ''
    for (const group of categoryGroups) {
      tbodyHtml += `<tr class="cat-header"><td colspan="${colCount}">${group.label}</td></tr>`
      for (const name of group.paramNames) {
        const row = matrix[name]
        const hasAbnormal = row?.some((v) => v?.isAbnormal)
        const rowClass = hasAbnormal ? ' class="row-abnormal"' : ''
        let cells = ''
        for (let i = 0; i < sorted.length; i++) {
          const val = row?.[i]
          if (val) {
            const cls = val.isAbnormal ? ' class="cell-abnormal"' : ''
            cells += `<td${cls}>${val.value}</td>`
          } else {
            cells += `<td class="cell-missing">—</td>`
          }
        }
        tbodyHtml += `<tr${rowClass}><td class="td-param">${name}</td>${cells}<td class="td-unit">${unitTexts[name] ?? ''}</td><td class="td-ref">${refTexts[name] ?? '–'}</td></tr>`
      }
    }

    const dateHeaders = sorted.map((b) => {
      const d = formatDate(b.date)
      const sub = b.label ? `<span class="th-sub">${b.label}</span>` : ''
      const badge = b.id === sorted[sorted.length - 1]?.id ? ' <span class="badge-new">neu</span>' : ''
      return `<th class="th-date">${d}${badge}${sub}</th>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Kumulativer Laborbefund</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a18; background: #fff; }
  .print-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 0.6rem 1rem 0.5rem; border-bottom: 2px solid #333; margin-bottom: 0.6rem; }
  .print-header__title { font-size: 13pt; font-weight: 700; }
  .print-header__patient { font-size: 9.5pt; color: #444; margin-top: 2px; }
  .print-header__date { font-size: 8.5pt; color: #666; text-align: right; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
  th, td { border: 1px solid #d0d0cc; padding: 3px 6px; vertical-align: middle; }
  thead th { background: #f0f0ec; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.03em; color: #555; }
  .th-date { text-align: center; min-width: 70px; }
  .th-sub { display: block; font-size: 7.5pt; font-weight: 400; text-transform: none; letter-spacing: 0; color: #777; }
  .badge-new { display: inline-block; font-size: 6.5pt; padding: 1px 3px; border-radius: 3px; background: #dff0e8; color: #2d7a50; font-weight: 700; vertical-align: middle; margin-left: 2px; }
  .th-param { text-align: left; min-width: 150px; }
  .th-unit, .th-ref { text-align: left; }
  .td-param { font-weight: 500; }
  .td-unit, .td-ref { color: #666; font-size: 8.5pt; }
  .cat-header td { background: #f4f4f0; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #777; padding: 3px 6px; border-top: 2px solid #ccc; }
  .row-abnormal { background: #fff5f5; }
  .cell-abnormal { color: #c0392b; font-weight: 700; }
  .cell-missing { color: #aaa; text-align: center; }
  td[class~="td-value"] { text-align: center; }
  .print-footer { margin-top: 1rem; padding-top: 0.4rem; border-top: 1px solid #ccc; font-size: 8pt; color: #888; display: flex; justify-content: space-between; }
  @media print { body { margin: 0.8cm; } button { display: none !important; } }
</style>
</head>
<body>
<div class="print-header">
  <div>
    <div class="print-header__title">Kumulativer Laborbefund</div>
    ${patientLine ? `<div class="print-header__patient">${patientLine}</div>` : ''}
  </div>
  <div class="print-header__date">Ausdruck: ${printDate}</div>
</div>
<table>
  <thead>
    <tr>
      <th class="th-param">Parameter</th>
      ${dateHeaders}
      <th class="th-unit">Einheit</th>
      <th class="th-ref">${normalwerteLabel}</th>
    </tr>
  </thead>
  <tbody>${tbodyHtml}</tbody>
</table>
<div class="print-footer">
  <span>psychiatry-ink — Kumulativer Laborbefund</span>
  <span>${printDate}</span>
</div>
<script>
  window.addEventListener('load', function() { window.print(); });
  window.addEventListener('afterprint', function() { window.close(); });
</script>
</body>
</html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
  }, [sorted, categoryGroups, matrix, unitTexts, refTexts, normalwerteLabel, caseId])

  // ── KI Verlaufsanalyse ────────────────────────────────────────────────────

  const formatCumulativeForPrompt = useCallback((): string => {
    if (sorted.length === 0) return ''
    const firstDate = formatDate(sorted[0].date)
    const lastDate = formatDate(sorted[sorted.length - 1].date)
    const dateHeaders = sorted.map((b) => formatDate(b.date))

    const lines: string[] = []
    lines.push('VERLAUFSANALYSE – Kumulativer Laborbefund')
    lines.push(`Zeitraum: ${firstDate} – ${lastDate} (${sorted.length} Befunde)`)
    lines.push('')

    // Build fixed-width columns
    const paramW = Math.min(32, Math.max(16, ...Object.keys(matrix).map((n) => n.length)))
    const unitW = 10
    const refW = 16
    const valW = 14

    const sep = [
      '-'.repeat(paramW),
      '-'.repeat(unitW),
      '-'.repeat(refW),
      ...dateHeaders.map(() => '-'.repeat(valW)),
    ].join('-+-')
    const header = [
      'Parameter'.padEnd(paramW),
      'Einheit'.padEnd(unitW),
      'Referenz'.padEnd(refW),
      ...dateHeaders.map((d) => d.padEnd(valW)),
    ].join(' | ')
    lines.push(header)
    lines.push(sep)

    for (const group of categoryGroups) {
      lines.push(`\n[${group.label}]`)
      for (const name of group.paramNames) {
        const row = matrix[name]
        const unit = unitTexts[name] ?? ''
        const ref = refTexts[name] ?? ''
        const values = sorted.map((_, i) => {
          const v = row?.[i]
          if (!v) return '—'
          return v.isAbnormal ? `${v.value} ⚠` : v.value
        })
        const line = [
          name.padEnd(paramW),
          unit.padEnd(unitW),
          ref.padEnd(refW),
          ...values.map((val) => val.padEnd(valW)),
        ].join(' | ')
        lines.push(line)
      }
    }
    return lines.join('\n')
  }, [sorted, categoryGroups, matrix, unitTexts, refTexts])

  const handleKiVerlaufsanalyse = useCallback(async () => {
    if (kiStatus === 'loading' || sorted.length < 2) return
    setKiStatus('loading')
    setKiText(null)
    setKiError(null)
    setKiSavedId(null)
    setKiSavedText(null)
    setKiSavedOpen(false)
    try {
      const cumulativeTable = formatCumulativeForPrompt()
      const clinicalContext = caseId ? gatherClinicalContext(caseId) : ''
      const verlaufSection = [
        'VERLAUFSANALYSE:',
        'Analysiere bitte alle Laborwerte im zeitlichen Verlauf (Verlaufsanalyse/Longitudinalanalyse). Kommentiere insbesondere:',
        '- Trends über Zeit (Verbesserungen, Verschlechterungen)',
        '- Persistente oder zunehmende Normabweichungen',
        '- Neu aufgetretene oder verschwundene pathologische Befunde',
        '- Klinisch relevante Muster und deren zeitliche Entwicklung',
        '- Dringenden Handlungsbedarf aufgrund des Verlaufs',
        '',
        cumulativeTable,
      ].join('\n')
      const userPrompt = clinicalContext
        ? `${clinicalContext}\n\n${verlaufSection}`
        : verlaufSection
      const aiText = await callAiGenerate(KI_ANALYSE_SYSTEM_PROMPT, userPrompt, caseId)
      setKiText(aiText.trim())
      setKiStatus('done')
    } catch {
      setKiError('KI-Verlaufsanalyse fehlgeschlagen. Bitte versuche es erneut.')
      setKiStatus('error')
    }
  }, [kiStatus, sorted, formatCumulativeForPrompt, caseId])

  const handleKiModalAccept = useCallback(() => {
    if (!kiText) return
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    const title = `KI-Verlaufsanalyse: Labor ${dd}.${mm}.${yyyy}`
    const entry = appendDokument(caseId ?? '', {
      category: 'laborbefunde',
      title,
      content: kiText,
      date: today.toISOString(),
      source: 'ai-accepted',
      pageType: 'labor-ki-verlauf',
      sectionLabel: 'KI-Verlaufsanalyse',
    })
    showNotionToast('KI-Verlaufsanalyse in Dokumente gespeichert')
    setKiSavedId(entry.id)
    setKiSavedText(kiText)
    setKiSavedOpen(false)
    setKiText(null)
    setKiStatus('idle')
  }, [kiText, caseId])

  const handleKiModalReject = useCallback(() => {
    setKiText(null)
    setKiStatus('idle')
  }, [])

  const handleKiSavedCopy = useCallback(() => {
    if (!kiSavedText) return
    navigator.clipboard.writeText(kiSavedText).then(() => {
      showNotionToast('Verlaufsanalyse kopiert')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = kiSavedText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showNotionToast('Verlaufsanalyse kopiert')
    })
  }, [kiSavedText])

  const handleKiSavedDelete = useCallback(() => {
    if (!kiSavedId) return
    if (!window.confirm('KI-Verlaufsanalyse löschen?')) return
    deleteDokument(caseId ?? '', kiSavedId)
    setKiSavedId(null)
    setKiSavedText(null)
    setKiSavedOpen(false)
    showNotionToast('KI-Verlaufsanalyse gelöscht')
  }, [caseId, kiSavedId])

  if (sorted.length === 0) {
    return (
      <p className="labor-page__empty-text" style={{ padding: '1.5rem' }}>
        Kein Laborbefund vorhanden
      </p>
    )
  }

  // Total column count for category header colspan
  const totalCols = sorted.length + 3 // param + N dates + einheit + ref

  return (
    <div className="labor-kumulativ">
      <div className="labor-kumulativ__toolbar">
        <button
          type="button"
          className={[
            'icon-action-btn icon-action-btn--bordered',
            copyStatus === 'done' ? 'icon-action-btn--success' : '',
          ].join(' ').trim()}
          onClick={handleCopyTsv}
          title={copyStatus === 'done' ? t('laborKumulativCopied') : t('laborKumulativCopy')}
          aria-label={copyStatus === 'done' ? t('laborKumulativCopied') : t('laborKumulativCopy')}
        >
          {copyStatus === 'done' ? <Check strokeWidth={1.75} /> : <Clipboard strokeWidth={1.75} />}
        </button>
        <button
          type="button"
          className="icon-action-btn icon-action-btn--bordered"
          onClick={handlePrint}
          title={t('laborKumulativPrint')}
          aria-label={t('laborKumulativPrint')}
        >
          <Printer strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={[
            'labor-kumulativ__tool-btn labor-kumulativ__tool-btn--ki',
            kiStatus === 'loading' ? 'labor-kumulativ__tool-btn--loading' : '',
          ].join(' ').trim()}
          onClick={handleKiVerlaufsanalyse}
          disabled={kiStatus === 'loading' || sorted.length < 2}
          title={sorted.length < 2 ? 'Mindestens 2 Befunde für Verlaufsanalyse erforderlich' : 'Alle Befunde mit KI analysieren (Verlaufsanalyse)'}
        >
          🤖
          <span>{kiStatus === 'loading' ? 'KI analysiert…' : 'KI Verlaufsanalyse'}</span>
        </button>
      </div>

      {/* KI error */}
      {kiStatus === 'error' && kiError && (
        <p className="labor-paste-zone__ki-error" style={{ margin: '0.5rem 0.75rem' }}>{kiError}</p>
      )}

      {/* Saved KI Verlaufsanalyse inline section */}
      {kiSavedId && kiSavedText && (
        <div className="labor-ki-saved labor-kumulativ__ki-saved">
          <div className="labor-ki-saved__header">
            <button
              type="button"
              className="labor-ki-saved__toggle"
              onClick={() => setKiSavedOpen((o) => !o)}
              aria-expanded={kiSavedOpen}
            >
              <span className="labor-ki-saved__chevron">{kiSavedOpen ? '▾' : '▶'}</span>
              🤖 KI-Verlaufsanalyse
            </button>
            <span className="labor-ki-saved__badge">
              <Check size={12} /> In Dokumente gespeichert
            </span>
            <div className="labor-ki-saved__actions">
              <button
                type="button"
                className="labor-ki-saved__icon-btn"
                onClick={handleKiSavedCopy}
                title="Verlaufsanalyse kopieren"
                aria-label="Verlaufsanalyse kopieren"
              >
                <Clipboard size={14} />
              </button>
              <button
                type="button"
                className="labor-ki-saved__icon-btn labor-ki-saved__icon-btn--delete"
                onClick={handleKiSavedDelete}
                title="Verlaufsanalyse löschen"
                aria-label="Verlaufsanalyse löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          {kiSavedOpen && (
            <p className="labor-ki-saved__text">{kiSavedText}</p>
          )}
        </div>
      )}

      {/* KI analysis result modal */}
      {kiStatus === 'done' && kiText && (
        <KiAnalyseModal
          text={kiText}
          title="KI-Verlaufsanalyse"
          onAccept={handleKiModalAccept}
          onReject={handleKiModalReject}
          onCopy={() => {
            navigator.clipboard.writeText(kiText).catch(() => {
              const ta = document.createElement('textarea')
              ta.value = kiText
              document.body.appendChild(ta)
              ta.select()
              document.execCommand('copy')
              document.body.removeChild(ta)
            })
            showNotionToast('Verlaufsanalyse kopiert')
          }}
        />
      )}

      <div className="labor-kumulativ__scroll-wrap">
        <table className="labor-kumulativ__table">
          <thead>
            <tr className="labor-kumulativ__head-row">
              {/* Sticky left: param name header */}
              <th className="labor-kumulativ__th labor-kumulativ__th--param labor-kumulativ__sticky-left">
                Parameter
              </th>
              {/* Date columns */}
              {sorted.map((b, i) => (
                <th key={b.id} className="labor-kumulativ__th labor-kumulativ__th--date">
                  <span className="labor-kumulativ__date-label">{formatDate(b.date)}</span>
                  {b.label && (
                    <span className="labor-kumulativ__date-sublabel">{b.label}</span>
                  )}
                  {i === sorted.length - 1 && (
                    <span className="labor-kumulativ__newest-badge">neu</span>
                  )}
                </th>
              ))}
              {/* Sticky second-from-right: Einheit */}
              <th className="labor-kumulativ__th labor-kumulativ__th--unit labor-kumulativ__sticky-right-2">
                {t('labUnit')}
              </th>
              {/* Sticky right: Normalwerte */}
              <th className="labor-kumulativ__th labor-kumulativ__th--ref labor-kumulativ__sticky-right">
                {normalwerteLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {categoryGroups.map((group) => (
              <Fragment key={group.id}>
                {/* Category group header row */}
                <tr className="labor-kumulativ__cat-header-row">
                  <td
                    className="labor-kumulativ__cat-header-cell"
                    colSpan={totalCols}
                  >
                    {group.label}
                  </td>
                </tr>
                {group.paramNames.map((name) => {
                  const row = matrix[name]
                  const hasAnyAbnormal = row?.some((v) => v?.isAbnormal)
                  return (
                    <tr
                      key={name}
                      className={[
                        'labor-kumulativ__row',
                        hasAnyAbnormal ? 'labor-kumulativ__row--has-abnormal' : '',
                      ].join(' ').trim()}
                    >
                      {/* Param name — sticky left */}
                      <td className="labor-kumulativ__td labor-kumulativ__td--param labor-kumulativ__sticky-left">
                        {name}
                      </td>
                      {/* Values per befund */}
                      {sorted.map((b, i) => {
                        const val = row?.[i]
                        return (
                          <td
                            key={b.id}
                            className={[
                              'labor-kumulativ__td labor-kumulativ__td--value',
                              val?.isAbnormal ? 'labor-kumulativ__td--abnormal' : '',
                            ].join(' ').trim()}
                          >
                            {val ? (
                              <span className="labor-kumulativ__val">{val.value}</span>
                            ) : (
                              <span className="labor-kumulativ__missing">—</span>
                            )}
                          </td>
                        )
                      })}
                      {/* Einheit — sticky second-from-right */}
                      <td className="labor-kumulativ__td labor-kumulativ__td--unit labor-kumulativ__sticky-right-2">
                        {unitTexts[name] ?? ''}
                      </td>
                      {/* Normalwerte — sticky right */}
                      <td className="labor-kumulativ__td labor-kumulativ__td--ref labor-kumulativ__sticky-right">
                        {refTexts[name] ?? '–'}
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Verlauf overview — auto-generated trend graphs (small multiples)
// ---------------------------------------------------------------------------

interface VerlaufPoint {
  date: string
  shortDate: string
  value: number
  isAbnormal: boolean
}

interface VerlaufSeries {
  name: string
  categoryId: string
  categoryLabel: string
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
  points: VerlaufPoint[]
  hasAbnormal: boolean
}

/** Trim trailing zeros for compact value display. */
function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n)
  const fixed = n.toFixed(Math.abs(n) < 1 ? 3 : 2)
  return fixed.replace(/\.?0+$/, '')
}

/**
 * Collapse all befunde into one time-series per numeric parameter.
 * Only parameters with at least two numeric data points are returned, since a
 * single point cannot form a trend line. Reference range / unit prefer the most
 * recent befund (ascending iteration → last write wins).
 */
function buildVerlaufSeries(befunde: LaborBefund[]): VerlaufSeries[] {
  const sorted = [...befunde].sort((a, b) => a.date.localeCompare(b.date))
  const map = new Map<string, VerlaufSeries>()
  const order: string[] = []
  for (const b of sorted) {
    for (const cat of b.categories) {
      for (const v of cat.values) {
        if (v.numericValue === undefined || Number.isNaN(v.numericValue)) continue
        const key = `${cat.label}\u0000${v.name}`
        let series = map.get(key)
        if (!series) {
          series = {
            name: v.name,
            categoryId: cat.id || cat.label,
            categoryLabel: cat.label,
            unit: v.unit ?? '',
            points: [],
            hasAbnormal: false,
          }
          map.set(key, series)
          order.push(key)
        }
        series.points.push({
          date: b.date,
          shortDate: shortDate(b.date),
          value: v.numericValue,
          isAbnormal: v.isAbnormal ?? false,
        })
        if (v.isAbnormal) series.hasAbnormal = true
        if (v.unit) series.unit = v.unit
        if (v.refMin !== undefined) series.refMin = v.refMin
        if (v.refMax !== undefined) series.refMax = v.refMax
        if (v.refText) series.refText = v.refText
      }
    }
  }
  return order.map((k) => map.get(k)!).filter((s) => s.points.length >= 2)
}

/** Read the app accent colour as a concrete value for recharts strokes. */
function useAccentColor(): string {
  const [accent, setAccent] = useState('#8A5A2B')
  useEffect(() => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      if (v) setAccent(v)
    } catch {
      // keep fallback
    }
  }, [])
  return accent
}

function VerlaufCard({
  series,
  accent,
  rationale,
  isSpiegel = false,
}: {
  series: VerlaufSeries
  accent: string
  rationale?: string
  isSpiegel?: boolean
}) {
  const data = useMemo(
    () => series.points.map((p) => ({ date: p.shortDate, value: p.value, abn: p.isAbnormal })),
    [series],
  )
  const first = series.points[0]
  const last = series.points[series.points.length - 1]
  const delta = last.value - first.value
  const trendDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const hasBand = series.refMin !== undefined && series.refMax !== undefined

  return (
    <div
      className={[
        'labor-verlauf-card',
        series.hasAbnormal ? 'labor-verlauf-card--abnormal' : '',
      ].join(' ').trim()}
    >
      <div className="labor-verlauf-card__head">
        <div className="labor-verlauf-card__titles">
          <span className="labor-verlauf-card__name" title={series.name}>{series.name}</span>
          {isSpiegel ? (
            <span className="labor-verlauf-card__badge" title="Medikamentenspiegel — immer angezeigt">
              Spiegel
            </span>
          ) : null}
          {series.unit ? <span className="labor-verlauf-card__unit">{series.unit}</span> : null}
        </div>
        <div className="labor-verlauf-card__latest">
          <span
            className={[
              'labor-verlauf-card__latest-val',
              last.isAbnormal ? 'labor-verlauf-card__latest-val--abnormal' : '',
            ].join(' ').trim()}
          >
            {formatNum(last.value)}
          </span>
          <span className={['labor-verlauf-card__trend', `labor-verlauf-card__trend--${trendDir}`].join(' ')}>
            {trendDir === 'up' ? '↑' : trendDir === 'down' ? '↓' : '→'}
            {delta !== 0 ? ` ${delta > 0 ? '+' : ''}${formatNum(delta)}` : ''}
          </span>
        </div>
      </div>
      <div className="labor-verlauf-card__chart">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 14, right: 14, bottom: 0, left: -10 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e5e3dd' }} />
            <YAxis tick={{ fontSize: 10 }} width={36} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(val: any) => [`${val} ${series.unit}`.trim(), series.name]}
            />
            {hasBand ? (
              <ReferenceArea
                y1={series.refMin}
                y2={series.refMax}
                fill="#22c55e"
                fillOpacity={0.09}
                ifOverflow="extendDomain"
              />
            ) : null}
            {series.refMin !== undefined ? (
              <ReferenceLine y={series.refMin} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.55} />
            ) : null}
            {series.refMax !== undefined ? (
              <ReferenceLine y={series.refMax} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.55} />
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
              stroke={accent}
              strokeWidth={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(dotProps: any) => {
                const { cx, cy, index } = dotProps as { cx: number; cy: number; index: number }
                const abn = data[index]?.abn === true
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill={abn ? '#ef4444' : accent}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )
              }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {rationale ? (
        <div className="labor-verlauf-card__rationale" title={rationale}>{rationale}</div>
      ) : null}
      {series.refText ? <div className="labor-verlauf-card__ref">Ref: {series.refText}</div> : null}
    </div>
  )
}

/** Active substance names from the case's current medication plan. */
function readActiveSubstances(caseId: string): string[] {
  try {
    const planState = loadMedicationPlanState(caseId)
    if (!planState) return []
    const currentPlan =
      planState.plans.find((p) => p.id === planState.currentPlanId) ?? planState.plans[0]
    if (!currentPlan) return []
    return currentPlan.medications
      .filter((m) => isMedicationVisible(m) && ACTIVE_MED_STATUSES.has(m.status))
      .map((m) => m.substance.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

interface ClassifiedSeries {
  series: VerlaufSeries
  isSpiegel: boolean
  isRelevant: boolean
  priority: number
  rationaleCaption: string
}

function LaborVerlaufOverview({ befunde, caseId }: { befunde: LaborBefund[]; caseId: string }) {
  const [onlyAbnormal, setOnlyAbnormal] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const accent = useAccentColor()

  const allSeries = useMemo(() => buildVerlaufSeries(befunde), [befunde])

  const activeSubstances = useMemo(() => readActiveSubstances(caseId), [caseId])
  const relevance = useMemo(() => buildLabRelevance(activeSubstances), [activeSubstances])

  const classified = useMemo<ClassifiedSeries[]>(
    () =>
      allSeries.map((s) => {
        const c = classifyAnalyte(s.name, relevance, s.categoryLabel, s.categoryId)
        return {
          series: s,
          isSpiegel: c.isSpiegel,
          isRelevant: c.isRelevant,
          priority: c.priority,
          rationaleCaption: c.isSpiegel
            ? 'Medikamentenspiegel — immer angezeigt'
            : formatRationaleCaption(c.rationale),
        }
      }),
    [allSeries, relevance],
  )

  const classifiedByName = useMemo(() => {
    const m = new Map<VerlaufSeries, ClassifiedSeries>()
    for (const c of classified) m.set(c.series, c)
    return m
  }, [classified])

  const relevantList = useMemo(
    () =>
      classified
        .filter((c) => c.isRelevant)
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority
          return a.series.name.localeCompare(b.series.name)
        }),
    [classified],
  )

  const hasCuration = relevantList.length > 0
  // Never permanently hide values: when nothing is relevant (no recognised
  // medication and no Spiegel), fall back to the full set automatically.
  const effectiveShowAll = showAll || !hasCuration

  const befundeCount = befunde.length

  // Category-grouped view for "show all" mode (original behaviour).
  const groups = useMemo(() => {
    const base = onlyAbnormal ? allSeries.filter((s) => s.hasAbnormal) : allSeries
    const m = new Map<string, { label: string; items: VerlaufSeries[] }>()
    const order: string[] = []
    for (const s of base) {
      if (!m.has(s.categoryLabel)) {
        m.set(s.categoryLabel, { label: s.categoryLabel, items: [] })
        order.push(s.categoryLabel)
      }
      m.get(s.categoryLabel)!.items.push(s)
    }
    for (const k of order) {
      m.get(k)!.items.sort((a, b) => {
        if (a.hasAbnormal !== b.hasAbnormal) return a.hasAbnormal ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }
    return order.map((k) => m.get(k)!)
  }, [allSeries, onlyAbnormal])

  const relevantVisible = useMemo(
    () => (onlyAbnormal ? relevantList.filter((c) => c.series.hasAbnormal) : relevantList),
    [relevantList, onlyAbnormal],
  )

  const baseScope = effectiveShowAll ? allSeries : relevantList.map((c) => c.series)
  const abnormalCount = baseScope.filter((s) => s.hasAbnormal).length

  const dateRange = useMemo(() => {
    if (befundeCount === 0) return ''
    const dates = befunde.map((b) => b.date).sort()
    const start = formatDate(dates[0])
    const end = formatDate(dates[dates.length - 1])
    return start === end ? start : `${start} – ${end}`
  }, [befunde, befundeCount])

  if (befundeCount === 0) {
    return (
      <div className="labor-page__empty">
        <p className="labor-page__empty-text">
          Noch keine Laborbefunde — füge einen Befund hinzu, um Verlaufsgrafiken zu sehen.
        </p>
      </div>
    )
  }

  if (allSeries.length === 0) {
    return (
      <div className="labor-page__empty">
        <p className="labor-page__empty-text">
          Mindestens zwei Laborbefunde mit numerischen Werten sind nötig, um Verlaufsgrafiken zu erstellen.
          {befundeCount === 1 ? ' Aktuell ist nur ein Befund vorhanden.' : ''}
        </p>
      </div>
    )
  }

  const subtitle = effectiveShowAll
    ? `${allSeries.length} Parameter · ${befundeCount} Befunde · ${dateRange}`
    : `${relevantList.length} relevante Parameter · ${befundeCount} Befunde · ${dateRange}`

  const drugContext =
    relevance.recognizedDrugs.length > 0
      ? `Kuratiert für aktuelle Medikation: ${relevance.recognizedDrugs.join(', ')}`
      : hasCuration
        ? 'Medikamentenspiegel werden immer angezeigt.'
        : 'Keine medikationsbasierte Relevanz erkannt — alle Parameter werden angezeigt.'

  return (
    <div className="labor-verlauf">
      <header className="labor-verlauf__header">
        <div className="labor-verlauf__heading">
          <h2 className="labor-verlauf__title">Laborverlauf</h2>
          <p className="labor-verlauf__subtitle">{subtitle}</p>
          <p className="labor-verlauf__context">{drugContext}</p>
        </div>
        <div className="labor-verlauf__controls">
          {abnormalCount > 0 ? (
            <label className="labor-verlauf__filter">
              <input
                type="checkbox"
                checked={onlyAbnormal}
                onChange={(e) => setOnlyAbnormal(e.target.checked)}
              />
              <span>Nur auffällige ({abnormalCount})</span>
            </label>
          ) : null}
          {hasCuration && allSeries.length > relevantList.length ? (
            <button
              type="button"
              className="labor-verlauf__showall"
              onClick={() => setShowAll((v) => !v)}
              aria-pressed={showAll}
            >
              {showAll ? 'Nur relevante anzeigen' : `Alle Werte anzeigen (${allSeries.length})`}
            </button>
          ) : null}
        </div>
      </header>

      {effectiveShowAll ? (
        groups.length === 0 ? (
          <p className="labor-page__empty-text" style={{ padding: '1.5rem 0' }}>
            Keine auffälligen Parameter im Verlauf.
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="labor-verlauf__group">
              <h3 className="labor-verlauf__group-title">{g.label}</h3>
              <div className="labor-verlauf__grid">
                {g.items.map((s) => {
                  const c = classifiedByName.get(s)
                  return (
                    <VerlaufCard
                      key={`${g.label}\u0000${s.name}`}
                      series={s}
                      accent={accent}
                      isSpiegel={c?.isSpiegel ?? false}
                      rationale={c?.isRelevant ? c.rationaleCaption : undefined}
                    />
                  )
                })}
              </div>
            </section>
          ))
        )
      ) : relevantVisible.length === 0 ? (
        <p className="labor-page__empty-text" style={{ padding: '1.5rem 0' }}>
          Keine auffälligen relevanten Parameter im Verlauf.
        </p>
      ) : (
        <section className="labor-verlauf__group">
          <div className="labor-verlauf__grid">
            {relevantVisible.map((c) => (
              <VerlaufCard
                key={`relevant\u0000${c.series.categoryLabel}\u0000${c.series.name}`}
                series={c.series}
                accent={accent}
                isSpiegel={c.isSpiegel}
                rationale={c.rationaleCaption || undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main LaborPage
// ---------------------------------------------------------------------------

interface LaborPageProps {
  caseId: string
  onCreatePatient?: () => void
  /** Whether a patient is already linked to this case. Hides the assignment UI when true. */
  hasPatient?: boolean
  /** When true, section nav and befund lists live in the global case sidebar. */
  useExternalSidebar?: boolean
}

export function LaborPage({ caseId, onCreatePatient, hasPatient = false, useExternalSidebar = false }: LaborPageProps) {
  const { t } = useTranslation()
  const externalNav = useDiagnosticsSectionNavOptional()
  const isExternal = useExternalSidebar && externalNav != null

  const [localDiagnosticsSection, setLocalDiagnosticsSection] = useState<DiagnosticsSectionId>(() => {
    const pref = consumeDiagnosticsSectionPref(caseId)
    return pref === 'befunde' ? 'befunde' : 'labor'
  })
  const [localViewMode, setLocalViewMode] = useState<'einzeln' | 'kumulativ' | 'verlauf'>('einzeln')
  const [localPasteZoneOpen, setLocalPasteZoneOpen] = useState(false)
  const localLabor = useLaborBefundeList(caseId)
  const localDiagnostikBefunde = useDiagnostikBefunde(caseId)

  const diagnosticsSection = isExternal ? externalNav.diagnosticsSection : localDiagnosticsSection
  const setDiagnosticsSection = isExternal ? externalNav.setDiagnosticsSection : setLocalDiagnosticsSection
  const viewMode = isExternal ? externalNav.viewMode : localViewMode
  const setViewMode = isExternal ? externalNav.setViewMode : setLocalViewMode
  const pasteZoneOpen = isExternal ? externalNav.pasteZoneOpen : localPasteZoneOpen
  const setPasteZoneOpen = isExternal ? externalNav.setPasteZoneOpen : setLocalPasteZoneOpen
  const befunde = isExternal ? externalNav.labor.befunde : localLabor.befunde
  const setBefunde = isExternal ? externalNav.labor.setBefunde : localLabor.setBefunde
  const selectedId = isExternal ? externalNav.labor.selectedId : localLabor.selectedId
  const setSelectedId = isExternal ? externalNav.labor.setSelectedId : localLabor.setSelectedId
  const diagnostikBefunde = isExternal ? externalNav.diagnostikBefunde : localDiagnostikBefunde
  const [pendingGraphCat, setPendingGraphCat] = useState<LaborCategory | null>(null)
  const [graphConfig, setGraphConfig] = useState<{
    category: LaborCategory
    params: string[]
  } | null>(null)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Re-analysis state for saved befunde
  const [kiReStatus, setKiReStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [kiReText, setKiReText] = useState<string | null>(null)
  const [kiReError, setKiReError] = useState<string | null>(null)
  const [kiReSavedId, setKiReSavedId] = useState<string | null>(null)
  const [kiReSavedText, setKiReSavedText] = useState<string | null>(null)
  const [kiReSavedOpen, setKiReSavedOpen] = useState(false)

  useEffect(() => {
    if (!pasteZoneOpen) return
    const id = window.setTimeout(() => pasteTextareaRef.current?.focus(), 60)
    return () => window.clearTimeout(id)
  }, [pasteZoneOpen])

  // Reset re-analysis state whenever the selected befund changes
  useEffect(() => {
    setKiReStatus('idle')
    setKiReText(null)
    setKiReError(null)
    setKiReSavedId(null)
    setKiReSavedText(null)
    setKiReSavedOpen(false)
  }, [selectedId])

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

      // Mirror the befund into the Dokumente archive (idempotent via befund id)
      syncLaborDokumente(caseId, t('laborDocumentTitle'))

      showNotionToast('Laborbefund gespeichert')
      setPasteZoneOpen(false)
    },
    [caseId, t],
  )

  const handleDelete = useCallback(() => {
    if (!selectedId) return
    if (!window.confirm('Laborbefund löschen?')) return
    deleteBefund(caseId, selectedId)
    const next = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))
    setBefunde(next)
    setSelectedId(next[0]?.id ?? null)
  }, [caseId, selectedId])

  const handleCopy = useCallback(() => {
    if (!selectedBefund) return
    const lines: string[] = [
      `Laborbefund ${selectedBefund.date}${selectedBefund.label ? ' — ' + selectedBefund.label : ''}`,
      '',
    ]
    for (const cat of selectedBefund.categories) {
      lines.push(`${cat.label}:`)
      for (const v of cat.values) {
        const ref = v.refText ? `  Ref: ${v.refText}` : ''
        const flag = v.isAbnormal ? ' !' : ''
        lines.push(`  ${v.name}: ${v.value} ${v.unit}${ref}${flag}`)
      }
      lines.push('')
    }
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      showNotionToast('Befund kopiert')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showNotionToast('Befund kopiert')
    })
  }, [selectedBefund])

  const handlePrint = useCallback(() => {
    if (!selectedBefund) return
    const meta = getCaseMeta(caseId)
    const patientLine = [meta?.localName, meta?.localAge ? `(${meta.localAge} J.)` : '']
      .filter(Boolean).join(' ').trim()
    const printDate = new Date().toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    const title = `Laborbefund ${selectedBefund.date}${selectedBefund.label ? ' — ' + selectedBefund.label : ''}`

    let tbodyHtml = ''
    for (const cat of selectedBefund.categories) {
      const colSpan = 5
      tbodyHtml += `<tr class="cat-header"><td colspan="${colSpan}">${cat.label}</td></tr>`
      for (const v of cat.values) {
        const rowCls = v.isAbnormal ? ' class="row-abnormal"' : ''
        const cellCls = v.isAbnormal ? ' class="cell-abnormal"' : ''
        const flag = v.isAbnormal ? '<span class="flag-abn">↑↓</span>' : ''
        tbodyHtml += `<tr${rowCls}><td class="td-param">${v.name}</td><td${cellCls}>${v.value}${flag}</td><td class="td-unit">${v.unit}</td><td class="td-ref">${v.refText ?? '–'}</td><td class="td-flag">${v.isAbnormal ? '!' : ''}</td></tr>`
      }
    }

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a18; background: #fff; }
  .print-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 0.6rem 1rem 0.5rem; border-bottom: 2px solid #333; margin-bottom: 0.6rem; }
  .print-header__title { font-size: 13pt; font-weight: 700; }
  .print-header__patient { font-size: 9.5pt; color: #444; margin-top: 2px; }
  .print-header__date { font-size: 8.5pt; color: #666; text-align: right; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
  th, td { border: 1px solid #d0d0cc; padding: 3px 6px; vertical-align: middle; }
  thead th { background: #f0f0ec; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.03em; color: #555; }
  .th-param { text-align: left; min-width: 160px; }
  .th-val { text-align: left; min-width: 70px; }
  .th-unit, .th-ref { text-align: left; }
  .th-flag { text-align: center; width: 28px; }
  .td-param { font-weight: 500; }
  .td-unit, .td-ref { color: #666; font-size: 8.5pt; }
  .td-flag { text-align: center; font-weight: 700; color: #c0392b; font-size: 9pt; }
  .cat-header td { background: #f4f4f0; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #777; padding: 3px 6px; border-top: 2px solid #ccc; }
  .row-abnormal { background: #fff5f5; }
  .cell-abnormal { color: #c0392b; font-weight: 700; }
  .flag-abn { display: none; }
  .print-footer { margin-top: 1rem; padding-top: 0.4rem; border-top: 1px solid #ccc; font-size: 8pt; color: #888; display: flex; justify-content: space-between; }
  @media print { body { margin: 0.8cm; } button { display: none !important; } }
</style>
</head>
<body>
<div class="print-header">
  <div>
    <div class="print-header__title">${title}</div>
    ${patientLine ? `<div class="print-header__patient">${patientLine}</div>` : ''}
  </div>
  <div class="print-header__date">Ausdruck: ${printDate}</div>
</div>
<table>
  <thead>
    <tr>
      <th class="th-param">Parameter</th>
      <th class="th-val">Wert</th>
      <th class="th-unit">Einheit</th>
      <th class="th-ref">Referenz</th>
      <th class="th-flag">⚑</th>
    </tr>
  </thead>
  <tbody>${tbodyHtml}</tbody>
</table>
<div class="print-footer">
  <span>psychiatry-ink — Laborbefund</span>
  <span>${printDate}</span>
</div>
<script>
  window.addEventListener('load', function() { window.print(); });
  window.addEventListener('afterprint', function() { window.close(); });
</script>
</body>
</html>`

    const w = window.open('', '_blank', 'width=860,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
  }, [selectedBefund, caseId])

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

  const handleReAnalyze = useCallback(async () => {
    if (!selectedBefund || kiReStatus === 'loading') return
    setKiReStatus('loading')
    setKiReText(null)
    setKiReError(null)
    setKiReSavedId(null)
    try {
      const labSection = selectedBefund.categories.length > 0
        ? selectedBefund.categories
            .map((cat) => {
              const values = cat.values
                .map((v) => {
                  const ref = v.refText ? ` (Ref: ${v.refText})` : ''
                  const flag = v.isAbnormal ? ' ⚠' : ''
                  return `  ${v.name}: ${v.value} ${v.unit}${ref}${flag}`
                })
                .join('\n')
              return `${cat.label}:\n${values}`
            })
            .join('\n\n')
        : selectedBefund.rawText
      const clinicalContext = gatherClinicalContext(caseId)
      const userPrompt = clinicalContext
        ? `${clinicalContext}\n\nLABORWERTE:\n${labSection}`
        : `LABORWERTE:\n${labSection}`
      const aiText = await callAiGenerate(KI_ANALYSE_SYSTEM_PROMPT, userPrompt, caseId)
      setKiReText(aiText.trim())
      setKiReStatus('done')
    } catch {
      setKiReError('KI-Analyse fehlgeschlagen. Bitte versuche es erneut.')
      setKiReStatus('error')
    }
  }, [selectedBefund, kiReStatus, caseId])

  const saveKiAnalysisDokument = useCallback((text: string, befund: typeof selectedBefund) => {
    if (!befund) return null
    const befundTitle = befund.label
      ? `${befund.label} (${formatDate(befund.date)})`
      : formatDate(befund.date)
    const title = `KI-Analyse: ${befundTitle}`
    const entry = appendDokument(caseId, {
      category: 'laborbefunde',
      title,
      content: text,
      date: new Date().toISOString(),
      source: 'ai-accepted',
      pageType: 'labor-ki-analyse',
      sectionLabel: 'KI-Analyse',
    })
    showNotionToast('KI-Analyse in Dokumente gespeichert')
    return entry.id
  }, [caseId])

  const handleReAnalyzeAccept = useCallback(() => {
    if (!kiReText) return
    const savedId = saveKiAnalysisDokument(kiReText, selectedBefund)
    if (savedId) {
      setKiReSavedId(savedId)
      setKiReSavedText(kiReText)
      setKiReSavedOpen(false)
    }
    setKiReText(null)
    setKiReStatus('idle')
  }, [kiReText, saveKiAnalysisDokument, selectedBefund])

  const handleReAnalyzeReject = useCallback(() => {
    setKiReText(null)
    setKiReStatus('idle')
  }, [])

  const handleKiPasteAccept = useCallback((text: string, date: string, label?: string) => {
    const targetBefund = selectedBefund ?? ({ label, date } as LaborBefund)
    const savedId = saveKiAnalysisDokument(text, targetBefund)
    if (savedId) {
      setKiReSavedId(savedId)
      setKiReSavedText(text)
      setKiReSavedOpen(false)
    }
  }, [saveKiAnalysisDokument, selectedBefund])

  const handleKiSavedCopy = useCallback(() => {
    if (!kiReSavedText) return
    navigator.clipboard.writeText(kiReSavedText).then(() => {
      showNotionToast('Analyse kopiert')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = kiReSavedText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showNotionToast('Analyse kopiert')
    })
  }, [kiReSavedText])

  const handleKiSavedDelete = useCallback(() => {
    if (!kiReSavedId) return
    if (!window.confirm('KI-Analyse löschen?')) return
    deleteDokument(caseId, kiReSavedId)
    setKiReSavedId(null)
    setKiReSavedText(null)
    setKiReSavedOpen(false)
    showNotionToast('KI-Analyse gelöscht')
  }, [caseId, kiReSavedId])

  return (
    <div className="labor-page">
      <aside className="labor-page__sidebar">
        {diagnosticsSection === 'labor' ? (
          <>
            <button
              type="button"
              className={[
                'labor-page__add-btn',
                pasteZoneOpen ? 'labor-page__add-btn--active' : '',
              ].join(' ').trim()}
              onClick={() => setPasteZoneOpen(!pasteZoneOpen)}
              aria-expanded={pasteZoneOpen}
            >
              {pasteZoneOpen ? '×' : '+'} {t('laborAddBefund')}
            </button>

            <div className="labor-view-toggle" role="group" aria-label="Ansicht">
              <button
                type="button"
                className={[
                  'labor-view-toggle__btn',
                  viewMode === 'einzeln' ? 'labor-view-toggle__btn--active' : '',
                ].join(' ').trim()}
                onClick={() => setViewMode('einzeln')}
              >
                {t('laborViewEinzeln')}
              </button>
              <button
                type="button"
                className={[
                  'labor-view-toggle__btn',
                  viewMode === 'kumulativ' ? 'labor-view-toggle__btn--active' : '',
                ].join(' ').trim()}
                onClick={() => setViewMode('kumulativ')}
              >
                {t('laborViewKumulativ')}
              </button>
              <button
                type="button"
                className={[
                  'labor-view-toggle__btn',
                  viewMode === 'verlauf' ? 'labor-view-toggle__btn--active' : '',
                ].join(' ').trim()}
                onClick={() => setViewMode('verlauf')}
              >
                {t('laborViewVerlauf')}
              </button>
            </div>

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
          </>
        ) : diagnosticsSection === 'befunde' ? (
          <DiagnostikBefundeSidebar
            caseId={caseId}
            records={diagnostikBefunde.records}
            selectedId={diagnostikBefunde.selectedId}
            onSelect={diagnostikBefunde.setSelectedId}
          />
        ) : null}
      </aside>

      {/* Main area */}
      <div className="labor-page__main">
        {!isExternal ? (
        <header className="labor-page__diagnostics-header">
          <div>
            <h1 className="labor-page__diagnostics-title">{t('diagnosticsPageTitle')}</h1>
            <p className="labor-page__diagnostics-subtitle">{t('diagnosticsPageSubtitle')}</p>
          </div>
          <nav className="labor-page__diagnostics-nav" aria-label={t('diagnosticsPageTitle')}>
            {DIAGNOSTICS_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={[
                  'labor-page__diagnostics-tab',
                  section.id === diagnosticsSection ? 'labor-page__diagnostics-tab--active' : '',
                ].join(' ').trim()}
                disabled={!section.enabled}
                aria-current={section.id === diagnosticsSection ? 'page' : undefined}
                title={section.enabled ? undefined : t('diagnosticsSectionComingSoon')}
                onClick={() => section.enabled && setDiagnosticsSection(section.id)}
              >
                <span>{t(section.labelKey)}</span>
                {!section.enabled && (
                  <span className="labor-page__diagnostics-tab-status">
                    {t('diagnosticsSectionComingSoon')}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </header>
        ) : null}

        {diagnosticsSection === 'befunde' ? (
          <DiagnostikBefundeMain
            caseId={caseId}
            records={diagnostikBefunde.records}
            selectedId={diagnostikBefunde.selectedId}
            onSelect={diagnostikBefunde.setSelectedId}
            onRecordsChange={diagnostikBefunde.refresh}
          />
        ) : diagnosticsSection !== 'labor' ? (
          <div className="labor-page__empty">
            <p className="labor-page__empty-text">{t('diagnosticsSectionComingSoon')}</p>
          </div>
        ) : null}

        {/* Inline paste zone — collapsed by default, toggled via "+ Labor hinzufügen" */}
        {diagnosticsSection === 'labor' && pasteZoneOpen && (
          <div className="labor-paste-collapse">
            <button
              type="button"
              className="labor-paste-collapse__close"
              onClick={() => setPasteZoneOpen(false)}
              aria-label={t('dokumenteClose')}
              title={t('dokumenteClose')}
            >
              ×
            </button>
            <LaborPasteZone
              caseId={caseId}
              onSave={handleSaveBefund}
              onKiAnalysisAccept={handleKiPasteAccept}
              textareaRef={pasteTextareaRef}
            />
          </div>
        )}

        {/* Kumulativ view */}
        {diagnosticsSection === 'labor' && viewMode === 'kumulativ' && (
          <KumulativView befunde={befunde} normalwerteLabel={t('laborNormalwerte')} caseId={caseId} />
        )}

        {/* Verlauf view — medication-driven trend graphs (relevant subset + always-on Spiegel) */}
        {diagnosticsSection === 'labor' && viewMode === 'verlauf' && (
          <LaborVerlaufOverview befunde={befunde} caseId={caseId} />
        )}

        {diagnosticsSection === 'labor' && viewMode === 'einzeln' && selectedBefund ? (
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
              <div className="labor-befund-header__actions">
                <button
                  type="button"
                  className="labor-befund-header__action-btn"
                  onClick={handleCopy}
                  title="Befund kopieren"
                >
                  Kopieren
                </button>
                <button
                  type="button"
                  className="labor-befund-header__action-btn"
                  onClick={handlePrint}
                  title="Befund drucken"
                >
                  Drucken
                </button>
                <button
                  type="button"
                  className={[
                    'labor-befund-header__action-btn labor-befund-header__action-btn--ai',
                    kiReStatus === 'loading' ? 'labor-befund-header__action-btn--loading' : '',
                  ].join(' ').trim()}
                  onClick={handleReAnalyze}
                  disabled={kiReStatus === 'loading'}
                  title="Befund mit KI analysieren"
                >
                  {kiReStatus === 'loading' ? '🤖 analysiert…' : '🤖 KI analysieren'}
                </button>
                <button
                  type="button"
                  className="labor-befund-header__delete-btn"
                  onClick={handleDelete}
                  title="Befund löschen"
                >
                  Löschen
                </button>
              </div>
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
                    befundeCount={befunde.length}
                    onPinWidget={handlePinWidget}
                    onShowGraph={setPendingGraphCat}
                  />
                ))}
              </div>
            )}

            {/* KI re-analysis error */}
            {kiReStatus === 'error' && kiReError && (
              <p className="labor-paste-zone__ki-error" style={{ marginTop: '1rem' }}>{kiReError}</p>
            )}

            {/* KI re-analysis modal — shown while result is pending acceptance */}
            {kiReStatus === 'done' && kiReText && (
              <KiAnalyseModal
                text={kiReText}
                title="KI-Analyse"
                onAccept={handleReAnalyzeAccept}
                onReject={handleReAnalyzeReject}
                onCopy={() => {
                  navigator.clipboard.writeText(kiReText).catch(() => {
                    const ta = document.createElement('textarea')
                    ta.value = kiReText
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand('copy')
                    document.body.removeChild(ta)
                  })
                  showNotionToast('Analyse kopiert')
                }}
              />
            )}

            {/* Saved KI analysis inline section */}
            {kiReSavedId && kiReSavedText && (
              <div className="labor-ki-saved">
                <div className="labor-ki-saved__header">
                  <button
                    type="button"
                    className="labor-ki-saved__toggle"
                    onClick={() => setKiReSavedOpen((o) => !o)}
                    aria-expanded={kiReSavedOpen}
                  >
                    <span className="labor-ki-saved__chevron">{kiReSavedOpen ? '▾' : '▶'}</span>
                    🤖 KI-Analyse
                  </button>
                  <span className="labor-ki-saved__badge">
                    <Check size={12} /> In Dokumente gespeichert
                  </span>
                  <div className="labor-ki-saved__actions">
                    <button
                      type="button"
                      className="labor-ki-saved__icon-btn"
                      onClick={handleKiSavedCopy}
                      title="Analyse kopieren"
                      aria-label="Analyse kopieren"
                    >
                      <Clipboard size={14} />
                    </button>
                    <button
                      type="button"
                      className="labor-ki-saved__icon-btn labor-ki-saved__icon-btn--delete"
                      onClick={handleKiSavedDelete}
                      title="Analyse löschen"
                      aria-label="Analyse löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {kiReSavedOpen && (
                  <p className="labor-ki-saved__text">{kiReSavedText}</p>
                )}
              </div>
            )}

            {/* Patient assignment collapsible — only when no patient is linked yet */}
            {!hasPatient && <PatientsZuordnen onCreatePatient={onCreatePatient} />}
          </div>
        ) : diagnosticsSection === 'labor' && viewMode === 'einzeln' ? (
          <div className="labor-page__empty">
            <p className="labor-page__empty-text">
              Laborbefund einfügen oder auswählen
            </p>
            {befunde.length >= 2 && (
              <button
                type="button"
                className="labor-page__empty-cta"
                onClick={() => setViewMode('verlauf')}
              >
                📈 {t('laborViewVerlauf')} anzeigen
              </button>
            )}
          </div>
        ) : null}
      </div>

      {pendingGraphCat && (
        <LaborGraphParamDialog
          category={pendingGraphCat}
          befunde={befunde}
          onConfirm={(params) => {
            setGraphConfig({ category: pendingGraphCat, params })
            setPendingGraphCat(null)
          }}
          onClose={() => setPendingGraphCat(null)}
        />
      )}

      {graphConfig && (
        <GraphModal
          category={graphConfig.category}
          befunde={befunde}
          selectedParams={graphConfig.params}
          onClose={() => setGraphConfig(null)}
          onCloseAndPin={() => {
            const current = loadPinnedWidgets(caseId)
            let anyNew = false
            for (const paramName of graphConfig.params) {
              const alreadyPinned = current.some(
                (w) =>
                  w.parameterName === paramName &&
                  w.categoryLabel === graphConfig.category.label,
              )
              if (!alreadyPinned) {
                current.push({
                  id: crypto.randomUUID(),
                  caseId,
                  parameterName: paramName,
                  categoryLabel: graphConfig.category.label,
                  pinnedAt: new Date().toISOString(),
                })
                anyNew = true
              }
            }
            if (anyNew) savePinnedWidgets(caseId, current)
            setBefunde((prev) => [...prev])
            showNotionToast('Grafik gespeichert')
            setGraphConfig(null)
          }}
        />
      )}
    </div>
  )
}
