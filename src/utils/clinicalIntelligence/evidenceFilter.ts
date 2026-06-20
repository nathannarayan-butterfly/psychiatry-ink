/**
 * Clinical Intelligence — evidence sanity filter.
 *
 * CI APIs accept ONLY the compact, de-identified evidence shape — never a raw
 * clinical document, never the workspace vault payload, never an identified
 * DiscussPackage. This module is the last guard before an outbound CI call:
 * if the shape, the `isDeidentified` claim, or the size budget look wrong, the
 * run is blocked here so we never accidentally leak PHI to an LLM provider.
 *
 * The server enforces the same checks again as defense-in-depth.
 */

import type { CompactEvidencePayload } from '../../types/clinicalIntelligence'
import {
  CompactEvidencePayloadSchema,
  hasUsableCompactEvidence,
} from '../../types/clinicalIntelligence'

const ITEM_MAX_BYTES = 15_000
const TOTAL_MAX_BYTES = 60_000

/**
 * Field names that, if present at the top level of an evidence payload, strongly
 * suggest the caller passed a raw document shape (workspace doc, identified
 * package, etc.) rather than the compact evidence we expect.
 */
const FORBIDDEN_TOP_LEVEL_FIELDS = [
  'documents',
  'documentTypeId',
  'editorContent',
  'sectionContents',
  'patientMetadata',
  'identifiedPackageContent',
  'medicationPlanState',
  'pageHeading',
]

export class CompactEvidenceFilterError extends Error {
  readonly code:
    | 'invalid_shape'
    | 'raw_document_shape'
    | 'not_deidentified'
    | 'over_budget'
    | 'empty'
  constructor(code: CompactEvidenceFilterError['code'], message: string) {
    super(message)
    this.code = code
    this.name = 'CompactEvidenceFilterError'
  }
}

export interface AssertCompactEvidenceOptions {
  /** When true, an empty payload is allowed (returns successfully). */
  allowEmpty?: boolean
}

/**
 * Assert that `value` is a well-formed, de-identified, size-bounded compact
 * evidence payload. Throws a `CompactEvidenceFilterError` on any violation —
 * never logs the payload (it may still contain redacted text we don't want in
 * the console / logs).
 */
export function assertCompactEvidenceOnly(
  value: unknown,
  options: AssertCompactEvidenceOptions = {},
): CompactEvidencePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CompactEvidenceFilterError(
      'invalid_shape',
      'Clinical Intelligence requires a compact evidence object — received a different shape.',
    )
  }

  for (const forbidden of FORBIDDEN_TOP_LEVEL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, forbidden)) {
      throw new CompactEvidenceFilterError(
        'raw_document_shape',
        `Clinical Intelligence refuses raw document shape (field "${forbidden}" present). Only compact, de-identified evidence is allowed.`,
      )
    }
  }

  const parsed = CompactEvidencePayloadSchema.safeParse(value)
  if (!parsed.success) {
    throw new CompactEvidenceFilterError(
      'invalid_shape',
      'Clinical Intelligence evidence payload failed schema validation.',
    )
  }

  if (parsed.data.isDeidentified !== true) {
    throw new CompactEvidenceFilterError(
      'not_deidentified',
      'Clinical Intelligence refuses payloads not flagged isDeidentified=true.',
    )
  }

  let totalBytes = 0
  for (const item of parsed.data.items) {
    const len = item.text.length
    if (len > ITEM_MAX_BYTES) {
      throw new CompactEvidenceFilterError(
        'over_budget',
        `Clinical Intelligence evidence item "${item.id}" exceeds per-item budget (${ITEM_MAX_BYTES} chars).`,
      )
    }
    totalBytes += len
  }
  if (totalBytes > TOTAL_MAX_BYTES) {
    throw new CompactEvidenceFilterError(
      'over_budget',
      `Clinical Intelligence evidence exceeds total budget (${TOTAL_MAX_BYTES} chars).`,
    )
  }

  if (!options.allowEmpty && !hasUsableCompactEvidence(parsed.data)) {
    throw new CompactEvidenceFilterError(
      'empty',
      'Clinical Intelligence evidence base is empty or below the minimum usable threshold.',
    )
  }

  return parsed.data
}

/** Non-throwing variant — returns null when the payload should be rejected. */
export function safeAssertCompactEvidence(
  value: unknown,
): { ok: true; data: CompactEvidencePayload } | { ok: false; error: CompactEvidenceFilterError } {
  try {
    return { ok: true, data: assertCompactEvidenceOnly(value) }
  } catch (error) {
    if (error instanceof CompactEvidenceFilterError) {
      return { ok: false, error }
    }
    return {
      ok: false,
      error: new CompactEvidenceFilterError('invalid_shape', String((error as Error)?.message ?? error)),
    }
  }
}
