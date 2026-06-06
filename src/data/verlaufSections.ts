import type { WorkspaceSectionTemplate } from '../types/workspaceSettings'

export const defaultVerlaufBroadSections: WorkspaceSectionTemplate[] = [
  { id: 'psychopathologie', label: 'Psychopathologie' },
  { id: 'stationsverhalten', label: 'Stationsverhalten' },
  { id: 'risiko', label: 'Risiko' },
  { id: 'compliance-krankheitseinsicht', label: 'Compliance / Krankheitseinsicht' },
  { id: 'medikation-vertraeglichkeit', label: 'Medikation / Verträglichkeit' },
  { id: 'besondere-ereignisse', label: 'Besondere Ereignisse' },
  { id: 'somatik', label: 'Somatik' },
  { id: 'beurteilung-plan', label: 'Beurteilung / Plan' },
]

export function cloneVerlaufBroadSections(): WorkspaceSectionTemplate[] {
  return defaultVerlaufBroadSections.map((section) => ({ ...section }))
}

export function isLegacyVerlaufBroadSections(sections: WorkspaceSectionTemplate[]): boolean {
  return sections.some((section) => section.id === 'aufnahmeanlass-ausgangslage')
}
