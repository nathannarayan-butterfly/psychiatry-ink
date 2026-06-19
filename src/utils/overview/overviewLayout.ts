import { safeGetItem, safeSetItem } from '../safeStorage'

export const OVERVIEW_LAYOUT_VERSION = 2 as const
export const OVERVIEW_LAYOUT_STORAGE_BASE = 'psychiatry-ink:overview-layout'

export type OverviewWidgetId =
  | 'hero-summary'
  | 'safety'
  | 'medication'
  | 'spiegel-latest'
  | 'diagnoses'
  | 'psychopathology'
  | 'labs-due'
  | 'prior-therapies'
  | 'spiegel-all'
  | 'recent-verlauf'
  | 'appointments'
  | 'dokumentation'
  | 'psychotherapy'
  | 'isdm-summary'
  | 'collaboration'
  | 'lab-results'
  | 'butterfly-criteria'
  | 'zwangsmassnahme'
  | 'verlaufstendenz'
  | 'ekg-summary'
  | 'eeg-summary'
  | 'ct-summary'
  | 'angemeldete-therapien'
  | 'compliance'

export type OverviewWidgetWidth = 'half' | 'full'

/** Relative vertical footprint used when packing half-width widgets into columns. */
export type OverviewWidgetSizeHint = 'compact' | 'standard' | 'tall'

export const OVERVIEW_WIDGET_SIZE_WEIGHT: Record<OverviewWidgetSizeHint, number> = {
  compact: 1,
  standard: 2,
  tall: 3,
}

export interface OverviewLayoutItem {
  instanceId: string
  widgetId: OverviewWidgetId
  width: OverviewWidgetWidth
}

export interface OverviewLayout {
  version: typeof OVERVIEW_LAYOUT_VERSION
  widgets: OverviewLayoutItem[]
}

export const OVERVIEW_WIDGET_IDS: readonly OverviewWidgetId[] = [
  'hero-summary',
  'safety',
  'medication',
  'spiegel-latest',
  'diagnoses',
  'psychopathology',
  'labs-due',
  'prior-therapies',
  'spiegel-all',
  'recent-verlauf',
  'appointments',
  'dokumentation',
  'psychotherapy',
  'isdm-summary',
  'collaboration',
  'lab-results',
  'butterfly-criteria',
  'zwangsmassnahme',
  'verlaufstendenz',
  'ekg-summary',
  'eeg-summary',
  'ct-summary',
  'angemeldete-therapien',
  'compliance',
] as const

const VALID_WIDGET_IDS = new Set<string>(OVERVIEW_WIDGET_IDS)

function isWidgetId(value: unknown): value is OverviewWidgetId {
  return typeof value === 'string' && VALID_WIDGET_IDS.has(value)
}

function normalizeWidth(value: unknown, fallback: OverviewWidgetWidth): OverviewWidgetWidth {
  return value === 'full' || value === 'half' ? value : fallback
}

function normalizeItem(raw: unknown, fallbackWidth: OverviewWidgetWidth): OverviewLayoutItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Partial<OverviewLayoutItem>
  if (!isWidgetId(item.widgetId)) return null
  const instanceId =
    typeof item.instanceId === 'string' && item.instanceId.trim()
      ? item.instanceId.trim()
      : crypto.randomUUID()
  return {
    instanceId,
    widgetId: item.widgetId,
    width: normalizeWidth(item.width, fallbackWidth),
  }
}

/** Default layout — hero is fixed above the grid; cards only here. */
export function getDefaultOverviewLayout(): OverviewLayout {
  return {
    version: OVERVIEW_LAYOUT_VERSION,
    widgets: [
      { instanceId: 'default-diagnoses', widgetId: 'diagnoses', width: 'half' },
      { instanceId: 'default-medication', widgetId: 'medication', width: 'half' },
      { instanceId: 'default-spiegel-latest', widgetId: 'spiegel-latest', width: 'half' },
      { instanceId: 'default-psychopathology', widgetId: 'psychopathology', width: 'half' },
      { instanceId: 'default-zwangsmassnahme', widgetId: 'zwangsmassnahme', width: 'half' },
      { instanceId: 'default-verlaufstendenz', widgetId: 'verlaufstendenz', width: 'half' },
      { instanceId: 'default-labs', widgetId: 'labs-due', width: 'half' },
      { instanceId: 'default-ekg', widgetId: 'ekg-summary', width: 'half' },
      { instanceId: 'default-eeg', widgetId: 'eeg-summary', width: 'half' },
      { instanceId: 'default-ct', widgetId: 'ct-summary', width: 'half' },
      { instanceId: 'default-prior', widgetId: 'prior-therapies', width: 'half' },
      { instanceId: 'default-angemeldete', widgetId: 'angemeldete-therapien', width: 'half' },
      { instanceId: 'default-compliance', widgetId: 'compliance', width: 'half' },
    ],
  }
}

export function normalizeOverviewLayout(raw: unknown): OverviewLayout {
  if (!raw || typeof raw !== 'object') return getDefaultOverviewLayout()
  const parsed = raw as Partial<OverviewLayout>
  if (parsed.version !== OVERVIEW_LAYOUT_VERSION || !Array.isArray(parsed.widgets)) {
    return getDefaultOverviewLayout()
  }

  const seenInstanceIds = new Set<string>()
  const widgets: OverviewLayoutItem[] = []

  for (const entry of parsed.widgets) {
    const normalized = normalizeItem(entry, 'half')
    if (!normalized || seenInstanceIds.has(normalized.instanceId)) continue
    seenInstanceIds.add(normalized.instanceId)
    widgets.push(normalized)
  }

  return widgets.length > 0 ? { version: OVERVIEW_LAYOUT_VERSION, widgets } : getDefaultOverviewLayout()
}

export function layoutStorageKey(userId: string): string {
  return `${OVERVIEW_LAYOUT_STORAGE_BASE}:${userId.trim() || 'default'}`
}

export function loadOverviewLayout(userId: string): OverviewLayout {
  const raw = safeGetItem(layoutStorageKey(userId))
  if (!raw) return getDefaultOverviewLayout()
  try {
    return normalizeOverviewLayout(JSON.parse(raw) as unknown)
  } catch {
    return getDefaultOverviewLayout()
  }
}

export function saveOverviewLayout(userId: string, layout: OverviewLayout): void {
  safeSetItem(layoutStorageKey(userId), JSON.stringify(layout))
}

export function moveOverviewWidget(
  layout: OverviewLayout,
  fromIndex: number,
  toIndex: number,
): OverviewLayout {
  if (fromIndex === toIndex) return layout
  if (fromIndex < 0 || toIndex < 0) return layout
  if (fromIndex >= layout.widgets.length || toIndex >= layout.widgets.length) return layout

  const widgets = [...layout.widgets]
  const [moved] = widgets.splice(fromIndex, 1)
  widgets.splice(toIndex, 0, moved)
  return { ...layout, widgets }
}

export function removeOverviewWidget(layout: OverviewLayout, instanceId: string): OverviewLayout {
  return {
    ...layout,
    widgets: layout.widgets.filter((w) => w.instanceId !== instanceId),
  }
}

export function setOverviewWidgetWidth(
  layout: OverviewLayout,
  instanceId: string,
  width: OverviewWidgetWidth,
): OverviewLayout {
  return {
    ...layout,
    widgets: layout.widgets.map((w) => (w.instanceId === instanceId ? { ...w, width } : w)),
  }
}

export function addOverviewWidget(
  layout: OverviewLayout,
  widgetId: OverviewWidgetId,
  width: OverviewWidgetWidth = 'half',
): OverviewLayout {
  return {
    ...layout,
    widgets: [
      ...layout.widgets,
      {
        instanceId: crypto.randomUUID(),
        widgetId,
        width,
      },
    ],
  }
}

/** Widget types already present in the layout (singleton widgets cannot be added twice). */
export function usedOverviewWidgetIds(layout: OverviewLayout): Set<OverviewWidgetId> {
  return new Set(layout.widgets.map((w) => w.widgetId))
}

export type OverviewWidgetVisibility =
  | 'always'
  | 'hasSpiegel'
  | 'hasAdditionalSpiegel'
  | 'hasPsychotherapy'
  | 'hasIsdm'
  | 'hasLabData'
  | 'hasButterfly'
  | 'hasEeg'
  | 'hasZwangsmassnahme'

export interface OverviewWidgetVisibilityContext {
  hasSpiegel: boolean
  hasAdditionalSpiegel: boolean
  hasPsychotherapy: boolean
  hasIsdm: boolean
  hasLabData: boolean
  hasButterfly: boolean
  hasEeg: boolean
  hasZwangsmassnahme: boolean
}

export interface OverviewWidgetPlacement {
  item: OverviewLayoutItem
  index: number
}

export type OverviewPackSegment =
  | { type: 'full'; placement: OverviewWidgetPlacement }
  | { type: 'columns'; left: OverviewWidgetPlacement[]; right: OverviewWidgetPlacement[] }

/**
 * Pack half-width widgets into the shorter column (masonry-style) while preserving
 * user order. Full-width widgets flush the current column pair and span the row.
 */
export function packOverviewWidgets(
  placements: OverviewWidgetPlacement[],
  sizeWeight: (widgetId: OverviewWidgetId) => number,
): OverviewPackSegment[] {
  const segments: OverviewPackSegment[] = []
  let left: OverviewWidgetPlacement[] = []
  let right: OverviewWidgetPlacement[] = []
  let leftHeight = 0
  let rightHeight = 0

  const flushColumns = () => {
    if (left.length === 0 && right.length === 0) return
    segments.push({ type: 'columns', left: [...left], right: [...right] })
    left = []
    right = []
    leftHeight = 0
    rightHeight = 0
  }

  for (const placement of placements) {
    if (placement.item.width === 'full') {
      flushColumns()
      segments.push({ type: 'full', placement })
      continue
    }

    const weight = sizeWeight(placement.item.widgetId)
    if (leftHeight <= rightHeight) {
      left.push(placement)
      leftHeight += weight
    } else {
      right.push(placement)
      rightHeight += weight
    }
  }

  flushColumns()
  return segments
}

export function isOverviewWidgetVisible(
  _widgetId: OverviewWidgetId,
  visibility: OverviewWidgetVisibility,
  ctx: OverviewWidgetVisibilityContext,
): boolean {
  if (visibility === 'hasSpiegel') return ctx.hasSpiegel
  if (visibility === 'hasAdditionalSpiegel') return ctx.hasAdditionalSpiegel
  if (visibility === 'hasPsychotherapy') return ctx.hasPsychotherapy
  if (visibility === 'hasIsdm') return ctx.hasIsdm
  if (visibility === 'hasLabData') return ctx.hasLabData
  if (visibility === 'hasButterfly') return ctx.hasButterfly
  if (visibility === 'hasEeg') return ctx.hasEeg
  if (visibility === 'hasZwangsmassnahme') return ctx.hasZwangsmassnahme
  return true
}
