import { useTranslation } from '../../context/TranslationContext'
import { useAskButterfly } from '../../contexts/AskButterflyContext'
import {
  aiModelTierHintKeys,
  aiModelTierLabelKeys,
  aiModelTiers,
} from '../../data/aiTools'
import { tierIcon } from '../../utils/aiToolIcons'

/** Compact tier picker for Ask Butterfly chat (fast / standard / thorough). */
export function AskButterflyTierSelector() {
  const { t } = useTranslation()
  const { tier, setTier } = useAskButterfly()

  return (
    <div
      className="ask-butterfly-tier-segment"
      role="radiogroup"
      aria-label={t('aiModelTier')}
    >
      {aiModelTiers.map((option) => {
        const active = tier === option
        const label = t(aiModelTierLabelKeys[option])
        const hint = t(aiModelTierHintKeys[option])
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} — ${hint}`}
            title={`${label} — ${hint}`}
            onClick={() => setTier(option)}
            className={`ask-butterfly-tier-segment__btn${active ? ' ask-butterfly-tier-segment__btn--active' : ''}`}
          >
            <span className="ask-butterfly-tier-segment__icon" aria-hidden>
              {tierIcon(option, active ? 'text-accent' : undefined)}
            </span>
            <span className="ask-butterfly-tier-segment__label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
