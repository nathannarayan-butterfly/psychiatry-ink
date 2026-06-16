/**
 * Brand mark (includes “.ink”). Drop files here — first match wins:
 *   logo-ink.svg   ← preferred (~5 KB, scales cleanly)
 *   logo-ink.png   ← fallback (~10 KB, 128×96)
 *   logo-ink.webp
 */
const logoModules = import.meta.glob('../assets/brand/logo-ink.{svg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const LOGO_PRIORITY = ['logo-ink.svg', 'logo-ink.png', 'logo-ink.webp'] as const

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
 * Raw SVG source (only the .svg variant). Inlined so the dark-sidebar (light)
 * variant can recolor the two artwork groups independently for a two-tone look
 * instead of a flat invert filter that white-washes the mark.
 */
const logoRawModules = import.meta.glob('../assets/brand/logo-ink.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function resolveLogoInkRawSvg(): string | null {
  const entry = Object.entries(logoRawModules).find(([path]) =>
    path.endsWith('/logo-ink.svg'),
  )
  return entry ? entry[1] : null
}

export const logoInkRawSvg = resolveLogoInkRawSvg()
