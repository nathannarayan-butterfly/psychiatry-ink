import { useCallback, useMemo, useState } from 'react'

import type { SavedTimeline, TimelineEntry, TimelineLayout, TimelinePriority } from '../types/timeline'
import { parseTimelineDate } from '../utils/timelineDates'
import {
  exportTimelinePdf,
  getActiveTimelineId,
  importPortablePdf,
  loadTimelinesList,
  printTimeline,
  saveTimelinesList,
  setActiveTimelineId,
} from '../utils/timelinePersistence'

interface TimelineDraft {
  heading: string
  subheading: string
  priority: TimelinePriority
  dateKind: TimelineEntry['dateKind']
  dateValue: string
}

const defaultDraft = (): TimelineDraft => ({
  heading: '',
  subheading: '',
  priority: 'medium',
  dateKind: 'ddmmyy',
  dateValue: '',
})

function defaultTimelineTitle(count: number): string {
  return `Timeline ${count}`
}

function loadInitialState(caseId?: string): { timelines: SavedTimeline[]; activeId: string | null } {
  const timelines = loadTimelinesList(caseId)
  const activeId = getActiveTimelineId(caseId) ?? timelines[0]?.id ?? null
  return { timelines, activeId }
}

export function useTimelineTool(caseId?: string) {
  const initial = loadInitialState(caseId)
  const [savedTimelines, setSavedTimelines] = useState<SavedTimeline[]>(initial.timelines)
  const [activeTimelineId, setActiveTimelineIdState] = useState<string | null>(initial.activeId)
  const activeTimeline = useMemo(
    () => savedTimelines.find((item) => item.id === activeTimelineId) ?? null,
    [activeTimelineId, savedTimelines],
  )

  const [layout, setLayout] = useState<TimelineLayout>(() => activeTimeline?.layout ?? 'horizontal')
  const [entries, setEntries] = useState<TimelineEntry[]>(() => activeTimeline?.entries ?? [])
  const [sessionSaved, setSessionSaved] = useState(() => savedTimelines.length > 0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TimelineDraft>(defaultDraft)
  const [importError, setImportError] = useState<string | null>(null)

  const persistActiveTimeline = useCallback(
    (nextLayout: TimelineLayout, nextEntries: TimelineEntry[], markSaved = false) => {
      if (!activeTimelineId) return
      const updatedAt = new Date().toISOString()
      setSavedTimelines((current) => {
        const next = current.map((item) =>
          item.id === activeTimelineId
            ? { ...item, layout: nextLayout, entries: nextEntries, updatedAt }
            : item,
        )
        saveTimelinesList(next, caseId)
        return next
      })
      if (markSaved) setSessionSaved(true)
    },
    [activeTimelineId, caseId],
  )

  const getSnapshot = useCallback(
    () => ({
      layout,
      entries,
    }),
    [entries, layout],
  )

  const saveSession = useCallback(() => {
    persistActiveTimeline(layout, entries, true)
  }, [entries, layout, persistActiveTimeline])

  const exportTimelineFile = useCallback(() => {
    void exportTimelinePdf(getSnapshot(), activeTimeline?.title ?? 'Timeline Creator')
  }, [activeTimeline?.title, getSnapshot])

  const importTimelinePdf = useCallback(async (file: File) => {
    setImportError(null)
    const result = await importPortablePdf(file, 'timeline')
    if (!result.ok) {
      setImportError(result.error)
      return
    }
    if (result.kind !== 'timeline') {
      setImportError('wrong_kind')
      return
    }
    setLayout(result.timeline.layout)
    setEntries(result.timeline.entries)
    setSessionSaved(false)
  }, [])

  const printTimelineView = useCallback(
    (title: string) => {
      printTimeline(getSnapshot(), title)
    },
    [getSnapshot],
  )

  const openAddDialog = useCallback(() => {
    setEditingId(null)
    setDraft(defaultDraft())
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((entry: TimelineEntry) => {
    setEditingId(entry.id)
    setDraft({
      heading: entry.heading,
      subheading: entry.subheading,
      priority: entry.priority,
      dateKind: entry.dateKind,
      dateValue: entry.dateValue,
    })
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingId(null)
  }, [])

  const updateDraft = useCallback((patch: Partial<TimelineDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const saveDraft = useCallback((): string | null => {
    const parsed = parseTimelineDate(draft.dateKind, draft.dateValue)
    // The per-entry title is optional: an entry may be added with just a date,
    // in which case the render layer falls back to the date as its heading. The
    // date itself is still required because the timeline is date-sorted.
    if (!parsed) return 'date'

    const payload: TimelineEntry = {
      id: editingId ?? crypto.randomUUID(),
      heading: draft.heading.trim(),
      subheading: draft.subheading.trim(),
      priority: draft.priority,
      dateKind: draft.dateKind,
      dateValue: draft.dateValue.trim(),
      sortKey: parsed.sortKey,
      displayDate: parsed.displayDate,
      visible: true,
    }

    setEntries((current) => {
      const next = editingId
        ? current.map((entry) => (entry.id === editingId ? payload : entry))
        : [...current, payload]
      persistActiveTimeline(layout, next)
      return next
    })
    setSessionSaved(false)
    closeDialog()
    return null
  }, [closeDialog, draft, editingId, layout, persistActiveTimeline])

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((current) => {
        const next = current.filter((entry) => entry.id !== id)
        persistActiveTimeline(layout, next)
        return next
      })
      setSessionSaved(false)
    },
    [layout, persistActiveTimeline],
  )

  const setLayoutAndMarkDirty = useCallback(
    (next: TimelineLayout) => {
      setLayout(next)
      persistActiveTimeline(next, entries)
      setSessionSaved(false)
    },
    [entries, persistActiveTimeline],
  )

  const toggleEntryVisibility = useCallback(
    (id: string) => {
      setEntries((current) => {
        const next = current.map((entry) =>
          entry.id === id ? { ...entry, visible: !entry.visible } : entry,
        )
        persistActiveTimeline(layout, next)
        return next
      })
      setSessionSaved(false)
    },
    [layout, persistActiveTimeline],
  )

  const showAllEntries = useCallback(() => {
    setEntries((current) => {
      const next = current.map((entry) => ({ ...entry, visible: true }))
      persistActiveTimeline(layout, next)
      return next
    })
    setSessionSaved(false)
  }, [layout, persistActiveTimeline])

  const createNewTimeline = useCallback(() => {
    const id = crypto.randomUUID()
    const title = defaultTimelineTitle(savedTimelines.length + 1)
    const created: SavedTimeline = {
      id,
      title,
      layout: 'horizontal',
      entries: [],
      updatedAt: new Date().toISOString(),
    }
    const next = [...savedTimelines, created]
    setSavedTimelines(next)
    saveTimelinesList(next, caseId)
    setActiveTimelineId(id, caseId)
    setActiveTimelineIdState(id)
    setLayout('horizontal')
    setEntries([])
    setSessionSaved(true)
  }, [caseId, savedTimelines])

  const openTimeline = useCallback(
    (id: string) => {
      const timeline = savedTimelines.find((item) => item.id === id)
      if (!timeline) return
      setActiveTimelineId(id, caseId)
      setActiveTimelineIdState(id)
      setLayout(timeline.layout)
      setEntries(timeline.entries)
      setSessionSaved(true)
    },
    [caseId, savedTimelines],
  )

  const updateTimelineTitle = useCallback(
    (title: string) => {
      if (!activeTimelineId) return
      const trimmed = title.trim()
      setSavedTimelines((current) => {
        const next = current.map((item) =>
          item.id === activeTimelineId
            ? { ...item, title: trimmed || item.title, updatedAt: new Date().toISOString() }
            : item,
        )
        saveTimelinesList(next, caseId)
        return next
      })
    },
    [activeTimelineId, caseId],
  )

  const restoreFromVault = useCallback((timelines: SavedTimeline[], activeId: string | null) => {
    setSavedTimelines(timelines)
    saveTimelinesList(timelines, caseId)
    setActiveTimelineId(activeId, caseId)
    setActiveTimelineIdState(activeId)
    const active = activeId ? timelines.find((item) => item.id === activeId) : timelines[0]
    if (active) {
      setLayout(active.layout)
      setEntries(active.entries)
    } else {
      setLayout('horizontal')
      setEntries([])
    }
    setSessionSaved(timelines.length > 0)
  }, [caseId])

  /** @deprecated Use restoreFromVault */
  const restoreFromSnapshot = useCallback(
    (snapshot: { layout: TimelineLayout; entries: TimelineEntry[] }) => {
      const id = crypto.randomUUID()
      const created: SavedTimeline = {
        id,
        title: defaultTimelineTitle(1),
        layout: snapshot.layout,
        entries: snapshot.entries,
        updatedAt: new Date().toISOString(),
      }
      restoreFromVault([created], id)
    },
    [restoreFromVault],
  )

  return {
    layout,
    setLayout: setLayoutAndMarkDirty,
    entries,
    savedTimelines,
    activeTimelineId,
    activeTimelineTitle: activeTimeline?.title ?? '',
    sessionSaved,
    dialogOpen,
    editingId,
    draft,
    openAddDialog,
    openEditDialog,
    closeDialog,
    updateDraft,
    saveDraft,
    saveSession,
    exportTimeline: exportTimelineFile,
    importTimelinePdf,
    importError,
    printTimelineView,
    removeEntry,
    toggleEntryVisibility,
    showAllEntries,
    createNewTimeline,
    openTimeline,
    updateTimelineTitle,
    restoreFromVault,
    restoreFromSnapshot,
  }
}

export type TimelineToolState = ReturnType<typeof useTimelineTool>
