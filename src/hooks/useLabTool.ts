import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  LabDateRangePreset,
  LabEntry,
  MedicationChangeType,
  MedicationMarker,
  SavedLabGraph,
} from '../types/lab'
import {
  filterByDateRange,
  formatLabDate,
  getLabValueStatus,
  parseLabDate,
} from '../types/lab'
import {
  getActiveLabGraphId,
  loadLabGraphsList,
  saveLabGraphsList,
  setActiveLabGraphId,
} from '../utils/labPersistence'

interface LabEntryDraft {
  date: string
  parameter: string
  value: string
  unit: string
  referenceLow: string
  referenceHigh: string
  note: string
}

interface MedicationMarkerDraft {
  date: string
  medicationName: string
  dose: string
  doseUnit: string
  changeType: MedicationChangeType
  note: string
}

const defaultLabDraft = (): LabEntryDraft => ({
  date: new Date().toISOString().slice(0, 10),
  parameter: '',
  value: '',
  unit: '',
  referenceLow: '',
  referenceHigh: '',
  note: '',
})

const defaultMarkerDraft = (): MedicationMarkerDraft => ({
  date: new Date().toISOString().slice(0, 10),
  medicationName: '',
  dose: '',
  doseUnit: 'mg/day',
  changeType: 'continued',
  note: '',
})

function defaultLabGraphTitle(count: number): string {
  return `Labor ${count}`
}

function loadInitialState(): { graphs: SavedLabGraph[]; activeId: string | null } {
  const graphs = loadLabGraphsList()
  const activeId = getActiveLabGraphId() ?? graphs[0]?.id ?? null
  return { graphs, activeId }
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function useLabTool() {
  const initial = loadInitialState()
  const [savedLabGraphs, setSavedLabGraphs] = useState<SavedLabGraph[]>(initial.graphs)
  const [activeLabGraphId, setActiveLabGraphIdState] = useState<string | null>(initial.activeId)
  const activeGraph = useMemo(
    () => savedLabGraphs.find((item) => item.id === activeLabGraphId) ?? null,
    [activeLabGraphId, savedLabGraphs],
  )

  const [entries, setEntries] = useState<LabEntry[]>(() => activeGraph?.entries ?? [])
  const [markers, setMarkers] = useState<MedicationMarker[]>(() => activeGraph?.markers ?? [])
  const [selectedParameter, setSelectedParameter] = useState<string | null>(
    () => activeGraph?.selectedParameter ?? null,
  )
  const [dateRangePreset, setDateRangePreset] = useState<LabDateRangePreset>(
    () => activeGraph?.dateRangePreset ?? 'all',
  )

  const [labDialogOpen, setLabDialogOpen] = useState(false)
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false)
  const [editingLabId, setEditingLabId] = useState<string | null>(null)
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const [labDraft, setLabDraft] = useState<LabEntryDraft>(defaultLabDraft)
  const [markerDraft, setMarkerDraft] = useState<MedicationMarkerDraft>(defaultMarkerDraft)
  const [saveError, setSaveError] = useState<string | null>(null)

  const persistActiveGraph = useCallback(() => {
    if (!activeLabGraphId) return
    const updatedAt = new Date().toISOString()
    setSavedLabGraphs((current) => {
      const next = current.map((item) =>
        item.id === activeLabGraphId
          ? {
              ...item,
              entries,
              markers,
              selectedParameter,
              dateRangePreset,
              updatedAt,
            }
          : item,
      )
      saveLabGraphsList(next)
      return next
    })
  }, [activeLabGraphId, dateRangePreset, entries, markers, selectedParameter])

  useEffect(() => {
    persistActiveGraph()
  }, [persistActiveGraph])

  const parameters = useMemo(() => {
    const fromEntries = entries.map((entry) => entry.parameter.trim()).filter(Boolean)
    return [...new Set(fromEntries)].sort((a, b) => a.localeCompare(b))
  }, [entries])

  useEffect(() => {
    if (selectedParameter && !parameters.includes(selectedParameter)) {
      setSelectedParameter(parameters[0] ?? null)
    } else if (!selectedParameter && parameters.length > 0) {
      setSelectedParameter(parameters[0])
    }
  }, [parameters, selectedParameter])

  const filteredEntries = useMemo(
    () => filterByDateRange(entries, dateRangePreset),
    [dateRangePreset, entries],
  )

  const filteredMarkers = useMemo(
    () => filterByDateRange(markers, dateRangePreset),
    [dateRangePreset, markers],
  )

  const chartEntries = useMemo(() => {
    if (!selectedParameter) return []
    return filteredEntries
      .filter((entry) => entry.parameter === selectedParameter)
      .sort((a, b) => parseLabDate(a.date) - parseLabDate(b.date))
  }, [filteredEntries, selectedParameter])

  const tableEntries = chartEntries

  const openAddLabDialog = useCallback(() => {
    setEditingLabId(null)
    setLabDraft({
      ...defaultLabDraft(),
      parameter: selectedParameter ?? '',
    })
    setSaveError(null)
    setLabDialogOpen(true)
  }, [selectedParameter])

  const openEditLabDialog = useCallback((entry: LabEntry) => {
    setEditingLabId(entry.id)
    setLabDraft({
      date: entry.date,
      parameter: entry.parameter,
      value: String(entry.value),
      unit: entry.unit,
      referenceLow: entry.referenceLow !== null ? String(entry.referenceLow) : '',
      referenceHigh: entry.referenceHigh !== null ? String(entry.referenceHigh) : '',
      note: entry.note,
    })
    setSaveError(null)
    setLabDialogOpen(true)
  }, [])

  const closeLabDialog = useCallback(() => {
    setLabDialogOpen(false)
    setEditingLabId(null)
    setSaveError(null)
  }, [])

  const updateLabDraft = useCallback((patch: Partial<LabEntryDraft>) => {
    setLabDraft((current) => ({ ...current, ...patch }))
  }, [])

  const saveLabDraft = useCallback((): string | null => {
    const parameter = labDraft.parameter.trim()
    const value = Number(labDraft.value.replace(',', '.'))
    const date = labDraft.date.trim()

    if (!date) return 'date'
    if (!parameter) return 'parameter'
    if (!Number.isFinite(value)) return 'value'

    const now = new Date().toISOString()
    const payload: LabEntry = {
      id: editingLabId ?? crypto.randomUUID(),
      date,
      parameter,
      value,
      unit: labDraft.unit.trim(),
      referenceLow: parseOptionalNumber(labDraft.referenceLow),
      referenceHigh: parseOptionalNumber(labDraft.referenceHigh),
      note: labDraft.note.trim(),
      createdAt: editingLabId
        ? (entries.find((entry) => entry.id === editingLabId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    }

    setEntries((current) => {
      if (editingLabId) {
        return current.map((entry) => (entry.id === editingLabId ? payload : entry))
      }
      return [...current, payload]
    })

    if (!selectedParameter) {
      setSelectedParameter(parameter)
    }

    closeLabDialog()
    return null
  }, [closeLabDialog, editingLabId, entries, labDraft, selectedParameter])

  const removeLabEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const openAddMarkerDialog = useCallback(() => {
    setEditingMarkerId(null)
    setMarkerDraft(defaultMarkerDraft())
    setSaveError(null)
    setMarkerDialogOpen(true)
  }, [])

  const openEditMarkerDialog = useCallback((marker: MedicationMarker) => {
    setEditingMarkerId(marker.id)
    setMarkerDraft({
      date: marker.date,
      medicationName: marker.medicationName,
      dose: marker.dose,
      doseUnit: marker.doseUnit,
      changeType: marker.changeType,
      note: marker.note,
    })
    setSaveError(null)
    setMarkerDialogOpen(true)
  }, [])

  const closeMarkerDialog = useCallback(() => {
    setMarkerDialogOpen(false)
    setEditingMarkerId(null)
    setSaveError(null)
  }, [])

  const updateMarkerDraft = useCallback((patch: Partial<MedicationMarkerDraft>) => {
    setMarkerDraft((current) => ({ ...current, ...patch }))
  }, [])

  const saveMarkerDraft = useCallback((): string | null => {
    const medicationName = markerDraft.medicationName.trim()
    const date = markerDraft.date.trim()

    if (!date) return 'date'
    if (!medicationName) return 'medication'

    const now = new Date().toISOString()
    const payload: MedicationMarker = {
      id: editingMarkerId ?? crypto.randomUUID(),
      date,
      medicationName,
      dose: markerDraft.dose.trim(),
      doseUnit: markerDraft.doseUnit.trim(),
      changeType: markerDraft.changeType,
      note: markerDraft.note.trim(),
      createdAt: editingMarkerId
        ? (markers.find((marker) => marker.id === editingMarkerId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    }

    setMarkers((current) => {
      if (editingMarkerId) {
        return current.map((marker) => (marker.id === editingMarkerId ? payload : marker))
      }
      return [...current, payload]
    })

    closeMarkerDialog()
    return null
  }, [closeMarkerDialog, editingMarkerId, markerDraft, markers])

  const removeMarker = useCallback((id: string) => {
    setMarkers((current) => current.filter((marker) => marker.id !== id))
  }, [])

  const createNewLabGraph = useCallback(() => {
    const id = crypto.randomUUID()
    const title = defaultLabGraphTitle(savedLabGraphs.length + 1)
    const created: SavedLabGraph = {
      id,
      title,
      entries: [],
      markers: [],
      selectedParameter: null,
      dateRangePreset: 'all',
      updatedAt: new Date().toISOString(),
    }
    const next = [...savedLabGraphs, created]
    setSavedLabGraphs(next)
    saveLabGraphsList(next)
    setActiveLabGraphId(id)
    setActiveLabGraphIdState(id)
    setEntries([])
    setMarkers([])
    setSelectedParameter(null)
    setDateRangePreset('all')
  }, [savedLabGraphs])

  const openLabGraph = useCallback(
    (id: string) => {
      const graph = savedLabGraphs.find((item) => item.id === id)
      if (!graph) return
      setActiveLabGraphId(id)
      setActiveLabGraphIdState(id)
      setEntries(graph.entries)
      setMarkers(graph.markers)
      setSelectedParameter(graph.selectedParameter)
      setDateRangePreset(graph.dateRangePreset)
    },
    [savedLabGraphs],
  )

  const updateLabGraphTitle = useCallback(
    (title: string) => {
      if (!activeLabGraphId) return
      const trimmed = title.trim()
      setSavedLabGraphs((current) => {
        const next = current.map((item) =>
          item.id === activeLabGraphId
            ? { ...item, title: trimmed || item.title, updatedAt: new Date().toISOString() }
            : item,
        )
        saveLabGraphsList(next)
        return next
      })
    },
    [activeLabGraphId],
  )

  const restoreFromVault = useCallback((graphs: SavedLabGraph[], activeId: string | null) => {
    setSavedLabGraphs(graphs)
    saveLabGraphsList(graphs)
    setActiveLabGraphId(activeId)
    setActiveLabGraphIdState(activeId)
    const active = activeId ? graphs.find((item) => item.id === activeId) : graphs[0]
    if (active) {
      setEntries(active.entries)
      setMarkers(active.markers)
      setSelectedParameter(active.selectedParameter)
      setDateRangePreset(active.dateRangePreset)
    } else {
      setEntries([])
      setMarkers([])
      setSelectedParameter(null)
      setDateRangePreset('all')
    }
  }, [])

  /** @deprecated Use restoreFromVault */
  const restoreFromSnapshot = useCallback(
    (snapshot: {
      entries: LabEntry[]
      markers: MedicationMarker[]
      selectedParameter: string | null
      dateRangePreset: LabDateRangePreset
    } | null) => {
      if (!snapshot) return
      const id = crypto.randomUUID()
      const created: SavedLabGraph = {
        id,
        title: defaultLabGraphTitle(1),
        ...snapshot,
        updatedAt: new Date().toISOString(),
      }
      restoreFromVault([created], id)
    },
    [restoreFromVault],
  )

  return {
    entries,
    markers,
    parameters,
    selectedParameter,
    setSelectedParameter,
    dateRangePreset,
    setDateRangePreset,
    chartEntries,
    tableEntries,
    filteredMarkers,
    savedLabGraphs,
    activeLabGraphId,
    activeLabGraphTitle: activeGraph?.title ?? '',
    labDialogOpen,
    markerDialogOpen,
    editingLabId,
    editingMarkerId,
    labDraft,
    markerDraft,
    saveError,
    setSaveError,
    openAddLabDialog,
    openEditLabDialog,
    closeLabDialog,
    updateLabDraft,
    saveLabDraft,
    removeLabEntry,
    openAddMarkerDialog,
    openEditMarkerDialog,
    closeMarkerDialog,
    updateMarkerDraft,
    saveMarkerDraft,
    removeMarker,
    getLabValueStatus,
    formatLabDate,
    createNewLabGraph,
    openLabGraph,
    updateLabGraphTitle,
    restoreFromVault,
    restoreFromSnapshot,
  }
}

export type LabToolState = ReturnType<typeof useLabTool>
