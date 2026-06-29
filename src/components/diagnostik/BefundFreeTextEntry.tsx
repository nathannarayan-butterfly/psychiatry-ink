import { useCallback, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { executeAiGeneration } from '../../services/aiGeneration'
import { estimateGenerationCredits } from '../../utils/estimateCredits'

interface BefundFreeTextEntryProps {
  /** Header title (the befund kind, e.g. "Röntgen-Befund"). */
  title: string
  /** AI metering component id. */
  componentId: string
  /** Back / cancel out of the free-text mode. */
  onBack: () => void
  /** Receives the chosen narrative (raw or AI-optimised). */
  onText: (text: string) => void
}

/**
 * Free-text Befund entry with explicit KI-Optimierung — the shared core behind
 * both the patient-less {@link StandaloneBefundWidget} and the patient-context
 * Befund widget. The clinician types a draft and either uses it verbatim or runs
 * an explicit AI improve pass (never auto-runs on mount). The parent decides
 * where the resulting text is persisted.
 */
export function BefundFreeTextEntry({ title, componentId, onBack, onText }: BefundFreeTextEntryProps) {
  const { t, language } = useTranslation()
  const [freeText, setFreeText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optimize = useCallback(async () => {
    const trimmed = freeText.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      const generation = await executeAiGeneration(
        {
          componentId,
          scope: 'segment',
          tool: 'improve',
          tier: 'standard',
          language,
          sourceText: trimmed,
          extraInstruction: t('standaloneBefundFreetextInstruction').replace('{title}', title),
        },
        { estimatedCredits: estimateGenerationCredits('standard', trimmed) },
      )
      onText(generation.text.trim())
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('workspaceAiError'))
    } finally {
      setBusy(false)
    }
  }, [busy, componentId, freeText, language, onText, t, title])

  const useRaw = useCallback(() => {
    const trimmed = freeText.trim()
    if (!trimmed) return
    onText(trimmed)
  }, [freeText, onText])

  return (
    <div className="wai-panel wai-panel--inline" aria-label={title}>
      <header className="wai-panel__header">
        <h2 className="wai-panel__title">{title}</h2>
        <button
          type="button"
          className="wai-panel__close"
          onClick={onBack}
          aria-label={t('dokumenteClose')}
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </header>
      <div className="wai-panel__body wai-panel__body--fill">
        <div className="swx-form swx-form--fill">
          <label className="swx-field swx-field--grow">
            {t('standaloneBefundFreetextLabel')}
            <textarea
              className="swx-rewrite__editor"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={t('standaloneBefundFreetextPlaceholder')}
              aria-label={t('standaloneBefundFreetextLabel')}
              spellCheck
            />
          </label>
          {error ? <p className="swx-error">{error}</p> : null}
        </div>
      </div>
      <footer className="wai-panel__footer">
        <button type="button" className="wai-btn wai-btn--ghost" onClick={onBack}>
          {t('standaloneCancel')}
        </button>
        <button
          type="button"
          className="wai-btn wai-btn--ghost"
          onClick={useRaw}
          disabled={!freeText.trim() || busy}
        >
          {t('standaloneBefundUseRaw')}
        </button>
        <button
          type="button"
          className="wai-btn wai-btn--primary"
          onClick={() => void optimize()}
          disabled={!freeText.trim() || busy}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 wai-spin" strokeWidth={1.75} aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          )}
          {busy ? t('workspaceAiGenerating') : t('standaloneBefundOptimize')}
        </button>
      </footer>
    </div>
  )
}
