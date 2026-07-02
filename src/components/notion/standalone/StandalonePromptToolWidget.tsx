import { useCallback, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useAiJobRunner } from '../../../hooks/useAiJobRunner'
import { NotionGenerationProgress } from '../NotionGenerationProgress'
import {
  resolveHardLimitWords,
  resolveTargetWords,
  type AiOutputLengthSpec,
} from '../../../../shared/aiJobs'
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
  /** Feature key for credit accounting (must be in the server allowlist). */
  featureKey: string
  /** Use the structured 7-section clinical course skeleton. */
  structured: boolean
  noteKind: string
  noteCategory: DokumentCategory
  /** Render the result as formatted markdown (bold/italic/lists) by default. */
  renderMarkdown?: boolean
}

const VARIANTS: Record<StandalonePromptVariant, VariantConfig> = {
  summary: {
    titleKey: 'standaloneSummaryTitle',
    eyebrowKey: 'standaloneSummaryEyebrow',
    inputLabelKey: 'standaloneSummaryInputLabel',
    placeholderKey: 'standaloneSummaryPlaceholder',
    instructionKey: 'standaloneSummaryInstruction',
    featureKey: 'short_verlauf',
    structured: true,
    noteKind: 'therapie-verlauf-summary',
    noteCategory: 'arztbrief',
  },
  labInterpret: {
    titleKey: 'standaloneLabInterpretTitle',
    eyebrowKey: 'standaloneLabInterpretEyebrow',
    inputLabelKey: 'standaloneLabInterpretInputLabel',
    placeholderKey: 'standaloneLabInterpretPlaceholder',
    instructionKey: 'standaloneLabInterpretInstruction',
    featureKey: 'document_generation',
    structured: false,
    noteKind: 'lab-interpretation',
    noteCategory: 'laborbefunde',
    renderMarkdown: true,
  },
}

const LENGTH_OPTIONS = [
  { mode: 'kurz', labelKey: 'kiLengthKurz' },
  { mode: 'mittel', labelKey: 'kiLengthMittel' },
  { mode: 'gruendlich', labelKey: 'kiLengthGruendlich' },
  { mode: 'custom', labelKey: 'kiLengthCustom' },
] as const

interface StandalonePromptToolWidgetProps {
  variant: StandalonePromptVariant
  /** Storage id of the (default) case the resulting note is saved under. */
  caseId: string
  onClose: () => void
  /** When true, omit outer panel chrome (used inside {@link StandaloneLabToolsWidget}). */
  embedded?: boolean
}

/**
 * Generic patient-less "paste → explicit AI → editable result" tool. Powers the
 * Therapie-&-Verlauf summarizer and the Laborbefund interpretation. The pasted
 * text runs as a persisted AI job (`useAiJobRunner`): long documents go through
 * the chunking pipeline with live step/progress feedback, the run can continue
 * in the background, and the result is additionally auto-saved to "Meine
 * Notizen" server-side so nothing generated here can silently disappear. No
 * caseId is sent (pasted text is not patient-scoped).
 */
export function StandalonePromptToolWidget({
  variant,
  caseId,
  onClose,
  embedded = false,
}: StandalonePromptToolWidgetProps) {
  const cfg = VARIANTS[variant]
  const { t, language } = useTranslation()
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lengthSpec, setLengthSpec] = useState<AiOutputLengthSpec>({ mode: 'mittel' })
  const [directions, setDirections] = useState('')
  const { progress, start, continueInBackground, cancel } = useAiJobRunner()
  const busy = progress !== null

  const generate = useCallback(async () => {
    const trimmed = source.trim()
    if (!trimmed || busy) return
    setError(null)
    try {
      const result = await start({
        featureKey: cfg.featureKey,
        sourceText: trimmed,
        tier: 'thorough',
        language,
        componentId: `standalone-${variant}`,
        tool: 'summarize',
        sectionLabel: t(cfg.titleKey),
        length: lengthSpec,
        directions: [t(cfg.instructionKey), directions.trim()].filter(Boolean).join(' '),
        structured: cfg.structured,
      })
      // null = cancelled or sent to background — the indicator takes over.
      if (result != null) {
        setText(result.trim())
        setPhase('result')
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('workspaceAiError'))
    }
  }, [source, busy, start, cfg, language, variant, lengthSpec, directions, t])

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
        renderMarkdown={cfg.renderMarkdown}
      />
    )
  }

  const targetWords = resolveTargetWords(lengthSpec)

  const body = (
    <>
      <div className={`wai-panel__body wai-panel__body--fill`}>
        <div className="swx-form swx-form--fill">
          <label className="swx-field swx-field--grow">
            {t(cfg.inputLabelKey)}
            <textarea
              className="swx-rewrite__editor"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t(cfg.placeholderKey)}
              aria-label={t(cfg.inputLabelKey)}
              spellCheck
              disabled={busy}
            />
          </label>

          <div className="swx-field">
            {t('kiLengthHeading')}
            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('kiLengthHeading')}>
              {LENGTH_OPTIONS.map((option) => {
                const active = lengthSpec.mode === option.mode
                return (
                  <button
                    key={option.mode}
                    type="button"
                    aria-pressed={active}
                    disabled={busy}
                    className={`rounded-sm border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? 'border-ink bg-surface-active font-medium text-ink'
                        : 'border-border text-muted hover:bg-surface-hover'
                    }`}
                    onClick={() =>
                      setLengthSpec(
                        option.mode === 'custom'
                          ? { mode: 'custom', customTargetWords: lengthSpec.customTargetWords ?? 1000 }
                          : { mode: option.mode },
                      )
                    }
                  >
                    {t(option.labelKey)}
                  </button>
                )
              })}
              {lengthSpec.mode === 'custom' ? (
                <input
                  type="number"
                  className="w-24 rounded-sm border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-ink"
                  min={50}
                  max={5000}
                  value={lengthSpec.customTargetWords ?? 1000}
                  aria-label={t('kiLengthCustomWords')}
                  disabled={busy}
                  onChange={(e) => {
                    const raw = Number(e.target.value)
                    setLengthSpec({
                      mode: 'custom',
                      customTargetWords: Number.isFinite(raw) ? raw : undefined,
                    })
                  }}
                />
              ) : null}
            </div>
            {targetWords ? (
              <p className="text-[11px] text-muted">
                {t('kiLengthTargetInfo')
                  .replace('{words}', String(targetWords))
                  .replace('{hard}', String(resolveHardLimitWords(targetWords)))}
              </p>
            ) : null}
          </div>

          <label className="swx-field">
            {t('kiExtraInstruction')}
            <textarea
              className="min-h-[3rem] w-full resize-y rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-ink"
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder={t('kiExtraInstructionPlaceholder')}
              rows={2}
              disabled={busy}
            />
          </label>

          {error ? <p className="swx-error">{error}</p> : null}
        </div>
      </div>

      <footer className="wai-panel__footer">
        <span className="wl-hint" />
        {progress ? (
          <div className="w-full">
            <NotionGenerationProgress
              job={progress}
              onContinueInBackground={continueInBackground}
              onCancel={cancel}
            />
          </div>
        ) : (
          <button
            type="button"
            className="wai-btn wai-btn--primary"
            onClick={() => void generate()}
            disabled={!source.trim() || busy}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('standaloneGenerate')}
          </button>
        )}
      </footer>
    </>
  )

  if (embedded) {
    return (
      <div role="tabpanel" className="swx-lab-tools__interpret">
        {body}
      </div>
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
      {body}
    </div>
  )
}
