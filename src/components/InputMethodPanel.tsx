import type { ReactNode } from 'react'
import {
  AlertCircle,
  Bell,
  Check,
  ClipboardPaste,
  Coins,
  FileText,
  Info,
  Layers,
  Mic,
  Pencil,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import type { DictationPhase } from '../types/dictation'
import type { AiGenerationScope, DocumentSection, InputMode } from '../types'
import type { ResolvedAiContext } from '../types/aiManager'
import { DictationControls } from './DictationControls'
import { IconButton } from './IconButton'
import { PrimaryButton } from './PrimaryButton'

interface InputMethodPanelProps {
  inputMode: InputMode
  dictationPhase: DictationPhase
  durationMs: number
  isPlayingBack: boolean
  dictationError?: string | null
  isGenerating: boolean
  generationPendingReview: boolean
  showGenerationScope: boolean
  generationScope: AiGenerationScope
  incompleteGenerationWarning: DocumentSection[] | null
  estimatedGenerationCredits: number
  insufficientCredits: boolean
  aiContext: ResolvedAiContext
  aiCanGenerate: boolean
  showTherapieVerlaufExtract?: boolean
  therapieVerlaufSourceText?: string
  onInputModeChange: (mode: InputMode) => void
  onTherapieVerlaufSourceChange?: (value: string) => void
  onExtractTherapieVerlauf?: () => void
  onDictate: () => void
  onPauseDictation: () => void
  onResumeDictation: () => void
  onStopRecording: () => void
  onTogglePlayback: () => void
  onDiscardRecording: () => void
  onTranscribe: () => void
  onGenerate: () => void
  onGenerationScopeChange: (scope: AiGenerationScope) => void
  onConfirmIncompleteGeneration: () => void
  onDismissIncompleteGenerationWarning: () => void
  onRewrite: () => void
  onRegenerate: () => void
  onAcceptGeneration: () => void
  onRejectGeneration: () => void
}

function StatusBanner({
  variant,
  icon,
  children,
  role,
}: {
  variant: 'warning' | 'accent' | 'muted'
  icon: ReactNode
  children: ReactNode
  role?: 'alert' | 'status' | 'note'
}) {
  return (
    <div className={`status-banner status-banner--${variant}`} role={role}>
      <span className="mt-0.5 shrink-0 opacity-80">{icon}</span>
      <div className="min-w-0 flex-1 text-ink">{children}</div>
    </div>
  )
}

function SecondaryButton({
  active,
  label,
  children,
  onClick,
  disabled,
}: {
  active?: boolean
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`action-btn interactive-scale rounded-md px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? 'action-btn--selected' : ''
      }`}
    >
      {children}
      <span className="responsive-label">{label}</span>
    </button>
  )
}

function GenerateHintControls({
  aiHintMessage,
  estimatedGenerationCredits,
}: {
  aiHintMessage: string | null
  estimatedGenerationCredits: number
}) {
  const { t } = useTranslation()
  const [openPopover, setOpenPopover] = useState<'recommended' | 'cost' | null>(null)
  const clusterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openPopover) return
    const handlePointerDown = (event: MouseEvent) => {
      if (clusterRef.current?.contains(event.target as Node)) return
      setOpenPopover(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPopover(null)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPopover])

  const costLabel = t('estimatedCredits').replace(
    '{credits}',
    String(estimatedGenerationCredits),
  )

  return (
    <div ref={clusterRef} className="generate-hint-cluster relative flex flex-col justify-center">
      <IconButton
        bordered
        icon={<Bell strokeWidth={1.5} />}
        label={t('generateHintRecommended')}
        onClick={() =>
          setOpenPopover((current) => (current === 'recommended' ? null : 'recommended'))
        }
        className={`generate-hint-cluster__btn ${
          aiHintMessage ? 'generate-hint-cluster__btn--active' : ''
        }`}
        aria-expanded={openPopover === 'recommended'}
      />
      <IconButton
        bordered
        icon={<Info strokeWidth={1.5} />}
        label={t('generateHintCost')}
        onClick={() => setOpenPopover((current) => (current === 'cost' ? null : 'cost'))}
        className="generate-hint-cluster__btn"
        aria-expanded={openPopover === 'cost'}
      />
      {openPopover === 'recommended' ? (
        <div className="generate-hint-popover" role="dialog" aria-label={t('generateHintRecommended')}>
          <p className="text-[11px] leading-snug text-ink sm:text-xs">
            {aiHintMessage ?? t('aiContextHintNoTools')}
          </p>
        </div>
      ) : null}
      {openPopover === 'cost' ? (
        <div className="generate-hint-popover" role="dialog" aria-label={t('generateHintCost')}>
          <p className="flex items-center gap-1.5 text-[11px] leading-snug text-ink sm:text-xs">
            <Coins className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
            {costLabel}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function InputMethodPanel({
  inputMode,
  dictationPhase,
  durationMs,
  isPlayingBack,
  dictationError = null,
  isGenerating,
  generationPendingReview,
  showGenerationScope,
  generationScope,
  incompleteGenerationWarning,
  estimatedGenerationCredits,
  insufficientCredits,
  aiContext,
  aiCanGenerate,
  showTherapieVerlaufExtract = false,
  therapieVerlaufSourceText = '',
  onInputModeChange,
  onTherapieVerlaufSourceChange,
  onExtractTherapieVerlauf,
  onDictate,
  onPauseDictation,
  onResumeDictation,
  onStopRecording,
  onTogglePlayback,
  onDiscardRecording,
  onTranscribe,
  onGenerate,
  onGenerationScopeChange,
  onConfirmIncompleteGeneration,
  onDismissIncompleteGenerationWarning,
  onRewrite,
  onRegenerate,
  onAcceptGeneration,
  onRejectGeneration,
}: InputMethodPanelProps) {
  const { t } = useTranslation()
  const isDictationActive = dictationPhase !== 'idle'
  const controlsLocked = isDictationActive || isGenerating
  const generateLabel = isGenerating ? t('generating') : t('generate')

  const highlightedToolLabels = aiContext.highlightedToolKeys
    .map((key) => t(key))
    .join(', ')

  const aiHintMessage =
    aiContext.hintKind === 'segment'
      ? t('aiContextHintSegmentTools').replace('{tools}', highlightedToolLabels)
      : aiContext.hintKind === 'document'
        ? t('aiContextHintDocumentTools').replace('{tools}', highlightedToolLabels)
        : aiContext.hintKind === 'unavailable'
          ? t('aiContextHintNoTools')
          : null

  const warningMessage =
    incompleteGenerationWarning && incompleteGenerationWarning.length > 0
      ? t('generationIncompleteWarning')
          .replace('{count}', String(incompleteGenerationWarning.length))
          .replace(
            '{labels}',
            incompleteGenerationWarning.map((section) => section.label).join(', '),
          )
      : null

  const showVerificationNote =
    !generationPendingReview &&
    !aiHintMessage &&
    (aiCanGenerate || aiContext.generateScopeAllowed)

  const [showHintFlash, setShowHintFlash] = useState(false)

  useEffect(() => {
    if (!aiHintMessage || generationPendingReview) {
      setShowHintFlash(false)
      return
    }
    setShowHintFlash(true)
    const timeoutId = window.setTimeout(() => setShowHintFlash(false), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [aiHintMessage, generationPendingReview])

  return (
    <div className="input-method-panel w-full shrink-0 space-y-1.5">
      {warningMessage ? (
        <StatusBanner variant="warning" icon={<AlertCircle className="h-3.5 w-3.5 text-recording" strokeWidth={1.5} />} role="alert">
          <p>{warningMessage}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onConfirmIncompleteGeneration}
              className="rounded-md border border-ink/20 bg-surface-active px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-surface-hover"
            >
              {t('generationIncompleteConfirm')}
            </button>
            <button
              type="button"
              onClick={onDismissIncompleteGenerationWarning}
              className="rounded-md border border-border/60 px-2.5 py-1 text-[11px] text-ink transition-colors hover:bg-surface-hover"
            >
              {t('generationIncompleteCancel')}
            </button>
          </div>
        </StatusBanner>
      ) : null}

      {showHintFlash && aiHintMessage && !generationPendingReview ? (
        <StatusBanner
          variant="accent"
          icon={<Sparkles className="h-3.5 w-3.5 text-secondary" strokeWidth={1.5} />}
          role="note"
        >
          {aiHintMessage}
        </StatusBanner>
      ) : null}

      {showTherapieVerlaufExtract && inputMode === 'extract' && !generationPendingReview ? (
        <div className="therapie-verlauf-extract rounded-md border border-border/50 bg-surface px-3 py-3">
          <p className="mb-2 text-[11px] leading-snug text-muted sm:text-xs">
            {t('therapieVerlaufExtractHint')}
          </p>
          <textarea
            className="min-h-[8rem] w-full resize-y rounded-md border border-border/50 bg-surface px-2.5 py-2 text-xs leading-relaxed text-ink outline-none transition-colors focus:border-border-strong sm:min-h-[10rem] sm:text-sm"
            value={therapieVerlaufSourceText}
            onChange={(event) => onTherapieVerlaufSourceChange?.(event.target.value)}
            placeholder={t('therapieVerlaufSourcePlaceholder')}
            spellCheck
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-muted sm:text-[11px]">{t('therapieVerlaufManualHint')}</p>
            <button
              type="button"
              onClick={onExtractTherapieVerlauf}
              disabled={
                controlsLocked ||
                isGenerating ||
                !therapieVerlaufSourceText.trim()
              }
              className="btn-primary rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('extractTherapieVerlaufSections')}
            </button>
          </div>
        </div>
      ) : null}

      {insufficientCredits && !generationPendingReview ? (
        <StatusBanner variant="warning" icon={<Coins className="h-3.5 w-3.5 text-recording" strokeWidth={1.5} />} role="alert">
          {t('insufficientCredits')}
        </StatusBanner>
      ) : null}

      {generationPendingReview ? (
        <StatusBanner variant="accent" icon={<Wand2 className="h-3.5 w-3.5 text-secondary" strokeWidth={1.5} />} role="status">
          {t('generationReviewHint')}
        </StatusBanner>
      ) : null}

      <div className="input-method-bar surface-elevated flex w-full min-w-0 items-center justify-between gap-1.5 rounded-md px-2 py-1 sm:gap-2 sm:px-2.5 sm:py-1.5">
        <div className="input-method-actions flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <SecondaryButton
            active={inputMode === 'write' && !isDictationActive}
            label={t('write')}
            disabled={controlsLocked}
            onClick={() => onInputModeChange('write')}
          >
            <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          </SecondaryButton>

          {showTherapieVerlaufExtract && !isDictationActive ? (
            <SecondaryButton
              active={inputMode === 'extract'}
              label={t('extractFromPaste')}
              disabled={controlsLocked || isGenerating}
              onClick={() => onInputModeChange('extract')}
            >
              <ClipboardPaste className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            </SecondaryButton>
          ) : null}

          {!isDictationActive ? (
            <SecondaryButton
              active={false}
              label={t('dictate')}
              disabled={isGenerating}
              onClick={onDictate}
            >
              <Mic className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            </SecondaryButton>
          ) : (
            <div className="dictation-controls-wrap flex min-w-0 flex-1 items-center gap-1 border-l border-border/60 pl-1.5 sm:pl-2">
              <Mic
                className="recording-dot h-4 w-4 shrink-0 text-recording"
                strokeWidth={1.5}
                aria-hidden
              />
              <DictationControls
                phase={dictationPhase}
                durationMs={durationMs}
                isPlayingBack={isPlayingBack}
                dictationError={dictationError}
                onPause={onPauseDictation}
                onResume={onResumeDictation}
                onStop={onStopRecording}
                onTogglePlayback={onTogglePlayback}
                onDiscard={onDiscardRecording}
                onTranscribe={onTranscribe}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {showGenerationScope && !generationPendingReview ? (
            <div
              className="generation-scope-toggle mr-0.5 flex items-center gap-0.5 border-r border-border/60 pr-1 sm:mr-1 sm:pr-1.5"
              role="radiogroup"
              aria-label={t('generationScopeSegment')}
            >
              <IconButton
                bordered
                icon={<FileText strokeWidth={1.5} />}
                label={t('generationScopeSegmentHint')}
                onClick={() => onGenerationScopeChange('segment')}
                className={`h-8 w-8 ${generationScope === 'segment' ? '!border-accent' : ''}`}
                aria-pressed={generationScope === 'segment'}
              />
              <IconButton
                bordered
                icon={<Layers strokeWidth={1.5} />}
                label={t('generationScopeDocumentHint')}
                onClick={() => onGenerationScopeChange('document')}
                className={`h-8 w-8 ${generationScope === 'document' ? '!border-accent' : ''}`}
                aria-pressed={generationScope === 'document'}
              />
            </div>
          ) : null}

          {generationPendingReview ? (
            <>
              <IconButton
                bordered
                icon={<Wand2 strokeWidth={1.5} />}
                label={t('rewrite')}
                onClick={onRewrite}
                disabled={controlsLocked}
                className="h-8 w-8"
              />
              <IconButton
                bordered
                icon={<RefreshCw strokeWidth={1.5} />}
                label={t('regenerate')}
                onClick={onRegenerate}
                disabled={controlsLocked}
                className="h-8 w-8"
              />
              <IconButton
                bordered
                icon={<Check strokeWidth={1.5} />}
                label={t('acceptGeneration')}
                onClick={onAcceptGeneration}
                disabled={isGenerating}
                className="h-8 w-8 !border-accent"
              />
              <IconButton
                bordered
                icon={<X strokeWidth={1.5} />}
                label={t('rejectGeneration')}
                onClick={onRejectGeneration}
                disabled={isGenerating}
                className="h-8 w-8"
              />
            </>
          ) : (
            <div className="generate-action-row flex shrink-0 items-center gap-1">
              <PrimaryButton
                onClick={onGenerate}
                disabled={isGenerating || isDictationActive || !aiCanGenerate}
                className="action-btn action-btn--primary generate-action-row__primary gap-1.5"
                aria-label={generateLabel}
                title={
                  !aiCanGenerate
                    ? insufficientCredits
                      ? t('insufficientCredits')
                      : aiHintMessage ?? t('aiContextHintNoTools')
                    : showGenerationScope
                      ? generationScope === 'document'
                        ? `${generateLabel} — ${t('generationScopeDocument')}`
                        : `${generateLabel} — ${t('generationScopeSegment')}`
                      : generateLabel
                }
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className="responsive-label">{generateLabel}</span>
              </PrimaryButton>
              <GenerateHintControls
                aiHintMessage={aiHintMessage}
                estimatedGenerationCredits={estimatedGenerationCredits}
              />
            </div>
          )}
        </div>
      </div>

      {showVerificationNote ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] leading-snug text-muted sm:text-[11px]" role="note">
          <Info className="h-3 w-3 shrink-0 opacity-60" strokeWidth={1.5} aria-hidden />
          {t('aiVerificationWarning')}
        </p>
      ) : null}
    </div>
  )
}
