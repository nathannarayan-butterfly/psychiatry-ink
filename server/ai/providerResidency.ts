/**
 * LLM provider data-residency gating.
 *
 * Psychiatry.Ink serves EU clinical customers. Even though every LLM-bound
 * payload is de-identified server-side (see `safeLlmEgress.ts`), the *provider's*
 * processing jurisdiction is itself a data-residency consideration for EU
 * deployments. In particular DeepSeek processes requests in China — a third
 * country without an EU adequacy decision — so EU operators may need to exclude
 * it regardless of de-identification.
 *
 * This gate is OPT-IN so existing/global deployments are unaffected:
 *   - `LLM_RESIDENCY=eu`            → blocks providers outside the EU-approved set
 *                                     (currently DeepSeek / China).
 *   - `LLM_BLOCKED_PROVIDERS=a,b`   → explicit blocklist (any environment).
 *
 * When a requested/resolved provider is blocked, the resolver transparently
 * falls back to an allowed provider that has an API key configured. If none is
 * available, an {@link LlmResidencyError} (HTTP 451) is thrown rather than
 * silently routing EU patient-derived data to a disallowed jurisdiction.
 */

import type { AiProviderId } from '../modelTierMapping'

export type ProviderResidency = 'eu' | 'us' | 'cn'

/** Best-effort processing jurisdiction per provider. */
export const PROVIDER_RESIDENCY: Record<AiProviderId, ProviderResidency> = {
  openai: 'us',
  google: 'us',
  deepseek: 'cn',
  // Mistral AI is a French company processing requests in the EU, so it is the
  // first-class EU-residency choice (permitted as-is under `LLM_RESIDENCY=eu`).
  mistral: 'eu',
}

/** Residencies considered acceptable when `LLM_RESIDENCY=eu` is set. */
const EU_APPROVED_RESIDENCIES: ReadonlySet<ProviderResidency> = new Set<ProviderResidency>([
  'eu',
  // US providers are permitted under SCC/DPF in this gate; tighten per your DPA.
  'us',
])

function parseList(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set()
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function blockedProviders(): Set<AiProviderId> {
  const blocked = new Set<AiProviderId>()
  const explicit = parseList(process.env.LLM_BLOCKED_PROVIDERS)
  for (const provider of Object.keys(PROVIDER_RESIDENCY) as AiProviderId[]) {
    if (explicit.has(provider)) blocked.add(provider)
  }
  if ((process.env.LLM_RESIDENCY ?? '').trim().toLowerCase() === 'eu') {
    for (const provider of Object.keys(PROVIDER_RESIDENCY) as AiProviderId[]) {
      if (!EU_APPROVED_RESIDENCIES.has(PROVIDER_RESIDENCY[provider])) blocked.add(provider)
    }
  }
  return blocked
}

export function isProviderAllowed(provider: AiProviderId): boolean {
  return !blockedProviders().has(provider)
}

/** Thrown when no residency-compliant provider can serve the request. */
export class LlmResidencyError extends Error {
  readonly status = 451
  constructor(message: string) {
    super(message)
    this.name = 'LlmResidencyError'
  }
}
