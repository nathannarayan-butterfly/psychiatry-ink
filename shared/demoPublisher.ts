/** Default demo publisher — override via DEMO_PUBLISHER_EMAIL (comma-separated allowlist). */

export const DEFAULT_DEMO_PUBLISHER_EMAIL = 'nathan.narayan@butterflyproject.eu'

function parsePublisherAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) return [DEFAULT_DEMO_PUBLISHER_EMAIL]
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function resolveDemoPublisherEmails(envValue?: string): string[] {
  return parsePublisherAllowlist(envValue)
}

export function isDemoPublisherEmail(
  email: string | undefined | null,
  envValue?: string,
): boolean {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return false
  return resolveDemoPublisherEmails(envValue).includes(normalized)
}
