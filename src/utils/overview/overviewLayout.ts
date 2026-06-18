import { safeGetItem, safeSetItem } from '../safeStorage'

export const OVERVIEW_LAYOUT_VERSION = 1 as const
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

export type OverviewWidgetWidth = 'half' | 'full'

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

/** Default layout mirrors the original fixed Übersicht grid (hero + cards). */
export function getDefaultOverviewLayout(): OverviewLayout {
  return {
    version: OVERVIEW_LAYOUT_VERSION,
    widgets: [
      { instanceId: 'default-hero', widgetId: 'hero-summary', width: 'full' },
      { instanceId: 'default-safety', widgetId: 'safety', width: 'half' },
      { instanceId: 'default-medication', widgetId: 'medication', width: 'half' },
      { instanceId: 'default-diagnoses', widgetId: 'diagnoses', width: 'half' },
      { instanceId: 'default-psychopathology', widgetId: 'psychopathology', width: 'half' },
      { instanceId: 'default-labs', widgetId: 'labs-due', width: 'half' },
      { instanceId: 'default-prior', widgetId: 'prior-therapies', width: 'half' },
      { instanceId: 'default-spiegel-latest', widgetId: 'spiegel-latest', width: 'half' },
      { instanceId: 'default-spiegel-all', widgetId: 'spiegel-all', width: 'full' },
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

export interface OverviewWidgetVisibilityContext {
  hasSpiegel: boolean
  hasAdditionalSpiegel: boolean
  hasPsychotherapy: boolean
  hasIsdm: boolean
  hasLabData: boolean
  hasButterfly: boolean
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
  return true
}
