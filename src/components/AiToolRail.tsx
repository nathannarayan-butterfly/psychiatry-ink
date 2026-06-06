import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
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

function RailIconButton({
  label,
  children,
  active = false,
  highlighted = false,
  disabled = false,
  onClick,
}: {
  label: string
  children: ReactNode
  active?: boolean
  highlighted?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`ai-rail-btn workspace-float-block flex h-8 w-8 shrink-0 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'workspace-float-block--active'
          : highlighted
            ? 'ai-rail-btn--highlighted'
            : ''
      }`}
    >
      {children}
    </button>
  )
}

interface AiToolRailProps {
  aiAutoMode: boolean
  aiModelTier: AiModelTier
  toolStates: ResolvedAiToolState[]
  selectedToolKey?: AiToolKey | null
  disabled?: boolean
  onToggleAuto: () => void
  onSelectModelTier: (tier: AiModelTier) => void
  onToolAction: (key: AiToolKey) => void
}

export function AiToolRail({
  aiAutoMode,
  aiModelTier,
  toolStates,
  selectedToolKey = null,
  disabled = false,
  onToggleAuto,
  onSelectModelTier,
  onToolAction,
}: AiToolRailProps) {
  const { t } = useTranslation()

  return (
    <aside
      className="workspace-column workspace-column--ai-rail workspace-float-panel relative"
      aria-label={t('aiTools')}
    >
      <PanelScrollArea
        className="mt-1.5 mb-1.5"
        scrollClassName="flex flex-col items-center gap-1.5 px-1 py-1"
      >
        <div
          className="workspace-float-block flex flex-col items-center gap-1 p-1"
          role="radiogroup"
          aria-label={t('aiModelTier')}
        >
          {aiModelTiers.map((tier) => {
            const label = `${t(aiModelTierLabelKeys[tier])} — ${t(aiModelTierHintKeys[tier])}`
            const active = aiModelTier === tier
            return (
              <RailIconButton
                key={tier}
                label={label}
                active={active}
                disabled={disabled}
                onClick={() => onSelectModelTier(tier)}
              >
                {tierIcon(tier, active ? 'text-accent' : undefined)}
              </RailIconButton>
            )
          })}
        </div>

        <div className="workspace-float-block p-1">
          <RailIconButton
            label={t('aiAuto')}
            active={aiAutoMode}
            disabled={disabled}
            onClick={onToggleAuto}
          >
            <Sparkles
              className={aiAutoMode ? 'text-accent' : ''}
              strokeWidth={1.5}
              aria-hidden
            />
          </RailIconButton>
        </div>

        <div className="workspace-float-block flex flex-col items-center gap-1 p-1">
          {toolStates.map((tool) => (
            <RailIconButton
              key={tool.key}
              label={t(tool.key)}
              active={selectedToolKey === tool.key}
              highlighted={tool.highlighted && selectedToolKey !== tool.key}
              disabled={tool.disabled || disabled}
              onClick={() => onToolAction(tool.key)}
            >
              {documentationToolIcons[tool.key]}
            </RailIconButton>
          ))}
        </div>
      </PanelScrollArea>
    </aside>
  )
}
