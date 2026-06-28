import { useCallback, useMemo, useState } from 'react'
import { ArrowRightLeft, Loader2, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { executeAiGeneration } from '../../../services/aiGeneration'
import { estimateGenerationCredits } from '../../../utils/estimateCredits'
import type { UiLanguage } from '../../../types/settings'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import '../../../styles/workspace-ai.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneTranslateWidgetProps {
  caseId: string
  onClose: () => void
}

const TRANSLATE_LANGUAGES: UiLanguage[] = ['de', 'en', 'fr', 'es']

function languageLabel(lang: UiLanguage, t: (key: UiTranslationKey) => string): string {
  const keys: Record<UiLanguage, UiTranslationKey> = {
    de: 'standaloneTranslateLang_de',
    en: 'standaloneTranslateLang_en',
    fr: 'standaloneTranslateLang_fr',
    es: 'standaloneTranslateLang_es',
  }
  return t(keys[lang])
}

/**
 * Patient-less translate tool: paste text, pick source/target language,
 * explicit translate button → editable result → copy / save to notes.
 */
export function StandaloneTranslateWidget({ caseId, onClose }: StandaloneTranslateWidgetProps) {
  const { t, language } = useTranslation()
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [source, setSource] = useState('')
  const [sourceLang, setSourceLang] = useState<UiLanguage>(language)
  const [targetLang, setTargetLang] = useState<UiLanguage>(language === 'de' ? 'en' : 'de')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const langOptions = useMemo(
    () =>
      TRANSLATE_LANGUAGES.map((lang) => ({
        value: lang,
        label: languageLabel(lang, t),
      })),
    [t],
  )

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
      const extraInstruction = t('standaloneTranslateInstruction')
        .replace('{sourceLang}', languageLabel(sourceLang, t))
        .replace('{targetLang}', languageLabel(targetLang, t))

      const generation = await executeAiGeneration(
        {
          componentId: 'standalone-translate',
          scope: 'segment',
          tool: 'improve',
          tier: 'standard',
          language: targetLang,
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
              <select
                className="swx-field__select"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as UiLanguage)}
              >
                {langOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="swx-field">
              {t('standaloneTranslateTargetLang')}
              <select
                className="swx-field__select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as UiLanguage)}
              >
                {langOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
