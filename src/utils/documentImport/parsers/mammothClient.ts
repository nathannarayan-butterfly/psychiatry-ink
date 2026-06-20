/**
 * Browser-only mammoth loader. Kept in its own module so the ~900 KB parser is
 * code-split and Vite can pre-bundle mammoth at dev-server startup (see
 * optimizeDeps.include in vite.config.ts).
 */
import mammoth from 'mammoth'

export async function extractDocxRawText(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value
}
