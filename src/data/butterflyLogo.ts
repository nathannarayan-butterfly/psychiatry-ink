/**
 * Butterfly product mark (Ask Butterfly chat, criteria support, overview widgets).
 * Source: `Butetrfly-logo-transparent.png` (alpha matte removed from brand icon).
 */
const logoModules = import.meta.glob('../assets/brand/Butetrfly-logo-transparent.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function firstSrc(modules: Record<string, string>): string | null {
  const values = Object.values(modules)
  return values.length > 0 ? values[0] : null
}

export const butterflyLogoSrc = firstSrc(logoModules)
/** Monochrome mark — same asset as color (logo is neutral grey). */
export const butterflyLogoGreySrc = butterflyLogoSrc
export const hasButterflyLogo = butterflyLogoSrc !== null
