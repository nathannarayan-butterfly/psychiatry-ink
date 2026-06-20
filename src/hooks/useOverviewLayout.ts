import { useCallback, useEffect, useState } from 'react'
import { useKnowledgeBaseUserId } from './useKnowledgeBaseUserId'
import {
  addOverviewWidget,
  getDefaultOverviewLayout,
  layoutStorageKey,
  loadOverviewLayout,
  moveOverviewWidget,
  OVERVIEW_LAYOUT_CHANGED_EVENT,
  removeOverviewWidget,
  saveOverviewLayout,
  setOverviewWidgetWidth,
  type OverviewLayout,
  type OverviewLayoutChangedDetail,
  type OverviewWidgetId,
  type OverviewWidgetWidth,
} from '../utils/overview/overviewLayout'
import { OVERVIEW_WIDGET_REGISTRY } from '../components/notion/overview/overviewWidgetRegistry'

export interface UseOverviewLayoutResult {
  layout: OverviewLayout
  editMode: boolean
  setEditMode: (next: boolean) => void
  toggleEditMode: () => void
  moveWidget: (fromIndex: number, toIndex: number) => void
  removeWidget: (instanceId: string) => void
  addWidget: (widgetId: OverviewWidgetId) => void
  setWidgetWidth: (instanceId: string, width: OverviewWidgetWidth) => void
  resetToDefault: () => void
}

function persistLayout(userId: string, layout: OverviewLayout): void {
  saveOverviewLayout(userId, layout)
}

export function useOverviewLayout(): UseOverviewLayoutResult {
  const userId = useKnowledgeBaseUserId()
  const [layout, setLayout] = useState<OverviewLayout>(() => loadOverviewLayout(userId))
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    setLayout(loadOverviewLayout(userId))
    setEditMode(false)
  }, [userId])

  useEffect(() => {
    const reloadForUser = (targetUserId: string) => {
      if (targetUserId !== userId) return
      setLayout(loadOverviewLayout(userId))
    }

    const onLayoutChanged = (event: Event) => {
      const detail = (event as CustomEvent<OverviewLayoutChangedDetail>).detail
      if (detail?.userId) reloadForUser(detail.userId)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === layoutStorageKey(userId)) reloadForUser(userId)
    }

    window.addEventListener(OVERVIEW_LAYOUT_CHANGED_EVENT, onLayoutChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(OVERVIEW_LAYOUT_CHANGED_EVENT, onLayoutChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [userId])

  const commit = useCallback(
    (next: OverviewLayout) => {
      setLayout(next)
      persistLayout(userId, next)
    },
    [userId],
  )

  const moveWidget = useCallback(
    (fromIndex: number, toIndex: number) => {
      commit(moveOverviewWidget(layout, fromIndex, toIndex))
    },
    [commit, layout],
  )

  const removeWidget = useCallback(
    (instanceId: string) => {
      commit(removeOverviewWidget(layout, instanceId))
    },
    [commit, layout],
  )

  const addWidget = useCallback(
    (widgetId: OverviewWidgetId) => {
      const def = OVERVIEW_WIDGET_REGISTRY[widgetId]
      commit(addOverviewWidget(layout, widgetId, def.defaultWidth))
    },
    [commit, layout],
  )

  const setWidgetWidth = useCallback(
    (instanceId: string, width: OverviewWidgetWidth) => {
      commit(setOverviewWidgetWidth(layout, instanceId, width))
    },
    [commit, layout],
  )

  const resetToDefault = useCallback(() => {
    commit(getDefaultOverviewLayout())
  }, [commit])

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev)
  }, [])

  return {
    layout,
    editMode,
    setEditMode,
    toggleEditMode,
    moveWidget,
    removeWidget,
    addWidget,
    setWidgetWidth,
    resetToDefault,
  }
}
