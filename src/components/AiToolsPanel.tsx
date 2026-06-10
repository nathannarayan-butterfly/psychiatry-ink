import { Sparkles, ToggleLeft, ToggleRight, Wand2 } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'
import {
  aiModelTierHintKeys,
  aiModelTierLabelKeys,
  aiModelTiers,
  type AiToolKey,
} from '../data/aiTools'
import type { ResolvedAiToolState } from '../types/aiManager'
import type { AiModelTier } from '../types'
import { documentationToolIcons, tierIcon } from '../utils/aiToolIcons'
import { PanelScrollArea } from './PanelScrollArea'

interface AiToolsPanelProps {
  aiAutoMode: boolean
  aiModelTier: AiModelTier
  toolStates: ResolvedAiToolState[]
  selectedToolKey?: AiToolKey | null
  disabled?: boolean
  onToggleAuto: () => void
  onSelectModelTier: (tier: AiModelTier) => void
  onToolAction: (key: AiToolKey) => void
}

export function AiToolsPanel({
  aiAutoMode,
  aiModelTier,
  toolStates,
  selectedToolKey = null,
  disabled = false,
  onToggleAuto,
  onSelectModelTier,
  onToolAction,
}: AiToolsPanelProps) {
  const { t } = useTranslation()

  return (
    <aside
      className="workspace-column workspace-column--ai workspace-float-panel ai-panel-animate h-full min-h-0"
      aria-label={t('aiTools')}
    >
      <div className="ai-panel-header flex shrink-0 items-center gap-1.5 border-b border-border/50 px-2 py-1.5 sm:px-2.5">
        <Wand2 className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
        <p className="ai-panel-heading truncate text-[12px] font-semibold tracking-wide text-ink">
          {t('aiTools')}
        </p>
      </div>

      <PanelScrollArea
        className="mb-1.5"
        scrollClassName="flex flex-col gap-2 px-1.5 py-1 sm:px-2"
      >
        <div
          className="ai-tier-segment workspace-float-block shrink-0"
          role="radiogroup"
          aria-label={t('aiModelTier')}
        >
          {aiModelTiers.map((tier) => {
            const active = aiModelTier === tier
            const label = t(aiModelTierLabelKeys[tier])
            const hint = t(aiModelTierHintKeys[tier])
            return (
              <button
                key={tier}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${label} — ${hint}`}
                title={`${label} — ${hint}`}
                disabled={disabled}
                onClick={() => onSelectModelTier(tier)}
                className={`ai-tier-segment__btn ${active ? 'ai-tier-segment__btn--active' : ''}`}
              >
                <span className="flex h-4 w-4 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">
                  {tierIcon(tier, active ? 'text-accent' : undefined)}
                </span>
                <span className="ai-tier-segment__label">{label}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onToggleAuto}
          disabled={disabled}
          title={t('aiAuto')}
          aria-label={t('aiAuto')}
          className={`ai-auto-switch ai-auto-btn ${aiAutoMode ? 'ai-auto-switch--on ai-auto-btn--on' : ''}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Sparkles
              className={`ai-auto-icon h-3.5 w-3.5 shrink-0 ${aiAutoMode ? 'text-ink' : 'text-muted'}`}
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="ai-auto-label text-xs font-medium text-ink">{t('aiAuto')}</span>
          </span>
          {aiAutoMode ? (
            <ToggleRight className="ai-auto-toggle h-4 w-4 shrink-0 text-ink" strokeWidth={1.5} aria-hidden />
          ) : (
            <ToggleLeft className="ai-auto-toggle h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
          )}
        </button>

        <div className="workspace-float-block flex flex-col gap-1.5 p-1.5">
          <p className="ai-tools-section-label px-0.5 pb-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            {t('aiToolsDocumentation')}
          </p>

          {toolStates.map((tool) => {
            const selected = selectedToolKey === tool.key
            const highlighted = tool.highlighted && !selected

            return (
              <button
                key={tool.key}
                type="button"
                disabled={tool.disabled || disabled}
                onClick={() => onToolAction(tool.key)}
                title={t(tool.key)}
                aria-label={t(tool.key)}
                aria-pressed={selected}
                className={`ai-tool-action ai-tool-chip disabled:cursor-not-allowed disabled:opacity-45 ${
                  selected
                    ? 'ai-tool-chip--selected text-ink'
                    : highlighted
                      ? 'ai-tool-chip--highlighted'
                      : 'text-ink'
                }`}
              >
                <span className="ai-tool-chip__icon [&>svg]:h-3.5 [&>svg]:w-3.5">
                  {documentationToolIcons[tool.key]}
                </span>
                <span className="ai-tool-label min-w-0 flex-1 font-medium">{t(tool.key)}</span>
              </button>
            )
          })}
        </div>
      </PanelScrollArea>
    </aside>
  )
}
