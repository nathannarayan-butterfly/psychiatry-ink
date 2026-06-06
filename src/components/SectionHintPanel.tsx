import { useState } from 'react'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'

interface SectionHintPanelProps {
  description?: string
  exampleHint?: string
  disabled?: boolean
  onApplyExample?: () => void
}

export function SectionHintPanel({
  description,
  exampleHint,
  disabled = false,
  onApplyExample,
}: SectionHintPanelProps) {
  const { t } = useTranslation()
  const [exampleExpanded, setExampleExpanded] = useState(false)

  if (!description && !exampleHint) return null

  return (
    <div className="section-hint-panel shrink-0 px-3 py-2 sm:px-5">
      {description ? (
        <p className="workspace-float-block flex items-start gap-2 px-2.5 py-2 text-[11px] leading-snug text-muted sm:text-xs">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
          <span>{description}</span>
        </p>
      ) : null}

      {exampleHint ? (
        <div className={description ? 'mt-2' : ''}>
          <button
            type="button"
            onClick={() => setExampleExpanded((current) => !current)}
            className="workspace-float-block flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] font-medium text-ink transition-colors hover:border-border-strong sm:text-xs"
            aria-expanded={exampleExpanded}
          >
            <span>{t('sectionExampleLabel')}</span>
            {exampleExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
            )}
          </button>

          {exampleExpanded ? (
            <div className="workspace-float-block mt-2 px-2.5 py-2">
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-ink/85 sm:text-xs">
                {exampleHint}
              </p>
              {onApplyExample ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onApplyExample}
                  className="mt-2 rounded-sm border-2 border-border/70 px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
                >
                  {t('applySectionExample')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
