import type { ReactElement } from 'react'
import {
  butterflyLogoGreySrc,
  butterflyLogoSilverSvg,
  butterflyLogoSrc,
  hasButterflyLogo,
} from '../data/butterflyLogo'

export type ButterflyLogoVariant = 'color' | 'grey'
/**
 * Surface tone the mark sits on. `color` (default) keeps the shipped cyan→blue→
 * purple gradient for light surfaces; `silver` renders a brighter brushed-metal
 * mark with a soft glow for DARK surfaces so it doesn't read dim.
 */
export type ButterflyLogoTone = 'color' | 'silver'

export interface ButterflyLogoProps {
  /** Full-color mark for headers/panels; grey for nav and small inline icons. */
  variant?: ButterflyLogoVariant
  /**
   * Background tone. Defaults to `color`. Pass `silver` on dark surfaces (e.g.
   * the dark case sidebar) to render the metallic, glowing variant.
   */
  tone?: ButterflyLogoTone
  /** Render width/height in CSS pixels (viewBox preserves aspect). */
  size?: number
  className?: string
  /**
   * Opt-in living "breathing" presence: the mark gently pulses (transform
   * scale) inside a soft, slowly glowing halo — a subtle sign that Butterfly is
   * alive. Default `false` so every existing static placement is unchanged
   * until it opts in. GPU-only (scale + opacity), and fully frozen under
   * `prefers-reduced-motion` / `print` via CSS. Combines with any `tone`
   * (the silver metallic ramp + breathing read great together on dark surfaces).
   * Consumers can retint the halo by setting `--bf-breathe-glow` on this element.
   */
  breathing?: boolean
  /**
   * Accessible label. Omit (default) when the mark sits beside a visible
   * "Ask Butterfly" label — it then renders decoratively (`aria-hidden`) to
   * avoid a duplicate announcement. Pass a brand string when the mark stands
   * alone and should be announced.
   */
  alt?: string
}

export function ButterflyLogo({
  variant = 'color',
  tone = 'color',
  size = 22,
  className,
  alt,
  breathing = false,
}: ButterflyLogoProps) {
  if (!hasButterflyLogo) return null

  const decorative = !alt
  // When breathing, the outer wrapper carries the caller's className (so layout
  // hooks still target the rendered box) and the mark stays clean inside it.
  const markClassName = breathing ? undefined : className

  let mark: ReactElement | null = null

  // Dark surfaces: inline the recoloured SVG so the gradient stops become a
  // bright metallic ramp; the `.butterfly-logo--silver` class adds the glow.
  if (tone === 'silver' && butterflyLogoSilverSvg) {
    const classes = ['butterfly-logo', 'butterfly-logo--silver', markClassName]
      .filter(Boolean)
      .join(' ')
    mark = (
      <span
        className={classes}
        style={{ width: size, height: size }}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
        dangerouslySetInnerHTML={{ __html: butterflyLogoSilverSvg }}
      />
    )
  } else {
    const src = variant === 'grey' ? (butterflyLogoGreySrc ?? butterflyLogoSrc) : butterflyLogoSrc
    if (!src) return null

    const classes = ['butterfly-logo', markClassName].filter(Boolean).join(' ')

    mark = (
      <img
        src={src}
        alt={alt ?? ''}
        aria-hidden={decorative || undefined}
        className={classes}
        width={size}
        height={size}
        decoding="async"
      />
    )
  }

  if (!breathing) return mark

  const wrapClasses = [
    'butterfly-logo-orb',
    tone === 'silver' ? 'butterfly-logo-orb--silver' : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={wrapClasses} style={{ width: size, height: size }}>
      {mark}
    </span>
  )
}
