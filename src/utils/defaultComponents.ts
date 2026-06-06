export const DEFAULT_COMPONENT_IDS = [
  'aufnahme',
  'verlauf',
  'psychopath',
  'therapie-verlauf',
  'medikation',
  'therapieplanung',
] as const

export type DefaultComponentId = (typeof DEFAULT_COMPONENT_IDS)[number]

export function isDefaultComponent(componentId: string): boolean {
  return (DEFAULT_COMPONENT_IDS as readonly string[]).includes(componentId)
}
