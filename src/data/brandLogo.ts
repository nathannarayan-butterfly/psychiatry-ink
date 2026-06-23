/**
 * Primary brand mark — the inkwell + fountain pen “.ink” logo.
 *
 *   Ink_logo.svg      ← preferred for light backgrounds (black artwork)
 *   Ink_logo.png      ← raster fallback (4500×4500, transparent)
 *
 * The monochrome/white mark (`Ink_logo_BW.*`) is used on dark surfaces — see
 * `logoInkBwRawSvg` / `logoInkBwSrc` below.
 */
const logoModules = import.meta.glob('../assets/brand/Ink_logo.{svg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const LOGO_PRIORITY = ['Ink_logo.svg', 'Ink_logo.png', 'Ink_logo.webp'] as const

function resolveLogoInkSrc(): string | null {
  for (const name of LOGO_PRIORITY) {
    const entry = Object.entries(logoModules).find(([path]) => path.endsWith(`/${name}`))
    if (entry) return entry[1]
  }
  return null
}

export const logoInkSrc = resolveLogoInkSrc()

export const hasLogoInkMark = logoInkSrc !== null

/**
 * White/monochrome mark for dark backgrounds (dark sidebar, dark surfaces).
 * Exposed both as a plain image source and as inlined SVG (the artwork is
 * recolored white in-asset) so the dark-sidebar lockup can render it as a
 * crisp transparent silhouette instead of a flat inverted blob.
 */
const logoBwModules = import.meta.glob('../assets/brand/Ink_logo_BW.{svg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const LOGO_BW_PRIORITY = ['Ink_logo_BW.svg', 'Ink_logo_BW.png', 'Ink_logo_BW.webp'] as const

function resolveLogoInkBwSrc(): string | null {
  for (const name of LOGO_BW_PRIORITY) {
    const entry = Object.entries(logoBwModules).find(([path]) => path.endsWith(`/${name}`))
    if (entry) return entry[1]
  }
  return null
}

export const logoInkBwSrc = resolveLogoInkBwSrc()

/**
 * Raw SVG source for the white mark. The exported asset paints the artwork
 * white on an opaque black backing rectangle; for inline UI use we strip that
 * backing `<rect>` so the white silhouette sits transparently on whatever dark
 * surface hosts it.
 */
const logoBwRawModules = import.meta.glob('../assets/brand/Ink_logo_BW.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function resolveLogoInkBwRawSvg(): string | null {
  const entry = Object.entries(logoBwRawModules).find(([path]) =>
    path.endsWith('/Ink_logo_BW.svg'),
  )
  if (!entry) return null
  // Drop the opaque backing rectangle so the mark is transparent on dark UI.
  return entry[1].replace(/<rect\b[^>]*\/>\s*/i, '')
}

export const logoInkBwRawSvg = resolveLogoInkBwRawSvg()
