import { useTranslation } from '../../context/TranslationContext'
import type { DocumentSection } from '../../types'
import { NotionDocumentationTimers } from './NotionDocumentationTimers'
import { PanelDateCard } from '../PanelDateCard'
import { PanelGraphic } from '../PanelGraphic'

interface NotionDiarySidebarProps {
  documentLabel: string
  sectionLabel?: string
  sections: DocumentSection[]
  activeSectionId: string | null
  hasContent: boolean
  showPanelGraphic: boolean
  onClosePanelGraphic: () => void
  collapsed?: boolean
}

function resolveStatus(
  sections: DocumentSection[],
  activeSectionId: string | null,
  hasContent: boolean,
  t: (key: 'notionStatusDraft' | 'notionStatusSaved' | 'notionStatusEmpty') => string,
): { label: string; variant: 'draft' | 'saved' | 'empty' } {
  if (activeSectionId) {
    const section = sections.find((item) => item.id === activeSectionId)
    if (section?.status === 'saved') {
      return { label: t('notionStatusSaved'), variant: 'saved' }
    }
    if (hasContent || section?.status === 'draft') {
      return { label: t('notionStatusDraft'), variant: 'draft' }
    }
    return { label: t('notionStatusEmpty'), variant: 'empty' }
  }

  return hasContent
    ? { label: t('notionStatusDraft'), variant: 'draft' }
    : { label: t('notionStatusEmpty'), variant: 'empty' }
}

export function NotionDiarySidebar({
  documentLabel,
  sectionLabel,
  sections,
  activeSectionId,
  hasContent,
  showPanelGraphic,
  onClosePanelGraphic,
  collapsed = false,
}: NotionDiarySidebarProps) {
  const { t } = useTranslation()
  const status = resolveStatus(sections, activeSectionId, hasContent, t)

  return (
    <aside
      className={`notion-diary-sidebar${collapsed ? ' notion-diary-sidebar--collapsed' : ''}`}
      aria-label={t('notionMetadata')}
    >
      {collapsed ? (
        <div className="notion-diary-sidebar__collapsed-datetime">
          <PanelDateCard layout="vertical" />
        </div>
      ) : (
        <>
          <div className="notion-diary-sidebar__top">
            <div className="notion-diary-sidebar__date">
              <PanelDateCard layout="sidebar" />
            </div>

            <NotionDocumentationTimers />

            <dl className="notion-diary-sidebar__meta">
              <div className="notion-diary-sidebar__meta-row">
                <dt>{t('notionMetaType')}</dt>
                <dd>{documentLabel}</dd>
              </div>
              {sectionLabel ? (
                <div className="notion-diary-sidebar__meta-row">
                  <dt>{t('notionMetaSection')}</dt>
                  <dd>{sectionLabel}</dd>
                </div>
              ) : null}
              <div className="notion-diary-sidebar__meta-row">
                <dt>{t('notionMetaStatus')}</dt>
                <dd>
                  <span
                    className={`notion-diary-sidebar__status notion-diary-sidebar__status--${status.variant}`}
                  >
                    {status.label}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {showPanelGraphic ? (
            <div className="notion-diary-sidebar__graphic">
              <PanelGraphic onClose={onClosePanelGraphic} />
            </div>
          ) : null}
        </>
      )}
    </aside>
  )
}
