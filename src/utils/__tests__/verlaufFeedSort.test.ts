import { describe, expect, it } from 'vitest'
import { clinicalEventTime } from '../verlauf/clinicalEvents'
import type { VerlaufSortOrder } from '../verlaufFeed'

type Sortable = { id: string; ts: number }

function sortLikeFeed(items: Sortable[], sortOrder: VerlaufSortOrder): Sortable[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byTs = sortOrder === 'oldest' ? a.item.ts - b.item.ts : b.item.ts - a.item.ts
      if (byTs !== 0) return byTs
      return sortOrder === 'oldest' ? a.index - b.index : b.index - a.index
    })
    .map(({ item }) => item)
}

describe('Verlauf feed sort', () => {
  it('orders by timestamp newest-first and oldest-first', () => {
    const items = [
      { id: 'a', ts: clinicalEventTime('2026-06-02T08:00:00.000Z') },
      { id: 'b', ts: clinicalEventTime('2026-06-05T10:00:00.000Z') },
      { id: 'c', ts: clinicalEventTime('2026-06-03T12:00:00.000Z') },
    ]

    expect(sortLikeFeed(items, 'newest').map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(sortLikeFeed(items, 'oldest').map((item) => item.id)).toEqual(['a', 'c', 'b'])
  })

  it('reverses source order when timestamps tie', () => {
    const items = [
      { id: 'first', ts: 0 },
      { id: 'second', ts: 0 },
      { id: 'third', ts: 0 },
    ]

    expect(sortLikeFeed(items, 'newest').map((item) => item.id)).toEqual([
      'third',
      'second',
      'first',
    ])
    expect(sortLikeFeed(items, 'oldest').map((item) => item.id)).toEqual([
      'first',
      'second',
      'third',
    ])
  })
})
