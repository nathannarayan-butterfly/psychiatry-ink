/**
 * Plain-text adapter — runs the text through the shared clinical sectionizer.
 * Headings produce section-based candidates; un-headed text becomes a single
 * document candidate.
 */
import { docxTextToResult } from './docxParser'
import { readText } from '../fileIo'
import { buildPreview, type AdapterResult } from './adapterResult'
import type { SectionizeOptions } from '../sectionize'

export function parseTxtText(text: string, options: SectionizeOptions = {}): AdapterResult {
  const result = docxTextToResult(text, options)
  return { ...result, rawPreview: buildPreview(text.trim()) }
}

export async function parseTxtFile(file: File, options: SectionizeOptions = {}): Promise<AdapterResult> {
  return parseTxtText(await readText(file), options)
}
