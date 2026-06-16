import { useTranslation } from '../../context/TranslationContext'
import { NOTION_PAGES, type NotionPageId } from './notionPages'

const DOCUMENT_START_PAGES = NOTION_PAGES.filter((page) => page.kind === 'document')

interface CaseSidebarQuickNavProps {
  onOpenWorkspacePage?: (pageId: NotionPageId) => void
  onOpenTemplateFromPatient?: () => void
}

/** New-document entry points below clinical areas in the case sidebar. */
export function CaseSidebarQuickNav({
  onOpenWorkspacePage,
  onOpenTemplateFromPatient,
}: CaseSidebarQuickNavProps) {
  const { t } = useTranslation()

  return (
    <nav className="case-sidebar-nav" aria-label={t('patientDashboardNewDocument')}>
      <p className="case-sidebar-nav__heading">{t('patientDashboardNewDocument')}</p>
      {onOpenTemplateFromPatient ? (
        <button
          type="button"
          className="case-sidebar-nav__link"
          onClick={onOpenTemplateFromPatient}
        >
          {t('templateCreateFromPatient')}
        </button>
      ) : null}
      {DOCUMENT_START_PAGES.map((page) => (
        <button
          key={page.id}
          type="button"
          className="case-sidebar-nav__link"
          onClick={() => onOpenWorkspacePage?.(page.id)}
        >
          {t(page.labelKey)}
        </button>
      ))}
    </nav>
  )
}
