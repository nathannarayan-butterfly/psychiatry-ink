/**
 * JSON adapter — parses a single JSON document (object/array) into candidates.
 */
import { mapJsonValueToCandidates } from '../jsonMapping'
import { extractPatientIdentity } from '../patientIdentity'
import { readText } from '../fileIo'
import { buildPreview, notice, type AdapterResult } from './adapterResult'

export function parseJsonText(text: string): AdapterResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      candidates: [],
      notices: [notice('error', 'json_empty', 'Die JSON-Datei ist leer.')],
      parsingMode: 'structured',
    }
  }

  let value: unknown
  try {
    value = JSON.parse(trimmed)
  } catch (error) {
    return {
      candidates: [],
      notices: [
        notice(
          'error',
          'json_invalid',
          `Ungültiges JSON: ${error instanceof Error ? error.message : 'Parsing fehlgeschlagen'}`,
        ),
      ],
      parsingMode: 'structured',
      rawPreview: buildPreview(trimmed),
    }
  }

  const candidates = mapJsonValueToCandidates(value)
  const notices = candidates.length === 0
    ? [notice('warning', 'json_no_candidates', 'Keine klinischen Felder im JSON erkannt.')]
    : []

  return {
    candidates,
    notices,
    parsingMode: 'structured',
    rawPreview: buildPreview(trimmed),
    patientIdentity: extractPatientIdentity(trimmed) ?? undefined,
  }
}

export async function parseJsonFile(file: File): Promise<AdapterResult> {
  return parseJsonText(await readText(file))
}
