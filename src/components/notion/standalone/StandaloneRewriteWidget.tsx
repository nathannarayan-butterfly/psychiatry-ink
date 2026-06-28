import { useCallback, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { executeAiGeneration } from '../../../services/aiGeneration'
import { estimateGenerationCredits } from '../../../utils/estimateCredits'
import type { AiToolKey } from '../../../data/aiTools'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import '../../../styles/workspace-ai.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneRewriteWidgetProps {
  /** Storage id of the (default) case the resulting note is saved under. */
  caseId: string
  onClose: () => void
}

const TOOL_OPTIONS: Array<{ tool: AiToolKey; labelKey: UiTranslationKey }> = [
  { tool: 'structure', labelKey: 'standaloneToolStructure' },
  { tool: 'improve', labelKey: 'standaloneToolImprove' },
  { tool: 'formalize', labelKey: 'standaloneToolFormalize' },
  { tool: 'summarize', labelKey: 'standaloneToolSummarize' },
  { tool: 'shorten', labelKey: 'standaloneToolShorten' },
  { tool: 'bulletPoints', labelKey: 'standaloneToolBullets' },
]

/**
 * Free-text rewrite / structure tool for the patient-less workspace. The
 * clinician pastes text, picks an action and explicitly runs the AI
 * (`executeAiGeneration`, credit-guarded) — never on mount. The structured
 * output is shown in {@link StandaloneResultPanel} to edit / copy / save. No
 * caseId is sent (pasted text is not patient-scoped).
 */
export function StandaloneRewriteWidget({ caseId, onClose }: StandaloneRewriteWidgetProps) {
  const { t, language } = useTranslation()
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [source, setSource] = useState('')
  const [tool, setTool] = useState<AiToolKey>('structure')
  const [instruction, setInstruction] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    const trimmed = source.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      const generation = await executeAiGeneration(
        {
          componentId: 'standalone-text-tool',
          scope: 'segment',
          tool,
          tier: 'standard',
          language,
          sourceText: trimmed,
          extraInstruction: instruction.trim() || undefined,
        },
        { estimatedCredits: estimateGenerationCredits('standard', trimmed) },
      )
      setText(generation.text.trim())
      setPhase('result')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('workspaceAiError'))
    } finally {
      setBusy(false)
    }
  }, [source, busy, tool, language, instruction, t])

  if (phase === 'result') {
    return (
      <StandaloneResultPanel
        caseId={caseId}
        title={t('standaloneRewriteTitle')}
        noteKind="rewrite"
        noteCategory="formulare"
        text={text}
        onTextChange={setText}
        onClose={onClose}
        onRegenerate={() => void generate()}
        regenerating={busy}
      />
    )
  }

  return (
    <div className="wai-overlay" role="dialog" aria-modal="true" aria-label={t('standaloneRewriteTitle')}>
      <div className="wai-panel">
        <header className="wai-panel__header">
          <span className="wai-panel__eyebrow">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('standaloneEyebrow')}
          </span>
          <h2 className="wai-panel__title">{t('standaloneRewriteTitle')}</h2>
          <button
            type="button"
            className="wai-panel__close"
            onClick={onClose}
            aria-label={t('dokumenteClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="wai-panel__body">
          <div className="swx-form">
            <label className="swx-field">
              {t('standaloneRewriteInputLabel')}
              <textarea
                className="swx-field__textarea"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={t('standaloneRewriteInputPlaceholder')}
                aria-label={t('standaloneRewriteInputLabel')}
                spellCheck
              />
            </label>
            <label className="swx-field">
              {t('standaloneRewriteToolLabel')}
              <select
                className="swx-field__select"
                value={tool}
                onChange={(e) => setTool(e.target.value as AiToolKey)}
              >
                {TOOL_OPTIONS.map((option) => (
                  <option key={option.tool} value={option.tool}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="swx-field">
              {t('standaloneRewriteInstructionLabel')}
              <input
                type="text"
                className="swx-field__input"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={t('standaloneRewriteInstructionPlaceholder')}
              />
            </label>
            {error ? <p className="swx-error">{error}</p> : null}
          </div>
        </div>

        <footer className="wai-panel__footer">
          <span className="wl-hint" />
          <button
            type="button"
            className="wai-btn wai-btn--primary"
            onClick={() => void generate()}
            disabled={!source.trim() || busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 wai-spin" strokeWidth={1.75} aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            )}
            {busy ? t('workspaceAiGenerating') : t('standaloneGenerate')}
          </button>
        </footer>
      </div>
    </div>
  )
}
