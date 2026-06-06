import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { NOTION_PAGES, type NotionPageId } from '../notion/notionPages'

export const NEW_CASE_WORKFLOW_PAGES: NotionPageId[] = [
  'aufnahme',
  'verlauf',
  'psychopath',
  'therapie-verlauf',
  'medikation',
  'therapieplanung',
  'labor',
]

interface NewCaseWorkflowDialogProps {
  onSelect: (pageId: NotionPageId) => void
  onStayOnDashboard: () => void
  onClose: () => void
}

export function NewCaseWorkflowDialog({
  onSelect,
  onStayOnDashboard,
  onClose,
}: NewCaseWorkflowDialogProps) {
  const { t } = useTranslation()

  const pages = NOTION_PAGES.filter((page) => NEW_CASE_WORKFLOW_PAGES.includes(page.id))

  return (
    <div
      className="new-case-workflow-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="new-case-workflow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-case-workflow-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="new-case-workflow-dialog__header">
          <h2 id="new-case-workflow-title" className="new-case-workflow-dialog__title">
            {t('workflowSelectTitle')}
          </h2>
          <button
            type="button"
            className="new-case-workflow-dialog__close"
            onClick={onClose}
            aria-label={t('settingsClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <p className="new-case-workflow-dialog__intro">{t('workflowSelectIntro')}</p>

        <div className="new-case-workflow-dialog__chips">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className="new-case-workflow-dialog__chip"
              onClick={() => onSelect(page.id)}
            >
              {t(page.labelKey)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="new-case-workflow-dialog__skip"
          onClick={onStayOnDashboard}
        >
          {t('workflowStayOnDashboard')}
        </button>
      </div>
    </div>
  )
}
