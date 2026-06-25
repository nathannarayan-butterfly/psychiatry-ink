import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DocumentTemplate } from '../../types/documentTemplate'
import { TemplatePickerDialog } from './TemplatePickerDialog'
import { GeneratedDocumentEditor, GeneratedDocumentEditorLoader } from './GeneratedDocumentEditor'
import {
  TemplateCompletionWizard,
  type TemplateCompletionResult,
} from './TemplateCompletionWizard'
import type { TemplateAvailability } from '../../types/documentTemplate'
import { useDocumentTemplates } from '../../hooks/useDocumentTemplates'

interface TemplateWorkspaceHostProps {
  caseId?: string
  context: keyof TemplateAvailability
  saveToPatientDocuments?: boolean
  /** Open picker immediately */
  autoOpen?: boolean
  onClose: () => void
  /** Optional: open existing generated doc */
  existingDocId?: string
  /** Skip picker and open this template directly */
  initialTemplateId?: string
  /** Skip wizard (legacy one-form flow) */
  skipWizard?: boolean
}

export function TemplateWorkspaceHost({
  caseId,
  context,
  saveToPatientDocuments = false,
  autoOpen = true,
  onClose,
  existingDocId,
  initialTemplateId,
  skipWizard = false,
}: TemplateWorkspaceHostProps) {
  const { templates } = useDocumentTemplates()
  const presetTemplate = useMemo(
    () =>
      initialTemplateId
        ? templates.find((item) => item.id === initialTemplateId) ?? null
        : null,
    [initialTemplateId, templates],
  )
  const [pickerOpen, setPickerOpen] = useState(autoOpen && !existingDocId && !presetTemplate)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(presetTemplate)
  const [wizardOpen, setWizardOpen] = useState(Boolean(presetTemplate && !skipWizard))
  const [wizardResult, setWizardResult] = useState<TemplateCompletionResult | null>(null)

  useEffect(() => {
    if (presetTemplate) {
      setSelectedTemplate(presetTemplate)
      setPickerOpen(false)
      setWizardOpen(!skipWizard)
    }
  }, [presetTemplate, skipWizard])

  const handleSelect = useCallback((template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setPickerOpen(false)
    setWizardOpen(!skipWizard)
    setWizardResult(null)
  }, [skipWizard])

  const handleWizardComplete = useCallback((result: TemplateCompletionResult) => {
    setWizardResult(result)
    setWizardOpen(false)
  }, [])

  const handleWizardClose = useCallback(() => {
    setWizardOpen(false)
    setSelectedTemplate(null)
    onClose()
  }, [onClose])

  const handleEditorClose = useCallback(() => {
    setSelectedTemplate(null)
    setWizardResult(null)
    onClose()
  }, [onClose])

  if (existingDocId && caseId) {
    return (
      <GeneratedDocumentEditorLoader
        caseId={caseId}
        docId={existingDocId}
        onClose={onClose}
      />
    )
  }

  return (
    <>
      {pickerOpen ? (
        <TemplatePickerDialog
          context={context}
          onSelect={handleSelect}
          onClose={() => {
            setPickerOpen(false)
            onClose()
          }}
        />
      ) : null}
      {selectedTemplate && wizardOpen ? (
        <TemplateCompletionWizard
          template={selectedTemplate}
          caseId={caseId}
          onComplete={handleWizardComplete}
          onClose={handleWizardClose}
        />
      ) : null}
      {selectedTemplate && !wizardOpen ? (
        <GeneratedDocumentEditor
          template={selectedTemplate}
          caseId={caseId}
          saveToPatientDocuments={saveToPatientDocuments}
          initialFieldValues={wizardResult?.fieldValues}
          wizardMetadata={
            wizardResult
              ? {
                  instanceId: wizardResult.instanceId,
                  structuredAnswers: wizardResult.structuredAnswers,
                  auditTrail: wizardResult.auditTrail,
                }
              : undefined
          }
          onClose={handleEditorClose}
        />
      ) : null}
    </>
  )
}
