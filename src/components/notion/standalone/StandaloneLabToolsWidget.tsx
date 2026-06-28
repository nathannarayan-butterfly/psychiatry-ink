import { useCallback, useState } from 'react'
import { Check, FlaskConical, LineChart, Save, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useLabTool } from '../../../hooks/useLabTool'
import { NotionLabCanvas } from '../NotionLabCanvas'
import { saveStandaloneNote } from '../../../utils/standaloneNotes'
import { showNotionToast } from '../NotionToast'
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
