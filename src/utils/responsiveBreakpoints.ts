/**
 * Global responsive breakpoint scheme for Psychiatry.Ink.
 *
 * Psychiatry.Ink is a clinical documentation tool whose dense, multi-panel
 * layouts (left case rail + main content + right tool dock) need real screen
 * real estate. We therefore support three device classes:
 *
 *   • PHONE   — shortest viewport edge < {@link PHONE_BREAKPOINT_PX}px.
 *               The dense clinical layout is not usable here, so the app shows a
 *               full-screen, localized "please use a tablet or desktop" gate
 *               (with a "continue anyway" escape hatch — never a hard lock-out).
 *   • TABLET  — not a phone AND viewport width ≤ {@link TABLET_BREAKPOINT_PX}px.
 *               Fully responsive: dashboard/patient grids reflow to 1–2 columns,
 *               the left case rail collapses/overlays, and the floating tool
 *               docks become bottom sheets instead of a fixed right gutter.
 *   • DESKTOP — viewport width > {@link TABLET_BREAKPOINT_PX}px. Unchanged,
 *               full multi-column layout.
 *
 * WHY shortest-edge ("min-dimension") logic for the phone gate, not raw width:
 * a phone held in LANDSCAPE can report a width well above 768px (e.g. an iPhone
 * 15 Pro Max is 932×430), yet it is still a phone and still unusable for dense
 * clinical work. Gating on `min(width, height)` keeps such phones gated in BOTH
 * orientations while ensuring a real tablet — whose shortest edge is ≥ 768px —
 * is treated as a tablet in BOTH orientations. Concretely, an iPad in PORTRAIT
 * (iPad/iPad Air/iPad Pro 11" report a 768–834px width) has a shortest edge of
 * 768–834px, so it is NEVER gated; it gets the responsive tablet layout.
 *
 * Threshold rationale (avoids gating common tablets): the largest modern phones
 * have a shortest edge ≈ 430–480px, while common tablets start at 768px (iPad,
 * iPad mini 5/4), 810–834px (iPad 10th gen, iPad Air, iPad Pro 11"), and 800px+
 * (typical Android tablets). A 768px shortest-edge cut cleanly separates the two
 * classes: every common phone is gated, every common tablet is admitted.
 */

/** Below this shortest-viewport-edge (px) a device is treated as a PHONE → gated. */
export const PHONE_BREAKPOINT_PX = 768

/** At/below this viewport WIDTH (px), a non-phone device uses the TABLET layout. */
export const TABLET_BREAKPOINT_PX = 1024

export type DeviceClass = 'phone' | 'tablet' | 'desktop'

/**
 * True when the viewport's shortest edge is below the phone breakpoint, i.e. the
 * device should see the phone gate. Uses the SHORTEST edge so a phone in
 * landscape stays gated and a tablet in portrait does not.
 */
export function isPhoneViewport(width: number, height: number): boolean {
  const shortestEdge = Math.min(width, height)
  return shortestEdge < PHONE_BREAKPOINT_PX
}

/** Classify a viewport into one of the three device classes. */
export function classifyViewport(width: number, height: number): DeviceClass {
  if (isPhoneViewport(width, height)) return 'phone'
  if (width <= TABLET_BREAKPOINT_PX) return 'tablet'
  return 'desktop'
}
