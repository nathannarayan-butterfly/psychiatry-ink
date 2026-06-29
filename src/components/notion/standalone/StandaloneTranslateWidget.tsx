import { useCallback, useState } from 'react'
import { ArrowRightLeft, Loader2, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { executeAiGeneration } from '../../../services/aiGeneration'
import { estimateGenerationCredits } from '../../../utils/estimateCredits'
import type { UiLanguage } from '../../../types/settings'
import {
  AUTO_DETECT_LANGUAGE,
  getOutputTranslationLanguages,
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

const OUTPUT_LANGUAGES = getOutputTranslationLanguages()

/**
 * Patient-less translate tool. Because this runs through an LLM, the INPUT may be
 * any language (default "Automatisch erkennen" / auto-detect, plus a searchable
 * list of ~30 locales), while the OUTPUT is restricted to the four product
 * locales (DE/EN/FR/ES). After translating, the ORIGINAL text stays available in
 * a collapsible section beside the editable translation. Explicit run only.
 */
export function StandaloneTranslateWidget({ caseId, onClose }: StandaloneTranslateWidgetProps) {
  const { t, language } = useTranslation()
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [source, setSource] = useState('')
  const [sourceLang, setSourceLang] = useState(AUTO_DETECT_LANGUAGE)
  const [targetLang, setTargetLang] = useState<string>(language === 'de' ? 'en' : 'de')
  const [text, setText] = useState('')
  /** The exact source text that produced the current translation (for #15-UX). */
  const [translatedFrom, setTranslatedFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const translate = useCallback(async () => {
    const trimmed = source.trim()
    if (!trimmed || busy) return
    if (sourceLang !== AUTO_DETECT_LANGUAGE && sourceLang === targetLang) {
      setError(t('standaloneTranslateSameLanguage'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const sourceLabel =
        sourceLang === AUTO_DETECT_LANGUAGE
          ? t('standaloneTranslateAutoDetect')
          : translationLanguageLabel(sourceLang)
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
      setTranslatedFrom(trimmed)
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
        aboveEditor={
          translatedFrom ? (
            <details className="swx-translate__original">
              <summary>{t('standaloneTranslateShowOriginal')}</summary>
              <p className="swx-translate__original-text">{translatedFrom}</p>
            </details>
          ) : null
        }
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
          <p className="swx-empty">{t('standaloneTranslateSubheading')}</p>
          <div className="swx-translate__langs">
            <label className="swx-field">
              {t('standaloneTranslateSourceLang')}
              <TranslationLanguageCombobox
                value={sourceLang}
                onChange={setSourceLang}
                ariaLabel={t('standaloneTranslateSourceLang')}
                noResultsLabel={t('standaloneTranslateNoLanguageMatch')}
                autoDetectLabel={t('standaloneTranslateAutoDetect')}
              />
            </label>
            <label className="swx-field">
              {t('standaloneTranslateTargetLang')}
              <select
                className="swx-field__select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                aria-label={t('standaloneTranslateTargetLang')}
              >
                {OUTPUT_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
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
