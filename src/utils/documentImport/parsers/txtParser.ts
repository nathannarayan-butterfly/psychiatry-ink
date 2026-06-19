/**
 * Plain-text adapter — runs the text through the shared clinical sectionizer.
 * Headings produce section-based candidates; un-headed text becomes a single
 * document candidate.
 */
import { docxTextToResult } from './docxParser'
import { readText } from '../fileIo'
import { buildPreview, type AdapterResult } from './adapterResult'

export function parseTxtText(text: string): AdapterResult {
  const result = docxTextToResult(text)
  return { ...result, rawPreview: buildPreview(text.trim()) }
}

export async function parseTxtFile(file: File): Promise<AdapterResult> {
  return parseTxtText(await readText(file))
}
