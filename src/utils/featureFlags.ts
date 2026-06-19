/**
 * Feature flags — client-side.
 *
 * Enterprise org hierarchy is disabled by default. To enable locally, add to `.env.local`:
 *   VITE_ENABLE_ENTERPRISE_ORG_HIERARCHY=true
 * (Do not commit `.env.local`.)
 */
export function isEnterpriseOrgHierarchyEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_ENTERPRISE_ORG_HIERARCHY === 'true'
}

/**
 * CMEA (Clinical Metadata Extraction Agent) flags.
 *
 * The deterministic path is ALWAYS live: the regex extractor (Pass A) writes
 * cheap, provenance-tagged facts onto every imprint record regardless of these
 * flags. The flags only gate the (cost-bearing) LLM enrichment pass and whether
 * downstream consumers READ facts instead of their bespoke LLM routes.
 *
 * Enable locally in `.env.local`:
 *   VITE_ENABLE_CMEA_LLM=true              # run Pass B LLM enrichment on save
 *   VITE_ENABLE_CMEA_CONSUMER_READS=true   # consumers read facts via accessor
 */
export function isCmeaLlmEnrichmentEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_CMEA_LLM === 'true'
}

export function isCmeaConsumerReadEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_CMEA_CONSUMER_READS === 'true'
}

/**
 * Voice-driven inline AI text editing ("Ask AI to edit selection"). Enabled by
 * default; disable locally in `.env.local` if needed:
 *   VITE_DISABLE_INLINE_AI_EDIT=true
 */
export function isInlineAiEditEnabled(): boolean {
  return import.meta.env.VITE_DISABLE_INLINE_AI_EDIT !== 'true'
}

/**
 * Document Import — AI-assisted candidate mapping.
 *
 * OFF BY DEFAULT. Deterministic parsing is always the primary path and never
 * sends any uploaded content anywhere. When this flag is enabled, the review
 * screen may request AI *suggestions* for ambiguous content — but only after
 * de-identification, and suggestions ALWAYS require explicit clinician acceptance
 * (they are never auto-committed into the chart).
 *
 * Enable locally in `.env.local`:
 *   VITE_ENABLE_DOCUMENT_IMPORT_AI=true
 */
export function isDocumentImportAiMappingEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_DOCUMENT_IMPORT_AI === 'true'
}
