/**
 * CI API errors use Butterfly CIS branding instead of the global KI prefix.
 */
export async function parseCiApiError(response: Response, fallback: string): Promise<never> {
  const detail = (await response.json().catch(() => null)) as { error?: string } | null
  const reason = detail?.error ?? `${fallback} (${response.status})`
  throw new Error(`Butterfly CIS-Anfrage fehlgeschlagen: ${reason}`)
}
