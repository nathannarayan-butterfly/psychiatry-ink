import { useCallback, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Maximize2, Minimize2, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  isOverviewWidgetVisible,
  type OverviewLayoutItem,
  type OverviewWidgetVisibilityContext,
  type OverviewWidgetWidth,
} from '../../../utils/overview/overviewLayout'
import { OVERVIEW_WIDGET_REGISTRY } from './overviewWidgetRegistry'
import { renderOverviewWidget, type OverviewWidgetRenderContext } from './OverviewWidgetContent'

export interface OverviewWidgetGridProps {
  widgets: OverviewLayoutItem[]
  editMode: boolean
  renderContext: OverviewWidgetRenderContext
  visibilityContext: OverviewWidgetVisibilityContext
  onMove: (fromIndex: number, toIndex: number) => void
  onRemove: (instanceId: string) => void
  onResize: (instanceId: string, width: OverviewWidgetWidth) => void
}

export function OverviewWidgetGrid({
  widgets,
  editMode,
  renderContext,
  visibilityContext,
  onMove,
  onRemove,
  onResize,
}: OverviewWidgetGridProps) {
  const { t } = useTranslation()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const visibleWidgets = useMemo(
    () =>
      widgets
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
          const def = OVERVIEW_WIDGET_REGISTRY[item.widgetId]
          return isOverviewWidgetVisible(item.widgetId, def.visibility, visibilityContext)
        }),
    [widgets, visibilityContext],
  )

  const handleDragStart = useCallback((index: number, event: DragEvent<HTMLDivElement>) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((index: number, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }, [])

  const handleDrop = useCallback(
    (index: number, event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const fromRaw = event.dataTransfer.getData('text/plain')
      const fromIndex = dragIndex ?? Number.parseInt(fromRaw, 10)
      if (!Number.isNaN(fromIndex) && fromIndex !== index) {
        onMove(fromIndex, index)
      }
      setDragIndex(null)
      setDropIndex(null)
    },
    [dragIndex, onMove],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  return (
    <div
      className={`ov-grid${editMode ? ' ov-grid--edit' : ''}`}
      aria-live={editMode ? 'polite' : undefined}
    >
      {visibleWidgets.map(({ item, index }, visibleIdx) => (
        <OverviewWidgetSlot
          key={item.instanceId}
          item={item}
          index={index}
          visibleIndex={visibleIdx}
          visibleCount={visibleWidgets.length}
          editMode={editMode}
          isDragging={dragIndex === index}
          isDropTarget={dropIndex === index && dragIndex !== index}
          title={t(OVERVIEW_WIDGET_REGISTRY[item.widgetId].titleKey)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onMoveUp={() => onMove(index, index - 1)}
          onMoveDown={() => onMove(index, index + 1)}
          onRemove={() => onRemove(item.instanceId)}
          onResize={(width) => onResize(item.instanceId, width)}
        >
          {renderOverviewWidget(item.widgetId, renderContext)}
        </OverviewWidgetSlot>
      ))}
    </div>
  )
}

interface OverviewWidgetSlotProps {
  item: OverviewLayoutItem
  index: number
  visibleIndex: number
  visibleCount: number
  editMode: boolean
  isDragging: boolean
  isDropTarget: boolean
  title: string
  children: ReactNode
  onDragStart: (index: number, event: DragEvent<HTMLDivElement>) => void
  onDragOver: (index: number, event: DragEvent<HTMLDivElement>) => void
  onDrop: (index: number, event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onResize: (width: OverviewWidgetWidth) => void
}

function OverviewWidgetSlot({
  item,
  index,
  visibleIndex,
  visibleCount,
  editMode,
  isDragging,
  isDropTarget,
  title,
  children,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onRemove,
  onResize,
}: OverviewWidgetSlotProps) {
  const { t } = useTranslation()
  const widthClass = item.width === 'full' ? 'ov-widget-slot--full' : 'ov-widget-slot--half'
  const isHero = item.widgetId === 'hero-summary'

  return (
    <div
      className={[
        'ov-widget-slot',
        widthClass,
        isHero ? 'ov-widget-slot--hero' : '',
        editMode ? 'ov-widget-slot--editable' : '',
        isDragging ? 'ov-widget-slot--dragging' : '',
        isDropTarget ? 'ov-widget-slot--drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={editMode}
      onDragStart={editMode ? (event) => onDragStart(index, event) : undefined}
      onDragOver={editMode ? (event) => onDragOver(index, event) : undefined}
      onDrop={editMode ? (event) => onDrop(index, event) : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
    >
      {editMode ? (
        <div className="ov-widget-edit-bar" aria-label={t('overviewLayoutEditBarLabel')}>
          <span className="ov-widget-edit-bar__title">
            <GripVertical className="ov-widget-edit-bar__grip" aria-hidden strokeWidth={2} />
            {title}
          </span>
          <div className="ov-widget-edit-bar__actions">
            <button
              type="button"
              className="ov-widget-edit-btn"
              onClick={onMoveUp}
              disabled={visibleIndex === 0}
              aria-label={t('overviewLayoutMoveUp')}
            >
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="ov-widget-edit-btn"
              onClick={onMoveDown}
              disabled={visibleIndex >= visibleCount - 1}
              aria-label={t('overviewLayoutMoveDown')}
            >
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="ov-widget-edit-btn"
              onClick={() => onResize(item.width === 'full' ? 'half' : 'full')}
              aria-label={
                item.width === 'full' ? t('overviewLayoutResizeHalf') : t('overviewLayoutResizeFull')
              }
              title={
                item.width === 'full' ? t('overviewLayoutResizeHalf') : t('overviewLayoutResizeFull')
              }
            >
              {item.width === 'full' ? (
                <Minimize2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="ov-widget-edit-btn ov-widget-edit-btn--remove"
              onClick={onRemove}
              aria-label={t('overviewLayoutRemoveWidget')}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
      <div className="ov-widget-slot__content">{children}</div>
    </div>
  )
}
