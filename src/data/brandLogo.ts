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
