/**
 * Build the de-identified clinical context Butterfly sends to the LLM route.
 *
 * Butterfly only needs the Aufnahme + Verlauf free text to resolve unknown
 * criteria. We reuse the discuss-case package builder, which already strips
 * PHI client-side; the server then re-applies de-identification before the
 * model call (defense in depth). The IDENTIFIED copy never leaves the device.
 */

import type { DiscussPackageContent } from '../../types/discussCase'
import { buildDiscussionPackage } from '../discussCase/buildPackage'
import { collectClinicalPayload } from '../workspaceVault'

export function buildButterflyContextPackage(caseId: string): DiscussPackageContent {
  const payload = collectClinicalPayload(undefined, caseId)
  const { deidentified } = buildDiscussionPackage({
    caseId,
    payload,
    selectedSections: ['anamnesis', 'therapie-verlauf'],
  })
  return deidentified
}

/** True when there is enough documentation text to make an LLM call worthwhile. */
export function hasButterflyContext(pkg: DiscussPackageContent): boolean {
  return pkg.sections.some((section) => section.content.trim().length >= 40)
}
