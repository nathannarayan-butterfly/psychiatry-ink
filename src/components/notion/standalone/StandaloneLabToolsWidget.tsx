import { useCallback, useMemo, useState } from 'react'
import { Check, ClipboardPaste, FlaskConical, LineChart, Save, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useLabTool } from '../../../hooks/useLabTool'
import { NotionLabCanvas } from '../NotionLabCanvas'
import { saveStandaloneNote } from '../../../utils/standaloneNotes'
import { showNotionToast } from '../NotionToast'
import { parseLabReport, parsedValueToLabEntry } from '../../../utils/lab/parseLabReport'
import { StandalonePromptToolWidget } from './StandalonePromptToolWidget'
import '../../../styles/workspace-ai.css'
import '../../../styles/standalone-workspace.css'

const SCRATCH_CASE_ID = 'standalone-labviz'

type LabToolsTab = 'visualize' | 'interpret'

interface StandaloneLabToolsWidgetProps {
  caseId: string
  onClose: () => void
}

/**
 * Consolidated patient-less lab tools: ad-hoc visualisation + AI lab interpretation
 * in one in-container panel with tabs.
 */
export function StandaloneLabToolsWidget({ caseId, onClose }: StandaloneLabToolsWidgetProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<LabToolsTab>('visualize')
  const lab = useLabTool(SCRATCH_CASE_ID)
  const [saved, setSaved] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteDate, setPasteDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [parsed, setParsed] = useState<ReturnType<typeof parseLabReport>>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const handleParse = useCallback(() => {
    const values = parseLabReport(pasteText)
    setParsed(values)
    setSelectedRows(new Set(values.map((_, index) => index)))
  }, [pasteText])

  const toggleRow = useCallback((index: number) => {
    setSelectedRows((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const importSelected = useCallback(() => {
    const chosen = parsed.filter((_, index) => selectedRows.has(index))
    // A comparison graph needs at least two values to plot a trend.
    if (chosen.length < 2) return
    lab.addEntries(chosen.map((value) => parsedValueToLabEntry(value, pasteDate)))
    setParsed([])
    setSelectedRows(new Set())
    setPasteText('')
    showNotionToast(t('standaloneLabToolsPasteImported'))
  }, [parsed, selectedRows, lab, pasteDate, t])

  const selectedCount = useMemo(() => selectedRows.size, [selectedRows])

  const saveVizToNotes = useCallback(() => {
    if (lab.entries.length === 0) return
    const byParameter = new Map<string, typeof lab.entries>()
    for (const entry of lab.entries) {
      const key = entry.parameter.trim() || '—'
      const list = byParameter.get(key) ?? []
      list.push(entry)
      byParameter.set(key, list)
    }
    const lines: string[] = [t('standaloneLabVizNoteHeading')]
    if (lab.activeLabGraphTitle) lines.push(lab.activeLabGraphTitle)
    for (const [parameter, list] of byParameter) {
      lines.push('', `${parameter}:`)
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
      for (const entry of sorted) {
        const unit = entry.unit ? ` ${entry.unit}` : ''
        const ref =
          entry.referenceLow !== null || entry.referenceHigh !== null
            ? ` (Ref ${entry.referenceLow ?? '–'}–${entry.referenceHigh ?? '–'})`
            : ''
        lines.push(`- ${entry.date}: ${entry.value}${unit}${ref}`)
      }
    }
    saveStandaloneNote(caseId, {
      kind: 'labviz',
      title: t('standaloneLabVizNoteTitle'),
      content: lines.join('\n').trim(),
      category: 'laborbefunde',
    })
    setSaved(true)
    showNotionToast(t('standaloneSavedToNotes'))
    window.setTimeout(() => setSaved(false), 2000)
  }, [lab.entries, lab.activeLabGraphTitle, caseId, t])

  return (
    <div className="wai-panel wai-panel--inline" aria-label={t('standaloneLabToolsTitle')}>
      <header className="wai-panel__header">
        <span className="wai-panel__eyebrow">
          <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('standaloneLabToolsEyebrow')}
        </span>
        <h2 className="wai-panel__title">{t('standaloneLabToolsTitle')}</h2>
        <button
          type="button"
          className="wai-panel__close"
          onClick={onClose}
          aria-label={t('dokumenteClose')}
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div className="swx-lab-tools__tabs" role="tablist" aria-label={t('standaloneLabToolsTitle')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'visualize'}
          className={`swx-lab-tools__tab${tab === 'visualize' ? ' swx-lab-tools__tab--active' : ''}`}
          onClick={() => setTab('visualize')}
        >
          <LineChart className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('standaloneLabToolsTabVisualize')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'interpret'}
          className={`swx-lab-tools__tab${tab === 'interpret' ? ' swx-lab-tools__tab--active' : ''}`}
          onClick={() => setTab('interpret')}
        >
          <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('standaloneLabToolsTabInterpret')}
        </button>
      </div>

      {tab === 'visualize' ? (
        <div className="wai-panel__body" role="tabpanel">
          <details className="swx-lab-paste">
            <summary>
              <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('standaloneLabToolsPasteLabel')}
            </summary>
            <div className="swx-lab-paste__body">
              <label className="swx-field">
                {t('standaloneLabToolsPasteDate')}
                <input
                  type="date"
                  className="swx-field__input"
                  value={pasteDate}
                  onChange={(e) => setPasteDate(e.target.value)}
                />
              </label>
              <textarea
                className="swx-lab-paste__textarea"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t('standaloneLabToolsPastePlaceholder')}
                aria-label={t('standaloneLabToolsPasteLabel')}
                rows={5}
              />
              <div className="swx-lab-paste__actions">
                <button
                  type="button"
                  className="wai-btn wai-btn--ghost"
                  onClick={handleParse}
                  disabled={!pasteText.trim()}
                >
                  {t('standaloneLabToolsPasteParse')}
                </button>
                {parsed.length > 0 ? (
                  <button
                    type="button"
                    className="wai-btn wai-btn--primary"
                    onClick={importSelected}
                    disabled={selectedCount < 2}
                  >
                    {t('standaloneLabToolsPasteImport')} ({selectedCount})
                  </button>
                ) : null}
              </div>
              {parsed.length === 0 && pasteText.trim() ? (
                <p className="swx-empty">{t('standaloneLabToolsPasteNone')}</p>
              ) : null}
              {parsed.length > 0 && selectedCount < 2 ? (
                <p className="swx-lab-paste__hint" role="status">
                  {t('standaloneLabToolsPasteMinTwo')}
                </p>
              ) : null}
              {parsed.length > 0 ? (
                <ul className="swx-lab-paste__list">
                  {parsed.map((value, index) => (
                    <li key={`${value.parameter}-${index}`} className="swx-lab-paste__row">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() => toggleRow(index)}
                        />
                        <span className="swx-lab-paste__param">{value.parameter}</span>
                        <span className="swx-lab-paste__val">
                          {value.rawValue}
                          {value.unit ? ` ${value.unit}` : ''}
                          {value.referenceLow !== null || value.referenceHigh !== null
                            ? ` (${value.referenceLow ?? '–'}–${value.referenceHigh ?? '–'})`
                            : ''}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
          <div className="swx-canvas-host">
            <div className="swx-canvas-host__bar">
              <p className="swx-empty">{t('standaloneLabToolsVizHint')}</p>
              <button
                type="button"
                className="wai-btn wai-btn--ghost"
                onClick={saveVizToNotes}
                disabled={lab.entries.length === 0}
              >
                {saved ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                )}
                {saved ? t('standaloneSavedToNotes') : t('standaloneSaveToNotes')}
              </button>
            </div>
            <NotionLabCanvas
              caseId={SCRATCH_CASE_ID}
              pageId="visualisation"
              lab={lab}
              pageLabel={t('standaloneLabToolsTabVisualize')}
            />
          </div>
        </div>
      ) : (
        <StandalonePromptToolWidget
          variant="labInterpret"
          caseId={caseId}
          onClose={onClose}
          embedded
        />
      )}
    </div>
  )
}
