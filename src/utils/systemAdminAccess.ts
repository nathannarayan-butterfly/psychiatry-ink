const SYSTEM_ADMIN_USERS_STORAGE_KEY = 'psychiatry-ink:system-admin-users'

export { SYSTEM_ADMIN_USERS_STORAGE_KEY }

function parseIdList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

function readLocalAllowlist(): string[] {
  try {
    const raw = localStorage.getItem(SYSTEM_ADMIN_USERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  } catch {
    return []
  }
}

export function writeLocalSystemAdminAllowlist(entries: string[]): void {
  const normalized = entries.map((entry) => entry.trim()).filter(Boolean)
  localStorage.setItem(SYSTEM_ADMIN_USERS_STORAGE_KEY, JSON.stringify(normalized))
}

export function readLocalSystemAdminAllowlist(): string[] {
  return readLocalAllowlist()
}

export interface SystemAdminAccessInput {
  userId: string | null | undefined
  userEmail?: string | null
  appMetadataSystemAdmin?: boolean
}

/**
 * Client-side **System Admin** gate — the only elevated role over the global
 * Knowledge Base. This is a UX hint that decides whether to surface the KB
 * review console; the authoritative check is always enforced server-side via
 * the `SYSTEM_ADMIN_USER_IDS` allowlist (never a client-trusted value).
 */
export function isSystemAdminUser(input: SystemAdminAccessInput): boolean {
  if (input.appMetadataSystemAdmin === true) return true

  const envIds = parseIdList(import.meta.env.VITE_SYSTEM_ADMIN_USER_IDS as string | undefined)
  const localIds = readLocalAllowlist()
  const allowlist = new Set([...envIds, ...localIds])

  if (allowlist.size === 0) {
    // Dev fallback: no allowlist configured → keep the console reachable locally.
    return import.meta.env.DEV
  }

  const candidates = [input.userId, input.userEmail]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase())

  return candidates.some((candidate) => allowlist.has(candidate))
}
