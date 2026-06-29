/**
 * Per-entry title behaviour for the timeline (shared by the patient-context
 * timeline and the patient-less "Timeline erstellen" builder via
 * NotionTimelineCanvas -> TimelineWorkspace).
 *
 * Requirements covered:
 *  - An entry WITH a title renders that title as its heading.
 *  - An entry WITHOUT a title falls back to the date as its heading (nothing
 *    breaks for title-less entries).
 *  - The title is optional and persists in the timeline model.
 *  - The render path is shared: a titled (patient-context) entry is unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { TimelineEntry } from '../../../types/timeline'
import { TimelineListView } from '../TimelineListView'
import { useTimelineTool, type TimelineToolState } from '../../../hooks/useTimelineTool'
import { loadTimelinesList } from '../../../utils/timelinePersistence'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Keep the clinical-imprint side effect out of the persistence round-trip.
vi.mock('../../../utils/clinicalImprint', () => ({ scheduleTimelineImprints: vi.fn() }))

const priorityLabels = { low: 'L', medium: 'M', high: 'H', critical: 'C' } as const
const actionLabels = { editLabel: 'e', hideLabel: 'h', showLabel: 's', deleteLabel: 'd' }

const noop = () => {}

function makeEntry(overrides: Partial<TimelineEntry>): TimelineEntry {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    heading: '',
    subheading: '',
    priority: 'medium',
    dateKind: 'yy',
    dateValue: '15',
    sortKey: 20150615,
    displayDate: '2015',
    visible: true,
    ...overrides,
  }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  if (root) {
    const current = root
    await act(async () => current.unmount())
    root = null
  }
  container?.remove()
  container = null
  localStorage.clear()
  sessionStorage.clear()
})

describe('timeline entry title rendering (shared render path)', () => {
  it('renders the title as the entry heading and falls back to the date when absent', async () => {
    const titled = makeEntry({
      id: 'titled',
      heading: 'Erstmanifestation Psychose',
      sortKey: 20130615,
      dateValue: '13',
      displayDate: '2013',
      priority: 'high',
    })
    const untitled = makeEntry({
      id: 'untitled',
      heading: '',
      sortKey: 20170615,
      dateValue: '17',
      displayDate: '2017',
    })

    await act(async () => {
      root!.render(
        createElement(TimelineListView, {
          entries: [untitled, titled],
          onEditEntry: noop,
          onDeleteEntry: noop,
          onToggleEntryVisibility: noop,
          priorityLabels,
          ...actionLabels,
        }),
      )
      await Promise.resolve()
    })

    const headings = Array.from(
      container!.querySelectorAll('.timeline-list__heading'),
    ).map((node) => node.textContent)

    // Sorted by date: titled (2013) first, untitled (2017) second.
    expect(headings).toEqual(['Erstmanifestation Psychose', '2017'])
  })
})

describe('timeline entry title model (optional + persisted)', () => {
  let captured: TimelineToolState | null = null

  function Harness({ caseId }: { caseId: string }) {
    captured = useTimelineTool(caseId)
    return null
  }

  it('persists a per-entry title and allows a title-less entry', async () => {
    const caseId = 'standalone-timeline'

    await act(async () => {
      root!.render(createElement(Harness, { caseId }))
      await Promise.resolve()
    })

    await act(async () => {
      captured!.createNewTimeline()
    })

    // Entry WITH a title.
    await act(async () => {
      captured!.openAddDialog()
    })
    await act(async () => {
      captured!.updateDraft({ heading: 'Erstdiagnose', dateKind: 'yy', dateValue: '15' })
    })
    let result: string | null = 'unset'
    await act(async () => {
      result = captured!.saveDraft()
    })
    expect(result).toBeNull()

    // Entry WITHOUT a title — now allowed (title is optional).
    await act(async () => {
      captured!.openAddDialog()
    })
    await act(async () => {
      captured!.updateDraft({ heading: '', dateKind: 'yy', dateValue: '20' })
    })
    await act(async () => {
      result = captured!.saveDraft()
    })
    expect(result).toBeNull()

    expect(captured!.entries).toHaveLength(2)
    const titled = captured!.entries.find((e) => e.dateValue === '15')
    const untitled = captured!.entries.find((e) => e.dateValue === '20')
    expect(titled?.heading).toBe('Erstdiagnose')
    expect(untitled?.heading).toBe('')

    // The title persists in the saved model (localStorage round-trip).
    const persisted = loadTimelinesList(caseId)
    expect(persisted).toHaveLength(1)
    const persistedTitled = persisted[0].entries.find((e) => e.dateValue === '15')
    expect(persistedTitled?.heading).toBe('Erstdiagnose')
  })
})
