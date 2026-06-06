import type { KiDocumentTypeId, KiInstructionsSettings } from '../types/kiInstructions'

export function resolveKiExtraInstruction(
  settings: KiInstructionsSettings,
  documentTypeId: string,
): string {
  const override = settings.documentOverrides[documentTypeId as KiDocumentTypeId]
  if (override?.trim()) return override.trim()
  if (settings.defaultInstruction.trim()) return settings.defaultInstruction.trim()
  return ''
}
