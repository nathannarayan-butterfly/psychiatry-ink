import { useState } from 'react'
import { ListChecks, PenLine, Stethoscope, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { getBefundSchema } from '../../data/befundSchemas'
import { getGuidedEntrySchema } from '../../data/guidedEntry/schemas'
import type { BefundRecord, BefundType } from '../../types/befund'
import type { GuidedEntryItemType } from '../../types/guidedEntry'
import {
  createBefundRecord,
  getDiagnostikBefund,
  upsertDiagnostikBefund,
} from '../../utils/befundArchive'
import { syncBefundDokument } from '../../utils/befundDokumente'
import { applyGuidedOutput } from '../../utils/guidedEntry/applyGuidedOutput'
import { GuidedEntryWizard } from '../guidedEntry/GuidedEntryWizard'
import { showNotionToast } from '../notion/NotionToast'
import { BefundFreeTextEntry } from './BefundFreeTextEntry'
import { BefundPopup } from './BefundPopup'
import '../../styles/workspace-ai.css'
import '../../styles/standalone-workspace.css'

/** Guided itemType per structured befund type (only those with a guided schema). */
const GUIDED_ITEM_BY_TYPE: Partial<Record<BefundType, GuidedEntryItemType>> = {
  ecg: 'befund-ecg',
  roentgen: 'befund-roentgen',
}

type Phase = 'choose' | 'plain' | 'guided' | 'freetext'

interface PatientBefundWidgetProps {
  caseId: string
  type: BefundType
  /** Edit an existing record — skips the mode chooser, opens the structured form. */
  recordId?: string
  onClose: () => void
  onSaved: (record: BefundRecord) => void
}

/**
 * Patient-context Befund entry offering the same three modes as the patient-less
 * {@link StandaloneBefundWidget} — plain structured form, step-by-step guided
 * wizard, and free-text with explicit KI-Optimierung — but every mode writes a
 * structured {@link BefundRecord} into the case Diagnostik archive (not a
 * free-standing note). Editing always opens the structured form directly.
 */
export function PatientBefundWidget({
  caseId,
  type,
  recordId,
  onClose,
  onSaved,
}: PatientBefundWidgetProps) {
  const { t, language } = useTranslation()
  const schema = getBefundSchema(type, language)
  const guidedItemType = GUIDED_ITEM_BY_TYPE[type]
  const [phase, setPhase] = useState<Phase>(recordId ? 'plain' : 'choose')

  const saveNarrative = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const record = createBefundRecord(caseId, type, schema.version, { narrative: trimmed }, 'draft')
    upsertDiagnostikBefund(caseId, record)
    syncBefundDokument(record, language)
    showNotionToast(t('befundSavedDraft'))
    onSaved(record)
    onClose()
  }

  if (phase === 'plain') {
    return (
      <BefundPopup
        caseId={caseId}
        type={type}
        recordId={recordId}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
  }

  if (phase === 'guided' && guidedItemType) {
    const guidedSchema = getGuidedEntrySchema(guidedItemType)
    return (
      <GuidedEntryWizard
        open
        schema={guidedSchema}
        caseId={caseId}
        onSaveDraft={() => undefined}
        onGenerate={(payload) => {
          const result = applyGuidedOutput({
            caseId,
            schema: guidedSchema,
            text: payload.text,
            answers: payload.answers,
            instanceId: crypto.randomUUID(),
            mode: 'guided',
            language,
          })
          const saved = result.targetEntityId
            ? getDiagnostikBefund(caseId, result.targetEntityId)
            : null
          showNotionToast(t('befundSavedDraft'))
          if (saved) onSaved(saved)
          onClose()
        }}
        onCancel={() => setPhase('choose')}
      />
    )
  }

  if (phase === 'freetext') {
    return (
      <div
        className="therapy-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={schema.title}
        onClick={onClose}
      >
        <div
          className="therapy-modal therapy-modal--wide befund-popup"
          onClick={(e) => e.stopPropagation()}
        >
          <BefundFreeTextEntry
            title={schema.title}
            componentId={`patient-befund-${type}`}
            onBack={() => setPhase('choose')}
            onText={saveNarrative}
          />
        </div>
      </div>
    )
  }

  // choose
  return (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={schema.title}
      onClick={onClose}
    >
      <div
        className="therapy-modal befund-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h2 className="therapy-modal__title">{schema.title}</h2>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={onClose}
            aria-label={t('dokumenteClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="therapy-modal__body">
          <p className="swx-empty">{t('guidedEntryModeDesc')}</p>
          <div className="swx-mode-grid">
            <button type="button" className="swx-mode-card" onClick={() => setPhase('plain')}>
              <Stethoscope className="h-5 w-5" strokeWidth={1.6} aria-hidden />
              <span className="swx-mode-card__title">{t('befundModeStructured')}</span>
              <span className="swx-mode-card__desc">{t('befundModeStructuredDesc')}</span>
            </button>
            {guidedItemType ? (
              <button type="button" className="swx-mode-card" onClick={() => setPhase('guided')}>
                <ListChecks className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                <span className="swx-mode-card__title">{t('guidedEntryModeGuided')}</span>
                <span className="swx-mode-card__desc">{t('guidedEntryModeGuidedDesc')}</span>
              </button>
            ) : null}
            <button type="button" className="swx-mode-card" onClick={() => setPhase('freetext')}>
              <PenLine className="h-5 w-5" strokeWidth={1.6} aria-hidden />
              <span className="swx-mode-card__title">{t('standaloneBefundModeFreetext')}</span>
              <span className="swx-mode-card__desc">{t('standaloneBefundModeFreetextDesc')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
