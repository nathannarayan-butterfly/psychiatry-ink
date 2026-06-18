import { describe, expect, it, beforeEach } from 'vitest'
import {
  addOverviewWidget,
  getDefaultOverviewLayout,
  layoutStorageKey,
  loadOverviewLayout,
  moveOverviewWidget,
  normalizeOverviewLayout,
  OVERVIEW_WIDGET_IDS,
  removeOverviewWidget,
  saveOverviewLayout,
  setOverviewWidgetWidth,
  usedOverviewWidgetIds,
} from '../overviewLayout'

describe('overviewLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns a stable default layout with all core widgets', () => {
    const layout = getDefaultOverviewLayout()
    expect(layout.version).toBe(1)
    expect(layout.widgets.length).toBeGreaterThanOrEqual(8)
    expect(layout.widgets[0]?.widgetId).toBe('hero-summary')
    expect(layout.widgets.some((w) => w.widgetId === 'safety')).toBe(true)
    expect(layout.widgets.some((w) => w.widgetId === 'medication')).toBe(true)
  })

  it('normalizes invalid persisted payloads to the default layout', () => {
    expect(normalizeOverviewLayout(null)).toEqual(getDefaultOverviewLayout())
    expect(normalizeOverviewLayout({ version: 2, widgets: [] })).toEqual(getDefaultOverviewLayout())
    expect(
      normalizeOverviewLayout({
        version: 1,
        widgets: [{ instanceId: 'x', widgetId: 'not-a-widget', width: 'half' }],
      }),
    ).toEqual(getDefaultOverviewLayout())
  })

  it('keeps valid widgets and drops unknown ids', () => {
    const normalized = normalizeOverviewLayout({
      version: 1,
      widgets: [
        { instanceId: 'a', widgetId: 'safety', width: 'half' },
        { instanceId: 'b', widgetId: 'bogus', width: 'full' },
        { instanceId: 'c', widgetId: 'medication', width: 'invalid' },
      ],
    })
    expect(normalized.widgets).toHaveLength(2)
    expect(normalized.widgets[0]).toMatchObject({ instanceId: 'a', widgetId: 'safety', width: 'half' })
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

    const added = addOverviewWidget(base, 'labs-due', 'full')
    expect(added.widgets.at(-1)).toMatchObject({ widgetId: 'labs-due', width: 'full' })
  })

  it('tracks used widget ids for the add palette', () => {
    const used = usedOverviewWidgetIds(getDefaultOverviewLayout())
    expect(used.has('safety')).toBe(true)
    expect(used.has('hero-summary')).toBe(true)
  })

  it('registry includes all known widget ids', () => {
    expect(OVERVIEW_WIDGET_IDS.length).toBe(17)
  })

  it('persists per-user layout in localStorage', () => {
    const userId = 'user-123'
    const custom = addOverviewWidget(getDefaultOverviewLayout(), 'diagnoses')
    saveOverviewLayout(userId, custom)
    expect(localStorage.getItem(layoutStorageKey(userId))).toBeTruthy()
    const loaded = loadOverviewLayout(userId)
    expect(loaded.widgets.length).toBe(custom.widgets.length)
  })
})
