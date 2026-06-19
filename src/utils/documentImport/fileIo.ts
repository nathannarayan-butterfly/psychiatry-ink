/**
 * Small Blob/File readers that work both in the browser (where Blob.text /
 * Blob.arrayBuffer exist) and in environments whose Blob lacks them (e.g. the
 * jsdom test runner), falling back to FileReader.
 */
export function readArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('readAsArrayBuffer failed'))
    reader.readAsArrayBuffer(blob)
  })
}

export function readText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('readAsText failed'))
    reader.readAsText(blob)
  })
}
