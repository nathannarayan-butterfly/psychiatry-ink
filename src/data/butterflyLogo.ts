/**
 * Butterfly product mark (Ask Butterfly chat, criteria support, overview
 * widgets). Redesigned mark — `Butterfly_logo.svg` (vector, gradient outline)
 * is preferred for in-app UI; the PNG is a raster fallback.
 */
const logoModules = import.meta.glob('../assets/brand/Butterfly_logo.{svg,png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const BUTTERFLY_PRIORITY = ['Butterfly_logo.svg', 'Butterfly_logo.png', 'Butterfly_logo.webp'] as const

function resolveButterflySrc(): string | null {
  for (const name of BUTTERFLY_PRIORITY) {
    const entry = Object.entries(logoModules).find(([path]) => path.endsWith(`/${name}`))
    if (entry) return entry[1]
  }
  return null
}

export const butterflyLogoSrc = resolveButterflySrc()
/** Monochrome mark — same asset as color (the redesigned mark is a single gradient). */
export const butterflyLogoGreySrc = butterflyLogoSrc
export const hasButterflyLogo = butterflyLogoSrc !== null

/**
 * Silver/metallic variant for DARK surfaces (e.g. the dark case sidebar). The
 * shipped mark is a cyan→blue→purple gradient that reads dim on dark panels, so
 * we inline the raw SVG and recolour its three gradient stops to a bright
 * brushed-metal ramp (near-white highlight → steel → light silver). A soft glow
 * is layered on via the `.butterfly-logo--silver` CSS class so it "shines"
 * against dark backgrounds. Light placements keep the original coloured PNG/SVG.
 */
const butterflyRawModules = import.meta.glob('../assets/brand/Butterfly_logo.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

/** Coloured gradient stops in the source artwork → metallic replacements. */
const SILVER_STOP_MAP: Record<string, string> = {
  '#00B7F9': '#F1F5F9', // top: near-white highlight
  '#2C23D4': '#94A3B8', // mid: steel
  '#BB52FF': '#E2E8F0', // bottom: light silver
}

function resolveButterflySilverSvg(): string | null {
  const entry = Object.entries(butterflyRawModules).find(([path]) =>
    path.endsWith('/Butterfly_logo.svg'),
  )
  if (!entry) return null

  let svg = entry[1].replace(/<\?xml[^>]*\?>\s*/i, '')
  for (const [from, to] of Object.entries(SILVER_STOP_MAP)) {
    svg = svg.replace(new RegExp(from, 'gi'), to)
  }
  // Let the inline mark fill whatever box the wrapper sizes it to.
  return svg.replace(/<svg\b/, '<svg width="100%" height="100%" style="display:block"')
}

export const butterflyLogoSilverSvg = resolveButterflySilverSvg()
