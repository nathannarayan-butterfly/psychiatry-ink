/**
 * ParserProfile application layer.
 *
 * Turns a per-user {@link ParserProfile} (see `schemas/documentImport/parserProfile.ts`)
 * into the option objects the base parser already accepts:
 *   - {@link SectionizeOptions} (heading aliases + date-location bias) for the
 *     DOCX/TXT sectionizer.
 *   - {@link AutoDetectOptions} (column aliases) for the CSV/XLSX auto-mapper.
 *
 * The profile is a DETECTION BIAS only — it extends/overrides the base dictionary
 * and pre-fills the auto-mapping. It does NOT bypass the clinician review/accept
 * gate or the provenance ledger, and it changes nothing for users without a
 * profile (an empty/auto profile yields empty options → identical base behaviour).
 *
 * PHI SAFETY: `sanitizeProfileLabel` de-identifies a label captured from a sample
 * document so that no patient narrative (names, dates, ids, contacts) is ever
 * persisted into a profile. Only structural labels + hints are stored.
 */
import type { ParserProfile } from '../../schemas/documentImport/parserProfile'
import type { SectionizeOptions } from './sectionize'
import type { AutoDetectOptions } from './tabular'
import { deidentifyText } from './deidentify'

export interface ProfileParseOptions {
  /** Options for the DOCX/TXT sectionizer. */
  sectionize: SectionizeOptions
  /** Options for the CSV/XLSX auto-mapper. */
  autoDetect: AutoDetectOptions
}

const EMPTY_OPTIONS: ProfileParseOptions = { sectionize: {}, autoDetect: {} }

/**
 * Map a profile to base-parser options. Returns empty options (no-op) when the
 * profile is absent so the base parser is untouched for unconfigured users.
 */
export function profileToParseOptions(profile?: ParserProfile | null): ProfileParseOptions {
  if (!profile) return EMPTY_OPTIONS
  const hasSectionize =
    profile.headingAliases.length > 0 || (profile.dateLocation && profile.dateLocation !== 'auto')
  const sectionize: SectionizeOptions = hasSectionize
    ? {
        headingAliases: profile.headingAliases.length > 0 ? profile.headingAliases : undefined,
        dateLocation: profile.dateLocation !== 'auto' ? profile.dateLocation : undefined,
      }
    : {}
  const autoDetect: AutoDetectOptions =
    profile.columnAliases.length > 0 ? { columnAliases: profile.columnAliases } : {}
  return { sectionize, autoDetect }
}

/**
 * De-identify + trim a label captured from a sample document before it is stored
 * in a profile. Strips names/dates/ids/contacts (best-effort) and caps length so
 * accidental narrative cannot leak into persistence.
 */
export function sanitizeProfileLabel(raw: string): string {
  const deidentified = deidentifyText(raw).text
  return deidentified.replace(/\s+/g, ' ').trim().slice(0, 120)
}
