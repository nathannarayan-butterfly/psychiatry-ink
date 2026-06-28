import { useCallback, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { executeAiGeneration } from '../../../services/aiGeneration'
import { estimateGenerationCredits } from '../../../utils/estimateCredits'
import type { AiToolKey } from '../../../data/aiTools'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type { DokumentCategory } from '../../../utils/dokumenteArchive'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import '../../../styles/workspace-ai.css'
import '../../../styles/standalone-workspace.css'

/** Which paste → explicit-AI → result tool this instance powers. */
export type StandalonePromptVariant = 'summary' | 'labInterpret'

interface VariantConfig {
  titleKey: UiTranslationKey
  eyebrowKey: UiTranslationKey
  inputLabelKey: UiTranslationKey
  placeholderKey: UiTranslationKey
  /** Localised clinical framing handed to the AI as an extra instruction. */
  instructionKey: UiTranslationKey
  tool: AiToolKey
  noteKind: string
  noteCategory: DokumentCategory
}

const VARIANTS: Record<StandalonePromptVariant, VariantConfig> = {
  summary: {
    titleKey: 'standaloneSummaryTitle',
    eyebrowKey: 'standaloneSummaryEyebrow',
    inputLabelKey: 'standaloneSummaryInputLabel',
    placeholderKey: 'standaloneSummaryPlaceholder',
    instructionKey: 'standaloneSummaryInstruction',
    tool: 'summarize',
    noteKind: 'therapie-verlauf-summary',
    noteCategory: 'arztbrief',
  },
  labInterpret: {
    titleKey: 'standaloneLabInterpretTitle',
    eyebrowKey: 'standaloneLabInterpretEyebrow',
    inputLabelKey: 'standaloneLabInterpretInputLabel',
    placeholderKey: 'standaloneLabInterpretPlaceholder',
    instructionKey: 'standaloneLabInterpretInstruction',
    tool: 'summarize',
    noteKind: 'lab-interpretation',
    noteCategory: 'laborbefunde',
  },
}

interface StandalonePromptToolWidgetProps {
  variant: StandalonePromptVariant
  /** Storage id of the (default) case the resulting note is saved under. */
  caseId: string
  onClose: () => void
}

/**
 * Generic patient-less "paste → explicit AI → editable result" tool. Powers the
 * Therapie-&-Verlauf (Arztbrief-style) summarizer and the Laborbefund
 * interpretation. The clinician pastes accumulated data and explicitly runs the
 * AI ({@link executeAiGeneration}, credit-guarded) — never on mount. No caseId
 * is sent to the model (pasted text is not patient-scoped); the output is shown
 * in {@link StandaloneResultPanel} to edit / copy / save as a standalone note.
 */
export function StandalonePromptToolWidget({
  variant,
  caseId,
  onClose,
}: StandalonePromptToolWidgetProps) {
  const cfg = VARIANTS[variant]
  const { t, language } = useTranslation()
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [source, setSource] = useState('')
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
          componentId: `standalone-${variant}`,
          scope: 'segment',
          tool: cfg.tool,
          tier: 'thorough',
          language,
          sourceText: trimmed,
          extraInstruction: t(cfg.instructionKey),
        },
        { estimatedCredits: estimateGenerationCredits('thorough', trimmed) },
      )
      setText(generation.text.trim())
      setPhase('result')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('workspaceAiError'))
    } finally {
      setBusy(false)
    }
  }, [source, busy, variant, cfg, language, t])

  if (phase === 'result') {
    return (
      <StandaloneResultPanel
        caseId={caseId}
        title={t(cfg.titleKey)}
        noteKind={cfg.noteKind}
        noteCategory={cfg.noteCategory}
        text={text}
        onTextChange={setText}
        onClose={onClose}
        onRegenerate={() => void generate()}
        regenerating={busy}
      />
    )
  }

  return (
    <div className="wai-panel wai-panel--inline" aria-label={t(cfg.titleKey)}>
      <header className="wai-panel__header">
        <span className="wai-panel__eyebrow">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t(cfg.eyebrowKey)}
        </span>
        <h2 className="wai-panel__title">{t(cfg.titleKey)}</h2>
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
            {t(cfg.inputLabelKey)}
            <textarea
              className="swx-rewrite__editor"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t(cfg.placeholderKey)}
              aria-label={t(cfg.inputLabelKey)}
              spellCheck
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
  )
}
