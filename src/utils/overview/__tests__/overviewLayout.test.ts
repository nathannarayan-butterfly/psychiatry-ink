import { describe, expect, it, beforeEach } from 'vitest'
import {
  addOverviewWidget,
  getDefaultOverviewLayout,
  layoutStorageKey,
  loadOverviewLayout,
  moveOverviewWidget,
  normalizeOverviewLayout,
  OVERVIEW_WIDGET_IDS,
  OVERVIEW_WIDGET_SIZE_WEIGHT,
  packOverviewWidgets,
  removeOverviewWidget,
  saveOverviewLayout,
  setOverviewWidgetWidth,
  usedOverviewWidgetIds,
  type OverviewWidgetId,
} from '../overviewLayout'

const EXPECTED_DEFAULT_ORDER: string[] = [
  'diagnoses',
  'medication',
  'spiegel-latest',
  'psychopathology',
  'zwangsmassnahme',
  'verlaufstendenz',
  'labs-due',
  'ekg-summary',
  'eeg-summary',
  'ct-summary',
  'prior-therapies',
  'angemeldete-therapien',
  'compliance',
]

describe('overviewLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the redesigned default layout in clinical priority order', () => {
    const layout = getDefaultOverviewLayout()
    expect(layout.version).toBe(2)
    expect(layout.widgets.map((w) => w.widgetId)).toEqual(EXPECTED_DEFAULT_ORDER)
    expect(layout.widgets[0]?.widgetId).toBe('diagnoses')
    expect(layout.widgets.some((w) => w.widgetId !== 'hero-summary')).toBe(true)
  })

  it('normalizes invalid persisted payloads to the default layout', () => {
    expect(normalizeOverviewLayout(null)).toEqual(getDefaultOverviewLayout())
    expect(normalizeOverviewLayout({ version: 1, widgets: [] })).toEqual(getDefaultOverviewLayout())
    expect(
      normalizeOverviewLayout({
        version: 1,
        widgets: [{ instanceId: 'x', widgetId: 'not-a-widget', width: 'half' }],
      }),
    ).toEqual(getDefaultOverviewLayout())
  })

  it('keeps valid widgets and drops unknown ids', () => {
    const normalized = normalizeOverviewLayout({
      version: 2,
      widgets: [
        { instanceId: 'a', widgetId: 'diagnoses', width: 'half' },
        { instanceId: 'b', widgetId: 'bogus', width: 'full' },
        { instanceId: 'c', widgetId: 'medication', width: 'invalid' },
      ],
    })
    expect(normalized.widgets).toHaveLength(2)
    expect(normalized.widgets[0]).toMatchObject({ instanceId: 'a', widgetId: 'diagnoses', width: 'half' })
    expect(normalized.widgets[1]).toMatchObject({ instanceId: 'c', widgetId: 'medication', width: 'half' })
  })

  it('moves, removes, resizes, and adds widgets immutably', () => {
    const base = getDefaultOverviewLayout()
    const moved = moveOverviewWidget(base, 1, 3)
    expect(moved.widgets[3]?.widgetId).toBe(base.widgets[1]?.widgetId)

    const firstId = base.widgets[0]?.instanceId
    const removed = removeOverviewWidget(base, firstId!)
    expect(removed.widgets.some((w) => w.instanceId === firstId)).toBe(false)

    const widened = setOverviewWidgetWidth(base, base.widgets[1]!.instanceId, 'full')
    expect(widened.widgets[1]?.width).toBe('full')

    const added = addOverviewWidget(base, 'safety', 'full')
    expect(added.widgets.at(-1)).toMatchObject({ widgetId: 'safety', width: 'full' })
  })

  it('tracks used widget ids for the add palette', () => {
    const used = usedOverviewWidgetIds(getDefaultOverviewLayout())
    expect(used.has('diagnoses')).toBe(true)
    expect(used.has('hero-summary')).toBe(false)
  })

  it('registry includes all known widget ids', () => {
    expect(OVERVIEW_WIDGET_IDS.length).toBe(24)
  })

  it('persists per-user layout in localStorage', () => {
    const userId = 'user-123'
    const custom = addOverviewWidget(getDefaultOverviewLayout(), 'safety')
    saveOverviewLayout(userId, custom)
    expect(localStorage.getItem(layoutStorageKey(userId))).toBeTruthy()
    const loaded = loadOverviewLayout(userId)
    expect(loaded.widgets.length).toBe(custom.widgets.length)
  })

  it('packs half-width widgets into the shorter column using size hints', () => {
    const weight = (_widgetId: OverviewWidgetId) => OVERVIEW_WIDGET_SIZE_WEIGHT.tall
    const placements = [
      { item: { instanceId: 'a', widgetId: 'medication' as const, width: 'half' as const }, index: 0 },
      { item: { instanceId: 'b', widgetId: 'ekg-summary' as const, width: 'half' as const }, index: 1 },
      { item: { instanceId: 'c', widgetId: 'compliance' as const, width: 'half' as const }, index: 2 },
    ]

    const packed = packOverviewWidgets(placements, weight)
    expect(packed).toHaveLength(1)
    expect(packed[0]?.type).toBe('columns')
    if (packed[0]?.type !== 'columns') return

    expect(packed[0].left.map((p) => p.item.widgetId)).toEqual(['medication', 'compliance'])
    expect(packed[0].right.map((p) => p.item.widgetId)).toEqual(['ekg-summary'])
  })

  it('flushes columns before and after full-width widgets', () => {
    const weight = () => 1
    const placements = [
      { item: { instanceId: 'a', widgetId: 'diagnoses' as const, width: 'half' as const }, index: 0 },
      { item: { instanceId: 'b', widgetId: 'medication' as const, width: 'half' as const }, index: 1 },
      { item: { instanceId: 'c', widgetId: 'spiegel-all' as const, width: 'full' as const }, index: 2 },
      { item: { instanceId: 'd', widgetId: 'compliance' as const, width: 'half' as const }, index: 3 },
    ]

    const packed = packOverviewWidgets(placements, weight)
    expect(packed.map((segment) => segment.type)).toEqual(['columns', 'full', 'columns'])
    expect(packed[1]?.type).toBe('full')
    if (packed[1]?.type === 'full') {
      expect(packed[1].placement.item.widgetId).toBe('spiegel-all')
    }
  })

  it('packs the default clinical layout without leaving an empty column pair', () => {
    const layout = getDefaultOverviewLayout()
    const placements = layout.widgets.map((item, index) => ({ item, index }))
    const packed = packOverviewWidgets(placements, (widgetId) => {
      if (widgetId === 'medication' || widgetId === 'psychopathology' || widgetId === 'labs-due') return 3
      if (
        widgetId === 'ekg-summary' ||
        widgetId === 'eeg-summary' ||
        widgetId === 'ct-summary' ||
        widgetId === 'compliance' ||
        widgetId === 'zwangsmassnahme' ||
        widgetId === 'verlaufstendenz'
      ) {
        return 1
      }
      return 2
    })

    expect(packed.length).toBeGreaterThan(0)
    const columnSegments = packed.filter((segment) => segment.type === 'columns')
    for (const segment of columnSegments) {
      if (segment.type !== 'columns') continue
      expect(segment.left.length + segment.right.length).toBeGreaterThan(0)
    }
  })
})
