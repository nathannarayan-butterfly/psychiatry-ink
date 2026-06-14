import type { OrganisationTier } from '../../types/organisation'

export type FhirIntegrationLevel = false | 'basic' | true
export type Hl7v2IntegrationLevel = false | 'optional' | true

export interface IntegrationPlanCapabilities {
  fileImportExport: boolean
  fhir: FhirIntegrationLevel
  hl7v2: Hl7v2IntegrationLevel
  vendorConnectors: boolean
}

export interface PlanCapabilities {
  integrations: IntegrationPlanCapabilities
}

export type IntegrationCapabilityKey = keyof IntegrationPlanCapabilities

export const PLAN_CAPABILITIES: Record<OrganisationTier, PlanCapabilities> = {
  single_use: {
    integrations: {
      fileImportExport: true,
      fhir: 'basic',
      hl7v2: false,
      vendorConnectors: false,
    },
  },
  small_praxis: {
    integrations: {
      fileImportExport: true,
      fhir: true,
      hl7v2: 'optional',
      vendorConnectors: false,
    },
  },
  enterprise: {
    integrations: {
      fileImportExport: false,
      fhir: false,
      hl7v2: false,
      vendorConnectors: false,
    },
  },
}

/** Reserved adapter types — documented only, no runtime implementation. */
export const RESERVED_ADAPTER_TYPES = [
  'smart_on_fhir',
  'ihe_xds',
  'kim',
  'open_ehr',
  'vendor_specific',
] as const

export type ReservedAdapterType = (typeof RESERVED_ADAPTER_TYPES)[number]

export function getPlanCapabilities(tier: OrganisationTier): PlanCapabilities {
  return PLAN_CAPABILITIES[tier]
}

export function hasIntegrationCapability(
  tier: OrganisationTier,
  capability: IntegrationCapabilityKey,
): boolean {
  const value = PLAN_CAPABILITIES[tier].integrations[capability]
  if (value === false) return false
  return true
}

export function integrationCapabilityLabelDe(capability: IntegrationCapabilityKey): string {
  switch (capability) {
    case 'fileImportExport':
      return 'Datei-Import/Export'
    case 'fhir':
      return 'FHIR'
    case 'hl7v2':
      return 'HL7 v2'
    case 'vendorConnectors':
      return 'Hersteller-Konnektoren'
    default:
      return capability
  }
}
