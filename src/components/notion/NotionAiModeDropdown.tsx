import { ChevronDown, Send, Sparkles } from 'lucide-react'
import { useCallback, useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  aiDocumentationToolKeys,
  aiModelTierHintKeys,
  aiModelTierLabelKeys,
  aiModelTiers,
  type AiToolKey,
} from '../../data/aiTools'
import type { AiModelTier } from '../../types'
import { estimateGenerationCredits } from '../../utils/estimateCredits'
import { documentationToolIcons, tierIcon } from '../../utils/aiToolIcons'

interface NotionAiModeDropdownProps {
  tier: AiModelTier
  /** "Maximum" (gpt-5.5) opt-in — only meaningful on the thorough tier. */
  maximumEnabled: boolean
  selectedTool: AiToolKey | null
  sourceText: string
  extraInstruction: string
  disabled?: boolean
  canGenerate?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelectTier: (tier: AiModelTier) => void
  onToggleMaximum: (enabled: boolean) => void
  onSelectTool: (tool: AiToolKey) => void
  onExtraInstructionChange: (value: string) => void
  onGenerate: () => void
}

export function NotionAiModeDropdown({
  tier,
  maximumEnabled,
  selectedTool,
  sourceText,
  extraInstruction,
  disabled = false,
  canGenerate = true,
  open: openProp,
  onOpenChange,
  onSelectTier,
  onToggleMaximum,
  onSelectTool,
  onExtraInstructionChange,
  onGenerate,
}: NotionAiModeDropdownProps) {
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const activeTool = selectedTool ?? 'structure'
  const open = openProp ?? internalOpen

  const setOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const resolved = typeof next === 'function' ? next(open) : next
      onOpenChange?.(resolved)
      if (openProp === undefined) setInternalOpen(resolved)
    },
    [onOpenChange, open, openProp],
  )

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const creditEstimate = estimateGenerationCredits(tier, sourceText)

  const handleSend = () => {
    onGenerate()
    setOpen(false)
  }

  return (
    <div className="notion-ki-popover" ref={rootRef}>
      <button
        type="button"
        className="notion-ki-popover__trigger"
        disabled={disabled}
        title={t('notionAiModeCredits').replace('{credits}', String(creditEstimate))}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span>{t('notionKiButton')}</span>
        <span className="notion-ki-popover__tier-label">{t(activeTool)}</span>
        <span className="notion-ki-popover__tier-label">{t(aiModelTierLabelKeys[tier])}</span>
        <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div className="notion-ki-popover__panel" role="dialog" aria-label={t('notionKiButton')}>
          <p className="notion-ki-popover__heading">{t('notionKiToolHeading')}</p>
          <div className="notion-ki-popover__tools">
            {aiDocumentationToolKeys.map((tool) => {
              const active = tool === activeTool
              return (
                <button
                  key={tool}
                  type="button"
                  className={`notion-ki-popover__tool ${active ? 'notion-ki-popover__tool--active' : ''}`}
                  onClick={() => onSelectTool(tool)}
                >
                  <span className="notion-ki-popover__tier-icon">
                    {documentationToolIcons[tool]}
                  </span>
                  <span className="notion-ki-popover__tier-text">
                    <span className="notion-ki-popover__tier-name">{t(tool)}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="notion-ki-popover__heading">{t('notionKiTierHeading')}</p>
          <div className="notion-ki-popover__tiers">
            {aiModelTiers.map((option) => {
              const credits = estimateGenerationCredits(option, sourceText)
              const active = option === tier
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  className={`notion-ki-popover__tier ${active ? 'notion-ki-popover__tier--active' : ''}`}
                  title={t('notionAiModeCredits').replace('{credits}', String(credits))}
                  onClick={() => onSelectTier(option)}
                >
                  <span className="notion-ki-popover__tier-icon">
                    {tierIcon(option, active ? 'text-accent' : undefined)}
                  </span>
                  <span className="notion-ki-popover__tier-text">
                    <span className="notion-ki-popover__tier-name">
                      {t(aiModelTierLabelKeys[option])}
                    </span>
                    <span className="notion-ki-popover__tier-hint">
                      {t(aiModelTierHintKeys[option])}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {tier === 'thorough' ? (
            <button
              type="button"
              aria-pressed={maximumEnabled}
              className={`notion-ki-popover__maximum ${maximumEnabled ? 'notion-ki-popover__maximum--active' : ''}`}
              title={t('notionKiMaximumHint')}
              onClick={() => onToggleMaximum(!maximumEnabled)}
            >
              <span className="notion-ki-popover__tier-icon">
                <Sparkles
                  className={`h-3.5 w-3.5${maximumEnabled ? ' text-accent' : ''}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>
              <span className="notion-ki-popover__tier-text">
                <span className="notion-ki-popover__tier-name">
                  {t('notionKiMaximumLabel')}
                </span>
                <span className="notion-ki-popover__tier-hint">{t('notionKiMaximumHint')}</span>
              </span>
            </button>
          ) : null}

          <p className="notion-ki-popover__heading">{t('kiExtraInstruction')}</p>
          <textarea
            className="notion-ki-popover__instruction"
            value={extraInstruction}
            onChange={(event) => onExtraInstructionChange(event.target.value)}
            placeholder={t('kiExtraInstructionPlaceholder')}
            rows={3}
            disabled={disabled}
          />

          <div className="notion-ki-popover__send-row">
            <button
              type="button"
              className="notion-ki-popover__send"
              disabled={disabled || !canGenerate}
              title={t('kiSend')}
              aria-label={t('kiSend')}
              onClick={handleSend}
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
            <span className="notion-ki-popover__credits">
              {t('kiEstimatedCredits').replace('{credits}', String(creditEstimate))}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
