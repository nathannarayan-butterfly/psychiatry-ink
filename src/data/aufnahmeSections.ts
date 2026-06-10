import { aufnahmeanlassSectionAi } from './aiManagerPresets'
import type { WorkspaceSectionTemplate } from '../types/workspaceSettings'

export const defaultAufnahmeSections: WorkspaceSectionTemplate[] = [
  { id: 'aufnahmeanlass', label: 'Aufnahmeanlass', ai: aufnahmeanlassSectionAi },
  { id: 'aktuelle-beschwerden', label: 'Aktuelle Beschwerden' },
  { id: 'eigenanamnese', label: 'Eigenanamnese' },
  { id: 'aktuelle-krankheitsanamnese', label: 'Aktuelle Krankheitsanamnese' },
  { id: 'psychiatrische-vorgeschichte', label: 'Psychiatrische Vorgeschichte' },
  { id: 'somatische-anamnese', label: 'Somatische Anamnese' },
  { id: 'suchtanamnese', label: 'Suchtanamnese' },
  { id: 'medikamentenanamnese', label: 'Medikamentenanamnese' },
  { id: 'familienanamnese', label: 'Familienanamnese' },
  { id: 'biografische-anamnese', label: 'Biografische Anamnese' },
  { id: 'sozialanamnese', label: 'Sozialanamnese' },
  { id: 'schul-und-berufsanamnese', label: 'Schul- und Berufsanamnese' },
  { id: 'forensische-anamnese', label: 'Forensische Anamnese' },
  { id: 'traumaanamnese', label: 'Traumaanamnese' },
  {
    id: 'suizid-und-selbstgefaehrdungsanamnese',
    label: 'Suizid- und Selbstgefährdungsanamnese',
  },
  { id: 'fremdgefaehrdungsanamnese', label: 'Fremdgefährdungsanamnese' },
  { id: 'psychopathologischer-befund', label: 'Psychopathologischer Befund' },
  { id: 'somatischer-befund', label: 'Somatischer Befund' },
  { id: 'diagnostische-einschaetzung', label: 'Diagnostische Einschätzung' },
  { id: 'therapieplanung-behandlungsplan', label: 'Therapieplanung / Behandlungsplan' },
]

export function cloneAufnahmeSections(): WorkspaceSectionTemplate[] {
  return defaultAufnahmeSections.map((section) => ({ ...section }))
}
