import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { AufnahmeBefundInputMode, AufnahmeSectionMetadata } from '../../../types/anamneseBefund'
import { isAufnahmePsychopathSection } from '../../../types/anamneseBefund'
import type { GuidedEntryFieldValues } from '../../../types/guidedEntry'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import { generateGuidedNarrative } from '../../../utils/guidedEntry/generateNarrative'
import { defaultShortTemplateForSection } from '../../../utils/anamnese/befundNarrative'
import { buildPsychopathNormalBefundText } from '../../../data/psychopathNormalBefund'
import { metadataForGeneratedContent } from '../../../utils/anamnese/befundMetadata'
import { GuidedEntryWizard } from '../../guidedEntry/GuidedEntryWizard'
import { AufnahmeBefundShortModal } from './AufnahmeBefundShortModal'
import { AufnahmePsychopathToolbar } from './AufnahmePsychopathToolbar'
import '../../../styles/aufnahme-befund.css'

export interface AufnahmePsychopathSectionHostProps {
  sectionId: string
  isActive: boolean
  readOnly?: boolean
  caseId?: string
  content: string
  metadata?: AufnahmeSectionMetadata
  onContentChange: (sectionId: string, value: string) => void
  onMetadataChange: (sectionId: string, metadata: AufnahmeSectionMetadata | undefined) => void
  onFocusEditor: (sectionId: string) => void
}

/**
 * Entry-mode host for the Aufnahme "Psychopathologischer Befund" section
 * (Item 7). Offers four ways to capture the mental-state exam, all reusing the
 * existing guided-entry / AMDP architecture rather than new bespoke logic:
 *
 *  - Freitext  — plain typing in the section textarea
 *  - Kurztext  — short normal-finding template (editable in the short modal)
 *  - AMDP      — full AMDP-structured normal befund template (all sections)
 *  - Geführt   — step-by-step AMDP wizard (`psychopath-finding`), which walks
 *                through EVERY AMDP section and produces a narrative
 *
 * The guided mode uses the same `psychopath-finding` schema as the standalone
 * Psychopath document, so all AMDP sections appear — not just a subset.
 */
export function AufnahmePsychopathSectionHost({
  sectionId,
  isActive,
  readOnly = false,
  caseId,
  content,
  metadata,
  onContentChange,
  onMetadataChange,
  onFocusEditor,
}: AufnahmePsychopathSectionHostProps) {
  const { t, language } = useTranslation()
  const [shortOpen, setShortOpen] = useState(false)
  const [guidedOpen, setGuidedOpen] = useState(false)
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    text: string
    values: GuidedEntryFieldValues
    mode: AufnahmeBefundInputMode
  } | null>(null)

  // The full AMDP guided schema — same one the standalone Psychopath document
  // uses, so every AMDP section is represented.
  const guidedSchema = useMemo(() => getGuidedEntrySchema('psychopath-finding'), [])

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
      metadataForGeneratedContent(pendingOverwrite.mode, pendingOverwrite.values),
    )
    setPendingOverwrite(null)
  }, [onContentChange, onMetadataChange, pendingOverwrite, sectionId])

  const handleFree = useCallback(() => {
    // Free typing: keep existing content, just mark the mode and focus the editor.
    onMetadataChange(sectionId, {
      inputMode: 'free',
      generatedAt: metadata?.generatedAt,
      manuallyEdited: metadata?.manuallyEdited,
    })
    onFocusEditor(sectionId)
  }, [metadata, onFocusEditor, onMetadataChange, sectionId])

  const handleAmdp = useCallback(() => {
    // Insert the full AMDP-structured normal befund covering all sections.
    applyGenerated(buildPsychopathNormalBefundText(undefined, language), undefined, 'amdp')
  }, [applyGenerated, language])

  const handleRegenerate = useCallback(() => {
    const answers = metadata?.structuredAnswers
    if (!answers || Object.keys(answers).length === 0) return
    const { text } = generateGuidedNarrative(guidedSchema, answers, language)
    applyGenerated(text, answers, metadata?.inputMode ?? 'guided')
  }, [applyGenerated, guidedSchema, language, metadata])

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

  if (!isAufnahmePsychopathSection(sectionId) || !isActive) return null

  return (
    <>
      <AufnahmePsychopathToolbar
        activeMode={metadata?.inputMode}
        readOnly={readOnly}
        hasContent={Boolean(content.trim())}
        canRegenerate={Boolean(
          metadata?.structuredAnswers && Object.keys(metadata.structuredAnswers).length > 0,
        )}
        onFree={handleFree}
        onShort={() => setShortOpen(true)}
        onAmdp={handleAmdp}
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
              <button
                type="button"
                className="aufnahme-befund-btn aufnahme-befund-btn--ghost"
                onClick={() => setPendingOverwrite(null)}
              >
                {t('guidedEntryCancel')}
              </button>
              <button
                type="button"
                className="aufnahme-befund-btn aufnahme-befund-btn--primary"
                onClick={confirmOverwrite}
              >
                {t('aufnahmeBefundOverwriteConfirmAction')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
