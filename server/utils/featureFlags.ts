/** Server-side feature flags. Set ENABLE_ENTERPRISE_ORG_HIERARCHY=true to enable. */
export function isEnterpriseOrgHierarchyEnabled(): boolean {
  return process.env.ENABLE_ENTERPRISE_ORG_HIERARCHY === 'true'
}

export function isEnterpriseTier(tier: string | null | undefined): boolean {
  return tier === 'enterprise'
}

/**
 * Document Import AI-assisted mapping. OFF by default. The route returns 404
 * unless ENABLE_DOCUMENT_IMPORT_AI=true. Only de-identified text reaches this
 * endpoint, and suggestions never auto-commit into a chart.
 */
export function isDocumentImportAiEnabled(): boolean {
  return process.env.ENABLE_DOCUMENT_IMPORT_AI === 'true'
}

/**
 * Psychopathology structured extraction for the Übersicht PPB widget. OFF by default.
 * Only de-identified text reaches this endpoint; results require clinician acceptance.
 */
export function isPsychopathExtractAiEnabled(): boolean {
  return process.env.ENABLE_PSYCHOPATH_EXTRACT_AI?.trim() === 'true'
}

/**
 * Clinical Intelligence V1 — server-side feature flag.
 *
 * OFF BY DEFAULT. The route returns 404 unless
 * CLINICAL_INTELLIGENCE_V1_ENABLED=true. Only de-identified compact evidence
 * is accepted; raw documents are rejected by the route handler.
 */
export function isClinicalIntelligenceV1Enabled(): boolean {
  return process.env.CLINICAL_INTELLIGENCE_V1_ENABLED?.trim() === 'true'
}

/**
 * Clinical Intelligence — debug mode flag (server side).
 *
 * When enabled, the run response includes additional diagnostics for the
 * client's Development Mode panel. OFF by default.
 */
export function isClinicalIntelligenceDebugMode(): boolean {
  return process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE?.trim() === 'true'
}
