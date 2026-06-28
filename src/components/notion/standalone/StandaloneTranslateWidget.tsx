import { useCallback, useState } from 'react'
import { ArrowRightLeft, Loader2, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { executeAiGeneration } from '../../../services/aiGeneration'
import { estimateGenerationCredits } from '../../../utils/estimateCredits'
import type { UiLanguage } from '../../../types/settings'
import {
  translationLanguageLabel,
} from '../../../data/aiTranslationLanguages'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import { TranslationLanguageCombobox } from './TranslationLanguageCombobox'
import '../../../styles/workspace-ai.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneTranslateWidgetProps {
  caseId: string
  onClose: () => void
}

const UI_TO_DEFAULT_LANG: Record<UiLanguage, string> = {
  de: 'de',
  en: 'en',
  fr: 'fr',
  es: 'es',
}

/**
 * Patient-less translate tool: paste text, pick source/target language from a
 * searchable list of ~30 locales, explicit translate button → result → notes.
 */
export function StandaloneTranslateWidget({ caseId, onClose }: StandaloneTranslateWidgetProps) {
  const { t, language } = useTranslation()
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [source, setSource] = useState('')
  const [sourceLang, setSourceLang] = useState(UI_TO_DEFAULT_LANG[language])
  const [targetLang, setTargetLang] = useState(language === 'de' ? 'en' : 'de')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const translate = useCallback(async () => {
    const trimmed = source.trim()
    if (!trimmed || busy) return
    if (sourceLang === targetLang) {
      setError(t('standaloneTranslateSameLanguage'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const sourceLabel = translationLanguageLabel(sourceLang)
      const targetLabel = translationLanguageLabel(targetLang)
      const extraInstruction = t('standaloneTranslateInstruction')
        .replace('{sourceLang}', sourceLabel)
        .replace('{targetLang}', targetLabel)

      const promptLanguage: UiLanguage =
        targetLang === 'de' || targetLang === 'en' || targetLang === 'fr' || targetLang === 'es'
          ? targetLang
          : 'en'

      const generation = await executeAiGeneration(
        {
          componentId: 'standalone-translate',
          scope: 'segment',
          tool: 'improve',
          tier: 'standard',
          language: promptLanguage,
          sourceText: trimmed,
          extraInstruction,
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
  }, [source, busy, sourceLang, targetLang, t])

  if (phase === 'result') {
    return (
      <StandaloneResultPanel
        caseId={caseId}
        title={t('standaloneTranslateTitle')}
        noteKind="translation"
        noteCategory="formulare"
        text={text}
        onTextChange={setText}
        onClose={onClose}
        onRegenerate={() => void translate()}
        regenerating={busy}
      />
    )
  }

  return (
    <div className="wai-panel wai-panel--inline" aria-label={t('standaloneTranslateTitle')}>
      <header className="wai-panel__header">
        <span className="wai-panel__eyebrow">
          <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('standaloneTranslateEyebrow')}
        </span>
        <h2 className="wai-panel__title">{t('standaloneTranslateTitle')}</h2>
        <button
          type="button"
          className="wai-panel__close"
          onClick={onClose}
          aria-label={t('dokumenteClose')}
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div className="wai-panel__body wai-panel__body--fill">
        <div className="swx-form swx-form--fill">
          <div className="swx-translate__langs">
            <label className="swx-field">
              {t('standaloneTranslateSourceLang')}
              <TranslationLanguageCombobox
                value={sourceLang}
                onChange={setSourceLang}
                ariaLabel={t('standaloneTranslateSourceLang')}
                noResultsLabel={t('standaloneTranslateNoLanguageMatch')}
              />
            </label>
            <label className="swx-field">
              {t('standaloneTranslateTargetLang')}
              <TranslationLanguageCombobox
                value={targetLang}
                onChange={setTargetLang}
                ariaLabel={t('standaloneTranslateTargetLang')}
                noResultsLabel={t('standaloneTranslateNoLanguageMatch')}
              />
            </label>
          </div>

          <label className="swx-field swx-field--grow">
            {t('standaloneTranslateInputLabel')}
            <textarea
              className="swx-rewrite__editor"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t('standaloneTranslatePlaceholder')}
              aria-label={t('standaloneTranslateInputLabel')}
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
          onClick={() => void translate()}
          disabled={!source.trim() || busy}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 wai-spin" strokeWidth={1.75} aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          )}
          {busy ? t('workspaceAiGenerating') : t('standaloneTranslateAction')}
        </button>
      </footer>
    </div>
  )
}
