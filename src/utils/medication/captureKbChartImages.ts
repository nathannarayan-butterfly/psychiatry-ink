/**
 * Capture on-screen KB pharma chart visuals (Recharts SVG, inline SVG) as PNG
 * data URLs for print/PDF/Word export. Charts must mark their root with
 * `data-kb-export-chart="<sectionKey>"` (see chart components).
 */

export type KbChartImageMap = Record<string, string>

function svgToPngDataUrl(svg: SVGSVGElement): string | null {
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement
    const bbox = svg.getBoundingClientRect()
    const width = Math.max(1, Math.round(bbox.width || Number(svg.getAttribute('width')) || 640))
    const height = Math.max(1, Math.round(bbox.height || Number(svg.getAttribute('height')) || 320))
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }
    const serialized = new XMLSerializer().serializeToString(clone)
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`
    // In jsdom / headless tests there is no Image — return the SVG data URL as a
    // stable placeholder the export HTML can reference.
    if (typeof Image === 'undefined') {
      return svgUrl
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return svgUrl
    const img = new Image()
    img.src = svgUrl
    // Synchronous path for already-loaded inline SVG in real browsers is rare;
    // callers run this immediately before export while charts are painted.
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, width, height)
      return canvas.toDataURL('image/png')
    }
    return svgUrl
  } catch {
    return null
  }
}

/** Walk a DOM subtree and snapshot every marked chart container. */
export function captureKbChartImages(root: ParentNode | null | undefined): KbChartImageMap {
  if (!root) return {}
  const images: KbChartImageMap = {}
  root.querySelectorAll('[data-kb-export-chart]').forEach((node, index) => {
    const key = node.getAttribute('data-kb-export-chart') ?? `chart-${index}`
    const svg = node.querySelector('svg')
    if (!svg) return
    const dataUrl = svgToPngDataUrl(svg)
    if (dataUrl) images[key] = dataUrl
  })
  return images
}

/** Build HTML `<img>` blocks for injected chart snapshots (print/PDF/Word). */
export function buildKbChartImagesHtml(
  images: KbChartImageMap,
  escapeHtml: (value: string) => string,
): string {
  const entries = Object.entries(images)
  if (entries.length === 0) return ''
  return entries
    .map(
      ([key, src]) =>
        `<figure class="med-print__chart" data-chart-key="${escapeHtml(key)}"><img src="${src}" alt="${escapeHtml(key)}" style="max-width:100%;height:auto;" /></figure>`,
    )
    .join('')
}
