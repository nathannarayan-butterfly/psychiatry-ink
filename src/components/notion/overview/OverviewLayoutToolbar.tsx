import { Plus, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  isOverviewWidgetVisible,
  usedOverviewWidgetIds,
  type OverviewLayout,
  type OverviewWidgetId,
  type OverviewWidgetVisibilityContext,
} from '../../../utils/overview/overviewLayout'
import { OVERVIEW_WIDGET_LIST } from './overviewWidgetRegistry'

export interface OverviewLayoutToolbarProps {
  editMode: boolean
  layout: OverviewLayout
  visibilityContext: OverviewWidgetVisibilityContext
  onToggleEditMode: () => void
  onAddWidget: (widgetId: OverviewWidgetId) => void
  onResetToDefault: () => void
}

export function OverviewLayoutToolbar({
  editMode,
  layout,
  visibilityContext,
  onToggleEditMode,
  onAddWidget,
  onResetToDefault,
}: OverviewLayoutToolbarProps) {
  const { t } = useTranslation()
  const [paletteOpen, setPaletteOpen] = useState(false)

  const addableWidgets = useMemo(() => {
    const used = usedOverviewWidgetIds(layout)
    return OVERVIEW_WIDGET_LIST.filter((def) => {
      if (def.singleton && used.has(def.id)) return false
      return isOverviewWidgetVisible(def.id, def.visibility, visibilityContext)
    })
  }, [layout, visibilityContext])

  return (
    <div className={`ov-layout-toolbar${editMode ? ' ov-layout-toolbar--active' : ''}`}>
      <div className="ov-layout-toolbar__main">
        <button
          type="button"
          className={`ov-layout-toolbar__toggle${editMode ? ' ov-layout-toolbar__toggle--active' : ''}`}
          onClick={onToggleEditMode}
          aria-pressed={editMode}
        >
          {editMode ? t('overviewLayoutDone') : t('overviewLayoutEdit')}
        </button>
        {editMode ? (
          <span className="ov-layout-toolbar__hint" role="status">
            {t('overviewLayoutEditHint')}
          </span>
        ) : null}
      </div>

      {editMode ? (
        <div className="ov-layout-toolbar__edit-actions">
          <div className="ov-layout-toolbar__add">
            <button
              type="button"
              className="ov-layout-toolbar__add-btn"
              onClick={() => setPaletteOpen((open) => !open)}
              aria-expanded={paletteOpen}
              aria-haspopup="listbox"
              disabled={addableWidgets.length === 0}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {t('overviewLayoutAddWidget')}
            </button>
            {paletteOpen && addableWidgets.length > 0 ? (
              <ul className="ov-layout-palette" role="listbox" aria-label={t('overviewLayoutAddWidget')}>
                {addableWidgets.map((def) => (
                  <li key={def.id}>
                    <button
                      type="button"
                      className="ov-layout-palette__item"
                      role="option"
                      onClick={() => {
                        onAddWidget(def.id)
                        setPaletteOpen(false)
                      }}
                    >
                      {t(def.titleKey)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            className="ov-layout-toolbar__reset"
            onClick={onResetToDefault}
            aria-label={t('overviewLayoutReset')}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('overviewLayoutReset')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
