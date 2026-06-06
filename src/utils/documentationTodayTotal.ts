const STORAGE_PREFIX = 'psychiatry-ink:documentation-today-total'

export function getDocumentationTodayDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function storageKeyForDate(dateKey: string): string {
  return `${STORAGE_PREFIX}:${dateKey}`
}

export function readDocumentationTodayTotalSeconds(dateKey = getDocumentationTodayDateKey()): number {
  try {
    const raw = localStorage.getItem(storageKeyForDate(dateKey))
    if (!raw) return 0
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

export function writeDocumentationTodayTotalSeconds(
  seconds: number,
  dateKey = getDocumentationTodayDateKey(),
): void {
  try {
    localStorage.setItem(storageKeyForDate(dateKey), String(Math.max(0, Math.floor(seconds))))
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

export function formatDocumentationDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
