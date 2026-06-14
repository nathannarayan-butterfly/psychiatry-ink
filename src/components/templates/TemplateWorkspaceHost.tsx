import { useCallback, useState } from 'react'
import type { DocumentTemplate } from '../../types/documentTemplate'
import { TemplatePickerDialog } from './TemplatePickerDialog'
import { GeneratedDocumentEditor, GeneratedDocumentEditorLoader } from './GeneratedDocumentEditor'
import type { TemplateAvailability } from '../../types/documentTemplate'

interface TemplateWorkspaceHostProps {
  caseId?: string
  context: keyof TemplateAvailability
  saveToPatientDocuments?: boolean
  /** Open picker immediately */
  autoOpen?: boolean
  onClose: () => void
  /** Optional: open existing generated doc */
  existingDocId?: string
}

export function TemplateWorkspaceHost({
  caseId,
  context,
  saveToPatientDocuments = false,
  autoOpen = true,
  onClose,
  existingDocId,
}: TemplateWorkspaceHostProps) {
  const [pickerOpen, setPickerOpen] = useState(autoOpen && !existingDocId)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)

  const handleSelect = useCallback((template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setPickerOpen(false)
  }, [])

  const handleEditorClose = useCallback(() => {
    setSelectedTemplate(null)
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
      {selectedTemplate ? (
        <GeneratedDocumentEditor
          template={selectedTemplate}
          caseId={caseId}
          saveToPatientDocuments={saveToPatientDocuments}
          onClose={handleEditorClose}
        />
      ) : null}
    </>
  )
}
