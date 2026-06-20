/**
 * Butterfly product mark (criteria support, Ask Butterfly, overview widgets).
 * Transparent icon-only PNGs derived from `Butterfly logo.png`.
 */
const colorModules = import.meta.glob('../assets/brand/butterfly-icon.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const greyModules = import.meta.glob('../assets/brand/butterfly-icon-grey.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function firstSrc(modules: Record<string, string>): string | null {
  const values = Object.values(modules)
  return values.length > 0 ? values[0] : null
}

export const butterflyLogoSrc = firstSrc(colorModules)
export const butterflyLogoGreySrc = firstSrc(greyModules)
export const hasButterflyLogo = butterflyLogoSrc !== null
