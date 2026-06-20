import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type ReactNode,
} from 'react'
import { ChevronDown, ChevronUp, GripVertical, Maximize2, Minimize2, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import {
  isOverviewWidgetVisible,
  OVERVIEW_WIDGET_BAND,
  packOverviewWidgets,
  type OverviewLayoutItem,
  type OverviewWidgetBand,
  type OverviewWidgetPlacement,
  type OverviewWidgetVisibilityContext,
  type OverviewWidgetWidth,
} from '../../../utils/overview/overviewLayout'
import { OVERVIEW_WIDGET_REGISTRY } from './overviewWidgetRegistry'
import { renderOverviewWidget, type OverviewWidgetRenderContext } from './OverviewWidgetContent'
import { ClinicalEyebrow } from '../../clinical/ClinicalEyebrow'
import type { UiTranslationKey } from '../../../data/uiTranslations'

const OVERVIEW_BAND_TITLE_KEY: Record<OverviewWidgetBand, UiTranslationKey> = {
  'diagnosis-medication': 'overviewBandDiagnosisMedication',
  'safety-verlauf': 'overviewBandSafetyVerlauf',
  'clinical-status': 'overviewBandClinicalStatus',
  monitoring: 'overviewBandMonitoring',
  therapy: 'overviewBandTherapy',
}

const OVERVIEW_GRID_SINGLE_COLUMN_MAX_WIDTH = 1100

function subscribeMaxWidthQuery(onStoreChange: () => void): () => void {
  const query = `(max-width: ${OVERVIEW_GRID_SINGLE_COLUMN_MAX_WIDTH}px)`
  const media = window.matchMedia(query)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getMaxWidthQuerySnapshot(): boolean {
  return window.matchMedia(`(max-width: ${OVERVIEW_GRID_SINGLE_COLUMN_MAX_WIDTH}px)`).matches
}

function getMaxWidthQueryServerSnapshot(): boolean {
  return false
}

function useOverviewGridSingleColumn(): boolean {
  return useSyncExternalStore(
    subscribeMaxWidthQuery,
    getMaxWidthQuerySnapshot,
    getMaxWidthQueryServerSnapshot,
  )
}

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
  const singleColumn = useOverviewGridSingleColumn()

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

  const placements = useMemo<OverviewWidgetPlacement[]>(
    () => visibleWidgets.map(({ item, index }) => ({ item, index })),
    [visibleWidgets],
  )

  const packedSegments = useMemo(() => packOverviewWidgets(placements), [placements])

  const renderPlan = useMemo(() => {
    type PlanItem =
      | { kind: 'band-header'; band: OverviewWidgetBand }
      | { kind: 'segment'; segment: ReturnType<typeof packOverviewWidgets>[number]; segmentIdx: number }
      | { kind: 'widget'; placement: OverviewWidgetPlacement; visibleIdx: number }

    const plan: PlanItem[] = []
    let lastBand: OverviewWidgetBand | null = null

    const bandForPlacement = (placement: OverviewWidgetPlacement): OverviewWidgetBand | null =>
      OVERVIEW_WIDGET_BAND[placement.item.widgetId] ?? null

    const maybeBandHeader = (placement: OverviewWidgetPlacement) => {
      const band = bandForPlacement(placement)
      if (band && band !== lastBand) {
        plan.push({ kind: 'band-header', band })
        lastBand = band
      }
    }

    if (singleColumn) {
      for (const { item, index } of visibleWidgets) {
        const placement = { item, index }
        maybeBandHeader(placement)
        plan.push({
          kind: 'widget',
          placement,
          visibleIdx: visibleWidgets.findIndex(({ index: i }) => i === index),
        })
      }
      return plan
    }

    for (let segmentIdx = 0; segmentIdx < packedSegments.length; segmentIdx++) {
      const segment = packedSegments[segmentIdx]!
      const firstPlacement =
        segment.type === 'full' ? segment.placement : (segment.left[0] ?? segment.right[0])
      if (firstPlacement) maybeBandHeader(firstPlacement)
      plan.push({ kind: 'segment', segment, segmentIdx })
    }

    return plan
  }, [singleColumn, visibleWidgets, packedSegments])

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

  const renderSlot = useCallback(
    ({ item, index }: OverviewWidgetPlacement, visibleIndex: number) => (
      <OverviewWidgetSlot
        key={item.instanceId}
        item={item}
        index={index}
        visibleIndex={visibleIndex}
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
    ),
    [
      visibleWidgets.length,
      editMode,
      dragIndex,
      dropIndex,
      t,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      onMove,
      onRemove,
      onResize,
      renderContext,
    ],
  )

  const gridClassName = `ov-grid${editMode ? ' ov-grid--edit' : ''}${singleColumn ? ' ov-grid--single' : ''}`

  return (
    <div className={gridClassName} aria-live={editMode ? 'polite' : undefined}>
      {renderPlan.map((entry, planIdx) => {
        if (entry.kind === 'band-header') {
          return (
            <div key={`band-${entry.band}-${planIdx}`} className="ov-grid__band">
              <ClinicalEyebrow>{t(OVERVIEW_BAND_TITLE_KEY[entry.band])}</ClinicalEyebrow>
            </div>
          )
        }

        if (entry.kind === 'widget') {
          return renderSlot(entry.placement, entry.visibleIdx)
        }

        const { segment, segmentIdx } = entry
        if (segment.type === 'full') {
          const visibleIdx = visibleWidgets.findIndex(({ index }) => index === segment.placement.index)
          return renderSlot(segment.placement, visibleIdx)
        }

        return (
          <div key={`columns-${segmentIdx}`} className="ov-grid__row">
            <div className="ov-grid__col">
              {segment.left.map((placement) => {
                const visibleIdx = visibleWidgets.findIndex(({ index }) => index === placement.index)
                return renderSlot(placement, visibleIdx)
              })}
            </div>
            <div className="ov-grid__col">
              {segment.right.map((placement) => {
                const visibleIdx = visibleWidgets.findIndex(({ index }) => index === placement.index)
                return renderSlot(placement, visibleIdx)
              })}
            </div>
          </div>
        )
      })}
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
