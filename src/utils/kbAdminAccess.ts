const KB_ADMIN_USERS_STORAGE_KEY = 'psychiatry-ink:kb-admin-users'

export { KB_ADMIN_USERS_STORAGE_KEY }

function parseIdList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

function readLocalAllowlist(): string[] {
  try {
    const raw = localStorage.getItem(KB_ADMIN_USERS_STORAGE_KEY)
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

export function writeLocalKbAdminAllowlist(entries: string[]): void {
  const normalized = entries.map((entry) => entry.trim()).filter(Boolean)
  localStorage.setItem(KB_ADMIN_USERS_STORAGE_KEY, JSON.stringify(normalized))
}

export function readLocalKbAdminAllowlist(): string[] {
  return readLocalAllowlist()
}

export interface KbAdminAccessInput {
  userId: string | null | undefined
  userEmail?: string | null
  appMetadataKbAdmin?: boolean
}

/** Client-side KB admin gate: env list, Supabase app_metadata, or local allowlist. */
export function isKbAdminUser(input: KbAdminAccessInput): boolean {
  if (input.appMetadataKbAdmin === true) return true

  const envIds = parseIdList(import.meta.env.VITE_KB_ADMIN_USER_IDS as string | undefined)
  const localIds = readLocalAllowlist()
  const allowlist = new Set([...envIds, ...localIds])

  if (allowlist.size === 0) {
    // Dev fallback: no allowlist configured → keep admin UI reachable locally.
    return import.meta.env.DEV
  }

  const candidates = [input.userId, input.userEmail]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase())

  return candidates.some((candidate) => allowlist.has(candidate))
}
