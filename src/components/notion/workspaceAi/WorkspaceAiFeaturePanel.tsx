import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Copy,
  FileDown,
  Loader2,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useCopyWithFeedback } from '../../../hooks/useCopyWithFeedback'
import { executeAiGeneration } from '../../../services/aiGeneration'
import { estimateGenerationCredits } from '../../../utils/estimateCredits'
import { appendDokument, type DokumentCategory } from '../../../utils/dokumenteArchive'
import { printHtmlDocument } from '../../../utils/print/printDocument'
import {
  buildAufklaerungSource,
  buildLabInterpretationSource,
} from '../../../utils/workspaceAi/buildAiSource'
import { showNotionToast } from '../NotionToast'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type { AiModelTier } from '../../../types'
import '../../../styles/workspace-ai.css'

export type WorkspaceAiFeatureId = 'lab-interpretation' | 'aufklaerung'

interface FeatureConfig {
  componentId: string
  tier: AiModelTier
  titleKey: UiTranslationKey
  instructionKey: UiTranslationKey
  emptySourceKey: UiTranslationKey
  docTitleKey: UiTranslationKey
  docCategory: DokumentCategory
  pageType: string
  buildSource: (caseId: string) => string
}

const FEATURES: Record<WorkspaceAiFeatureId, FeatureConfig> = {
  'lab-interpretation': {
    componentId: 'lab-interpretation',
    tier: 'thorough',
    titleKey: 'workspaceAiLabTitle',
    instructionKey: 'workspaceAiLabInstruction',
    emptySourceKey: 'workspaceAiLabEmpty',
    docTitleKey: 'workspaceAiLabDocTitle',
    docCategory: 'laborbefunde',
    pageType: 'lab-interpretation',
    buildSource: buildLabInterpretationSource,
  },
  aufklaerung: {
    componentId: 'patient-aufklaerung',
    tier: 'standard',
    titleKey: 'workspaceAiAufklaerungTitle',
    instructionKey: 'workspaceAiAufklaerungInstruction',
    emptySourceKey: 'workspaceAiAufklaerungEmpty',
    docTitleKey: 'workspaceAiAufklaerungDocTitle',
    docCategory: 'formulare',
    pageType: 'patient-aufklaerung',
    buildSource: buildAufklaerungSource,
  },
}

interface WorkspaceAiFeaturePanelProps {
  feature: WorkspaceAiFeatureId
  caseId?: string
  onClose: () => void
}

/**
 * In-workspace AI feature surface (Items 10 & 11). Gathers case context, runs a
 * credit-guarded server generation, and presents the editable result with the
 * standard icon actions (copy / export / print / regenerate / delete / save).
 */
export function WorkspaceAiFeaturePanel({ feature, caseId, onClose }: WorkspaceAiFeaturePanelProps) {
  const { t, language } = useTranslation()
  const config = FEATURES[feature]
  const { copied, copy } = useCopyWithFeedback()

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const runIdRef = useRef(0)

  const generate = useCallback(async () => {
    if (!caseId) {
      setStatus('empty')
      return
    }
    const source = config.buildSource(caseId)
    if (!source.trim()) {
      setStatus('empty')
      return
    }

    const runId = ++runIdRef.current
    setStatus('loading')
    setErrorMessage(null)
    setSaved(false)

    try {
      const generation = await executeAiGeneration(
        {
          componentId: config.componentId,
          scope: 'segment',
          tool: 'structure',
          tier: config.tier,
          language,
          sourceText: source,
          extraInstruction: t(config.instructionKey),
          caseId,
        },
        {
          estimatedCredits: estimateGenerationCredits(config.tier, source),
          pseudonymizationActiveLabel: t('pseudonymizationActive'),
        },
      )
      if (runId !== runIdRef.current) return
      setText(generation.text.trim())
      setStatus('ready')
    } catch (error) {
      if (runId !== runIdRef.current) return
      const message =
        error instanceof Error && error.message ? error.message : t('workspaceAiError')
      setErrorMessage(message)
      setStatus('error')
    }
  }, [caseId, config, language, t])

  // NOTE: generation is EXPLICIT — never auto-run on mount. Spending credits
  // (and pulling case context) must require a deliberate clinician action, so
  // the panel opens in the `idle` state with a Generate button.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = useCallback(() => {
    void copy(text)
  }, [copy, text])

  const handleExport = useCallback(() => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${t(config.docTitleKey)}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [text, t, config.docTitleKey])

  const handlePrint = useCallback(() => {
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const docTitle = escape(t(config.docTitleKey))
    const html =
      `<!doctype html><html><head><meta charset="utf-8"><title>${docTitle}</title>` +
      '<style>body{font:13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#1f1f1f;max-width:48rem;margin:2rem auto;padding:0 1.5rem;white-space:pre-wrap;}h1{font-size:1.1rem;margin-bottom:1rem;}</style>' +
      `</head><body><h1>${docTitle}</h1><div>${escape(text)}</div></body></html>`
    printHtmlDocument(html)
  }, [text, t, config.docTitleKey])

  const handleDelete = useCallback(() => {
    setText('')
    onClose()
  }, [onClose])

  const handleSave = useCallback(() => {
    if (!caseId || !text.trim()) return
    appendDokument(caseId, {
      category: config.docCategory,
      title: t(config.docTitleKey),
      content: text,
      date: new Date().toISOString(),
      source: 'ai-accepted',
      pageType: config.pageType,
    })
    setSaved(true)
    showNotionToast(t('workspaceAiSaved'))
  }, [caseId, text, config, t])

  const busy = status === 'loading'
  const hasResult = status === 'ready'

  return (
    <div className="wai-overlay" role="dialog" aria-modal="true" aria-label={t(config.titleKey)}>
      <div className="wai-panel">
        <header className="wai-panel__header">
          <span className="wai-panel__eyebrow">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('workspaceAiEyebrow')}
          </span>
          <h2 className="wai-panel__title">{t(config.titleKey)}</h2>
          <button
            type="button"
            className="wai-panel__close"
            onClick={onClose}
            aria-label={t('dokumenteClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="wai-panel__body">
          {status === 'idle' ? (
            <div className="wai-panel__state">
              <p>{t(config.instructionKey)}</p>
              <button
                type="button"
                className="wai-btn wai-btn--primary"
                onClick={() => void generate()}
                disabled={!caseId}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {t('workspaceAiGenerate')}
              </button>
            </div>
          ) : busy ? (
            <div className="wai-panel__state">
              <Loader2 className="h-5 w-5 wai-spin" strokeWidth={2} aria-hidden />
              <p>{t('workspaceAiGenerating')}</p>
            </div>
          ) : status === 'empty' ? (
            <div className="wai-panel__state">
              <p>{t(config.emptySourceKey)}</p>
            </div>
          ) : status === 'error' ? (
            <div className="wai-panel__state wai-panel__state--error">
              <p>{errorMessage ?? t('workspaceAiError')}</p>
              <button type="button" className="wai-btn wai-btn--ghost" onClick={() => void generate()}>
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {t('workspaceAiRetry')}
              </button>
            </div>
          ) : (
            <textarea
              className="wai-panel__editor"
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setSaved(false)
              }}
              aria-label={t(config.titleKey)}
              spellCheck
            />
          )}
        </div>

        {hasResult ? (
          <footer className="wai-panel__footer">
            <div className="wai-panel__actions">
              <button
                type="button"
                className="wai-icon-btn"
                onClick={handleCopy}
                title={copied ? t('copyButtonCopied') : t('workspaceAiCopy')}
                aria-label={copied ? t('copyButtonCopied') : t('workspaceAiCopy')}
              >
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="wai-icon-btn"
                onClick={handleExport}
                title={t('workspaceAiExport')}
                aria-label={t('workspaceAiExport')}
              >
                <FileDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="wai-icon-btn"
                onClick={handlePrint}
                title={t('workspaceAiPrint')}
                aria-label={t('workspaceAiPrint')}
              >
                <Printer className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="wai-icon-btn"
                onClick={() => void generate()}
                title={t('workspaceAiRegenerate')}
                aria-label={t('workspaceAiRegenerate')}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="wai-icon-btn wai-icon-btn--danger"
                onClick={handleDelete}
                title={t('workspaceAiDelete')}
                aria-label={t('workspaceAiDelete')}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <button
              type="button"
              className="wai-btn wai-btn--primary"
              onClick={handleSave}
              disabled={!caseId || !text.trim() || saved}
            >
              {saved ? (
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              ) : (
                <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              )}
              {saved ? t('workspaceAiSaved') : t('workspaceAiSave')}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  )
}
