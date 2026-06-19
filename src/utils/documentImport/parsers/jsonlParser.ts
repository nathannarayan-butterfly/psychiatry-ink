/**
 * JSONL / NDJSON adapter — one JSON record per line. Malformed lines are reported
 * as notices (with line numbers) and skipped; valid lines still import.
 */
import { mapJsonValueToCandidates } from '../jsonMapping'
import { extractPatientIdentity } from '../patientIdentity'
import { readText } from '../fileIo'
import { buildPreview, notice, type AdapterResult } from './adapterResult'
import type { ClinicalImportCandidate, ImportNotice } from '../../../schemas/documentImport/envelope'

export function parseJsonlText(text: string): AdapterResult {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const candidates: ClinicalImportCandidate[] = []
  const notices: ImportNotice[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return
    const lineNumber = index + 1
    let value: unknown
    try {
      value = JSON.parse(trimmed)
    } catch {
      notices.push(notice('warning', 'jsonl_line_invalid', `Zeile ${lineNumber}: ungültiges JSON, übersprungen.`))
      return
    }
    const mapped = mapJsonValueToCandidates(value, `line${lineNumber}`)
    for (const candidate of mapped) {
      candidate.sourceLocation = { ...candidate.sourceLocation, lineNumber }
      candidates.push(candidate)
    }
  })

  if (candidates.length === 0) {
    notices.push(notice('warning', 'jsonl_no_candidates', 'Keine klinischen Datensätze in der JSONL-Datei erkannt.'))
  }

  return {
    candidates,
    notices,
    parsingMode: 'structured',
    rawPreview: buildPreview(text.trim()),
    patientIdentity: extractPatientIdentity(text) ?? undefined,
  }
}

export async function parseJsonlFile(file: File): Promise<AdapterResult> {
  return parseJsonlText(await readText(file))
}
