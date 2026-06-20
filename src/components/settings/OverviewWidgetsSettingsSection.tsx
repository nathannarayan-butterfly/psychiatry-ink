import { GripVertical, Plus, RotateCcw, X } from 'lucide-react'
import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useOverviewLayout } from '../../hooks/useOverviewLayout'
import {
  OVERVIEW_WIDGET_LIST,
  OVERVIEW_WIDGET_REGISTRY,
} from '../notion/overview/overviewWidgetRegistry'
import {
  isOverviewWidgetVisible,
  usedOverviewWidgetIds,
  type OverviewWidgetVisibilityContext,
} from '../../utils/overview/overviewLayout'
import { isClinicalIntelligenceV1Enabled } from '../../utils/featureFlags'

const SETTINGS_VISIBILITY_CONTEXT: OverviewWidgetVisibilityContext = {
  hasSpiegel: true,
  hasAdditionalSpiegel: true,
  hasPsychotherapy: true,
  hasIsdm: true,
  hasLabData: true,
  hasButterfly: true,
  hasEkg: true,
  hasEeg: true,
  hasCt: true,
  hasZwangsmassnahme: true,
  clinicalIntelligenceEnabled: isClinicalIntelligenceV1Enabled(),
}

export function OverviewWidgetsSettingsSection() {
  const { t } = useTranslation()
  const { layout, moveWidget, removeWidget, addWidget, resetToDefault } = useOverviewLayout()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const addableWidgets = useMemo(() => {
    const used = usedOverviewWidgetIds(layout)
    return OVERVIEW_WIDGET_LIST.filter((def) => {
      if (def.id === 'hero-summary') return false
      if (def.singleton && used.has(def.id)) return false
      return isOverviewWidgetVisible(def.id, def.visibility, SETTINGS_VISIBILITY_CONTEXT)
    })
  }, [layout])

  const handleDragStart = useCallback((index: number, event: DragEvent<HTMLLIElement>) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((index: number, event: DragEvent<HTMLLIElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }, [])

  const handleDrop = useCallback(
    (index: number, event: DragEvent<HTMLLIElement>) => {
      event.preventDefault()
      const fromRaw = event.dataTransfer.getData('text/plain')
      const fromIndex = dragIndex ?? Number.parseInt(fromRaw, 10)
      if (!Number.isNaN(fromIndex) && fromIndex !== index) {
        moveWidget(fromIndex, index)
      }
      setDragIndex(null)
      setDropIndex(null)
    },
    [dragIndex, moveWidget],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  return (
    <div>
      <p className="settings-section-lead">{t('overviewWidgetsSettingsIntro')}</p>

      <div className="settings-section-toolbar settings-section-toolbar--split">
        <div className="overview-widgets-settings-add">
          <button
            type="button"
            className="settings-section-toolbar__action inline-flex items-center gap-1.5"
            onClick={() => setPaletteOpen((open) => !open)}
            aria-expanded={paletteOpen}
            aria-haspopup="listbox"
            disabled={addableWidgets.length === 0}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('overviewLayoutAddWidget')}
          </button>
          {paletteOpen && addableWidgets.length > 0 ? (
            <ul
              className="overview-widgets-settings-palette"
              role="listbox"
              aria-label={t('overviewLayoutAddWidget')}
            >
              {addableWidgets.map((def) => (
                <li key={def.id}>
                  <button
                    type="button"
                    className="overview-widgets-settings-palette__item"
                    role="option"
                    onClick={() => {
                      addWidget(def.id)
                      setPaletteOpen(false)
                    }}
                  >
                    <span className="overview-widgets-settings-palette__title">{t(def.titleKey)}</span>
                    <span className="overview-widgets-settings-palette__desc">{t(def.descriptionKey)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          className="settings-section-toolbar__action inline-flex items-center gap-1.5"
          onClick={resetToDefault}
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          {t('overviewLayoutReset')}
        </button>
      </div>

      <p className="overview-widgets-settings-hint">{t('overviewWidgetsSettingsDragHint')}</p>

      {layout.widgets.length === 0 ? (
        <p className="overview-widgets-settings-empty" role="status">
          {t('overviewWidgetsSettingsEmpty')}
        </p>
      ) : (
        <ul className="overview-widgets-settings-list overview-widgets-settings-list--editable">
          {layout.widgets.map((item, index) => {
            const def = OVERVIEW_WIDGET_REGISTRY[item.widgetId]
            const isDragging = dragIndex === index
            const isDropTarget = dropIndex === index && dragIndex !== index

            return (
              <li
                key={item.instanceId}
                className={[
                  'overview-widgets-settings-list__item',
                  'overview-widgets-settings-list__item--editable',
                  isDragging ? 'overview-widgets-settings-list__item--dragging' : '',
                  isDropTarget ? 'overview-widgets-settings-list__item--drop-target' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable
                onDragStart={(event) => handleDragStart(index, event)}
                onDragOver={(event) => handleDragOver(index, event)}
                onDrop={(event) => handleDrop(index, event)}
                onDragEnd={handleDragEnd}
              >
                <span
                  className="overview-widgets-settings-list__grip"
                  aria-label={t('overviewWidgetsSettingsDragHandle')}
                  title={t('overviewWidgetsSettingsDragHandle')}
                >
                  <GripVertical className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <div className="overview-widgets-settings-list__body">
                  <div className="overview-widgets-settings-list__head">
                    <h3 className="overview-widgets-settings-list__title">{t(def.titleKey)}</h3>
                    {def.visibility !== 'always' ? (
                      <span className="overview-widgets-settings-list__badge">
                        {t('overviewWidgetsConditional')}
                      </span>
                    ) : null}
                  </div>
                  <p className="overview-widgets-settings-list__desc">{t(def.descriptionKey)}</p>
                </div>
                <button
                  type="button"
                  className="overview-widgets-settings-list__remove"
                  onClick={() => removeWidget(item.instanceId)}
                  aria-label={t('overviewLayoutRemoveWidget')}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {addableWidgets.length === 0 && layout.widgets.length > 0 ? (
        <p className="overview-widgets-settings-note">{t('overviewWidgetsSettingsNoAddable')}</p>
      ) : null}
    </div>
  )
}
