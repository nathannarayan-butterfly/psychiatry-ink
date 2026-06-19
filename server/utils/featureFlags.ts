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
