import { butterflyLogoGreySrc, butterflyLogoSrc, hasButterflyLogo } from '../data/butterflyLogo'

export type ButterflyLogoVariant = 'color' | 'grey'

export interface ButterflyLogoProps {
  /** Full-color mark for headers/panels; grey for nav and small inline icons. */
  variant?: ButterflyLogoVariant
  /** Render width/height in CSS pixels (viewBox preserves aspect). */
  size?: number
  className?: string
}

export function ButterflyLogo({
  variant = 'color',
  size = 22,
  className,
}: ButterflyLogoProps) {
  if (!hasButterflyLogo) return null

  const src = variant === 'grey' ? (butterflyLogoGreySrc ?? butterflyLogoSrc) : butterflyLogoSrc
  if (!src) return null

  const classes = ['butterfly-logo', className].filter(Boolean).join(' ')

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={classes}
      width={size}
      height={size}
      decoding="async"
    />
  )
}
