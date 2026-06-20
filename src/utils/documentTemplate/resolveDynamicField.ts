import type { PatientDynamicKey } from '../../data/documentTemplate/dynamicFields'
import type { TemplateRenderContext } from '../../types/documentTemplate'

export const DYNAMIC_FIELD_MISSING = '—'

function pickString(value: string | undefined | null): string {
  const trimmed = value?.trim()
  return trimmed ?? ''
}

function contextValue(context: TemplateRenderContext, key: PatientDynamicKey): string {
  switch (key) {
    case 'patient.name':
      return pickString(context.patient?.name)
    case 'patient.vorname':
      return pickString(context.patient?.vorname)
    case 'patient.nachname':
      return pickString(context.patient?.nachname)
    case 'patient.geburtsdatum':
      return pickString(context.patient?.geburtsdatum)
    case 'patient.age':
      return pickString(context.patient?.age)
    case 'patient.geschlecht':
      return pickString(context.patient?.geschlecht)
    case 'patient.caseId':
      return pickString(context.case?.caseId)
    case 'case.aufnahmedatum':
      return pickString(context.case?.aufnahmedatum)
    case 'case.entlassungsdatum':
      return pickString(context.case?.entlassungsdatum)
    case 'case.aufenthaltsdauer':
      return pickString(context.case?.aufenthaltsdauer)
    case 'patient.height':
      return pickString(context.patient?.height)
    case 'patient.weight':
      return pickString(context.patient?.weight)
    case 'patient.bmi':
      return pickString(context.patient?.bmi)
    case 'case.hauptdiagnose':
      return pickString(context.case?.diagnosis)
    case 'case.medikation_kurz':
      return pickString(context.case?.medikationKurz)
    case 'clinician.name':
      return pickString(context.clinician?.name)
    case 'system.today':
      return pickString(context.system?.date)
    case 'system.documentDate':
      return pickString(context.system?.documentDate)
    case 'patient.address':
      return pickString(context.patient?.address)
    case 'patient.kostentraeger':
      return pickString(context.patient?.kostentraeger)
    default:
      return ''
  }
}

/**
 * Resolve a dynamic patient/case token from render context.
 * Missing data returns an em dash — never throws.
 */
export function resolveDynamicField(
  tokenId: PatientDynamicKey,
  context: TemplateRenderContext,
  options?: { missingFallback?: string },
): string {
  const fallback = options?.missingFallback ?? DYNAMIC_FIELD_MISSING
  const resolved = contextValue(context, tokenId)
  return resolved || fallback
}
