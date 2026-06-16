/** Date/label helpers shared across the Übersicht dashboard data layer. */

/** "14.06.2026" from an ISO string; falls back to the raw input on parse failure. */
export function formatDateDe(iso: string | undefined | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

/** "14.06." short form for compact chart-like labels. */
export function formatShortDateDe(iso: string | undefined | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(5, 10)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Calendar-day delta (ignoring time-of-day) between `iso` and now. */
function dayDelta(iso: string): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const startOf = (t: number) => {
    const x = new Date(t)
    x.setHours(0, 0, 0, 0)
    return x.getTime()
  }
  return Math.round((startOf(d.getTime()) - startOf(Date.now())) / DAY_MS)
}

/** German relative-day phrasing: "heute", "morgen", "in 3 Tagen", "vor 2 Tagen". */
export function relativeDayDe(iso: string | undefined | null): string | null {
  if (!iso) return null
  const delta = dayDelta(iso)
  if (delta === null) return null
  if (delta === 0) return 'heute'
  if (delta === 1) return 'morgen'
  if (delta === -1) return 'gestern'
  if (delta > 1) return `in ${delta} Tagen`
  return `vor ${Math.abs(delta)} Tagen`
}
