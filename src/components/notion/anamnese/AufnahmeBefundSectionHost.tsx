import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { AufnahmeBefundInputMode, AufnahmeSectionMetadata } from '../../../types/anamneseBefund'
import { isAufnahmeBefundSection } from '../../../types/anamneseBefund'
import type { GuidedEntryFieldValues } from '../../../types/guidedEntry'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import {
  generateBefundNarrativeForSection,
  defaultShortTemplateForSection,
} from '../../../utils/anamnese/befundNarrative'
import { metadataForGeneratedContent } from '../../../utils/anamnese/befundMetadata'
import { GuidedEntryWizard } from '../../guidedEntry/GuidedEntryWizard'
import { AufnahmeBefundLongModal } from './AufnahmeBefundLongModal'
import { AufnahmeBefundShortModal } from './AufnahmeBefundShortModal'
import { AufnahmeBefundSectionToolbar } from './AufnahmeBefundSectionToolbar'
import '../../../styles/aufnahme-befund.css'

export interface AufnahmeBefundSectionHostProps {
  sectionId: string
  isActive: boolean
  readOnly?: boolean
  caseId?: string
  content: string
  metadata?: AufnahmeSectionMetadata
  onContentChange: (sectionId: string, value: string) => void
  onMetadataChange: (sectionId: string, metadata: AufnahmeSectionMetadata | undefined) => void
  onFocusEditor: (sectionId: string) => void
  onAiGenerate?: (sectionId: string) => void
}

function guidedItemTypeForSection(sectionId: string): 'anamnese-somatic-befund' | 'anamnese-neuro-befund' {
  return sectionId === 'neurologischer-befund' ? 'anamnese-neuro-befund' : 'anamnese-somatic-befund'
}

export function AufnahmeBefundSectionHost({
  sectionId,
  isActive,
  readOnly = false,
  caseId,
  content,
  metadata,
  onContentChange,
  onMetadataChange,
  onFocusEditor,
  onAiGenerate,
}: AufnahmeBefundSectionHostProps) {
  const { t } = useTranslation()
  const [shortOpen, setShortOpen] = useState(false)
  const [longOpen, setLongOpen] = useState(false)
  const [guidedOpen, setGuidedOpen] = useState(false)
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    text: string
    values: GuidedEntryFieldValues
    mode: AufnahmeBefundInputMode
  } | null>(null)

  const guidedSchema = useMemo(
    () => getGuidedEntrySchema(guidedItemTypeForSection(sectionId)),
    [sectionId],
  )

  const applyGenerated = useCallback(
    (text: string, values: GuidedEntryFieldValues | undefined, mode: AufnahmeBefundInputMode) => {
      if (content.trim() && metadata?.manuallyEdited) {
        setPendingOverwrite({ text, values: values ?? {}, mode })
        return
      }
      onContentChange(sectionId, text)
      onMetadataChange(sectionId, metadataForGeneratedContent(mode, values))
    },
    [content, metadata, onContentChange, onMetadataChange, sectionId],
  )

  const confirmOverwrite = useCallback(() => {
    if (!pendingOverwrite) return
    onContentChange(sectionId, pendingOverwrite.text)
    onMetadataChange(
      sectionId,
      metadataForGeneratedContent(
        pendingOverwrite.mode,
        pendingOverwrite.values,
      ),
    )
    setPendingOverwrite(null)
  }, [metadata, onContentChange, onMetadataChange, pendingOverwrite, sectionId])

  const handleRegenerate = useCallback(() => {
    const answers = metadata?.structuredAnswers
    if (!answers || Object.keys(answers).length === 0) {
      if (metadata?.inputMode === 'short' && onAiGenerate) {
        onAiGenerate(sectionId)
      }
      return
    }
    const text = generateBefundNarrativeForSection(sectionId, answers)
    applyGenerated(text, answers, metadata?.inputMode ?? 'long')
  }, [applyGenerated, metadata, onAiGenerate, sectionId])

  const handleRemove = useCallback(() => {
    if (content.trim() && !window.confirm(t('aufnahmeBefundRemoveConfirm'))) return
    onContentChange(sectionId, '')
    onMetadataChange(sectionId, undefined)
  }, [content, onContentChange, onMetadataChange, sectionId, t])

  const handleGuidedGenerate = useCallback(
    (payload: { text: string; values: GuidedEntryFieldValues }) => {
      setGuidedOpen(false)
      applyGenerated(payload.text, payload.values, 'guided')
    },
    [applyGenerated],
  )

  if (!isAufnahmeBefundSection(sectionId) || !isActive) return null

  return (
    <>
      <AufnahmeBefundSectionToolbar
        activeMode={metadata?.inputMode}
        readOnly={readOnly}
        hasContent={Boolean(content.trim())}
        canRegenerate={Boolean(
          metadata?.structuredAnswers && Object.keys(metadata.structuredAnswers).length > 0,
        ) || metadata?.inputMode === 'short'}
        onShort={() => setShortOpen(true)}
        onLong={() => setLongOpen(true)}
        onGuided={() => setGuidedOpen(true)}
        onRegenerate={handleRegenerate}
        onEdit={() => onFocusEditor(sectionId)}
        onRemove={handleRemove}
      />

      <AufnahmeBefundShortModal
        open={shortOpen}
        sectionId={sectionId}
        initialText={content || defaultShortTemplateForSection(sectionId)}
        onClose={() => setShortOpen(false)}
        onSave={(text) => {
          setShortOpen(false)
          onContentChange(sectionId, text)
          onMetadataChange(sectionId, {
            inputMode: 'short',
            generatedAt: metadata?.generatedAt,
            manuallyEdited: text !== defaultShortTemplateForSection(sectionId),
          })
        }}
        onAiGenerate={
          onAiGenerate
            ? () => {
                setShortOpen(false)
                onAiGenerate(sectionId)
              }
            : undefined
        }
      />

      <AufnahmeBefundLongModal
        open={longOpen}
        sectionId={sectionId}
        initialValues={metadata?.structuredAnswers ?? {}}
        onClose={() => setLongOpen(false)}
        onSave={(values) => {
          setLongOpen(false)
          const text = generateBefundNarrativeForSection(sectionId, values)
          applyGenerated(text, values, 'long')
        }}
      />

      <GuidedEntryWizard
        open={guidedOpen}
        schema={guidedSchema}
        caseId={caseId ?? 'default'}
        initialValues={metadata?.structuredAnswers ?? {}}
        onSaveDraft={() => undefined}
        onGenerate={(payload) =>
          handleGuidedGenerate({ text: payload.text, values: payload.values })
        }
        onCancel={() => setGuidedOpen(false)}
      />

      {pendingOverwrite ? (
        <div className="aufnahme-befund-confirm" role="dialog" aria-modal="true">
          <div className="aufnahme-befund-confirm__card">
            <p>{t('aufnahmeBefundOverwriteConfirm')}</p>
            <div className="aufnahme-befund-confirm__actions">
              <button type="button" className="aufnahme-befund-btn aufnahme-befund-btn--ghost" onClick={() => setPendingOverwrite(null)}>
                {t('guidedEntryCancel')}
              </button>
              <button type="button" className="aufnahme-befund-btn aufnahme-befund-btn--primary" onClick={confirmOverwrite}>
                {t('aufnahmeBefundOverwriteConfirmAction')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
