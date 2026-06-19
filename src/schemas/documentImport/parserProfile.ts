/**
 * Per-user **ParserProfile** — a PHI-safe, structure-only augmentation layer for
 * the deterministic Document Import parser.
 *
 * A clinician can teach the parser how THEIR clinic's documents are laid out:
 *   - heading aliases   ("Tagesdoku" → Verlauf, "PPB" → Psychopathologischer Befund)
 *   - date placement    (dates live in the left column / right column / heading / …)
 *   - column mappings    (a CSV/XLSX header → a clinical module + field)
 *
 * The profile is applied ABOVE the base parser as a detection bias only (see
 * `utils/documentImport/parserProfile.ts`). It never bypasses the clinician
 * review/accept gate or the provenance ledger.
 *
 * PHI SAFETY: a ParserProfile stores ONLY structure and labels — heading text,
 * column-header text, module/field/section identifiers and a layout hint. It must
 * NEVER contain raw patient narrative. Sample documents used to derive a profile
 * are processed transiently and de-identified; only the structural labels are kept
 * (enforced here by length caps + the `sanitizeProfileLabel` helper used at the
 * capture boundary).
 */
import { z } from 'zod'
import { CandidateModuleSchema } from './envelope'
import { DATE_LOCATION_HINTS } from '../../utils/documentImport/dateAssociation'
import { TABULAR_FIELDS } from '../../utils/documentImport/tabular'

/** Schema version — bump when the stored shape changes incompatibly. */
export const PARSER_PROFILE_VERSION = 1

/** Where a clinic records course-entry dates (mirrors `DateLocationHint`). */
export const DateLocationHintSchema = z.enum(DATE_LOCATION_HINTS)

/** Tabular target field (mirrors `TabularField`). */
export const TabularFieldSchema = z.enum(TABULAR_FIELDS)

/**
 * A short structural label. Capped to keep accidental narrative out of storage
 * and trimmed of surrounding whitespace. This is a heading/column LABEL, never a
 * clinical sentence.
 */
const ProfileLabel = z.string().trim().min(1).max(120)

/** A per-user heading override: a label the clinic uses → a clinical module. */
export const HeadingAliasSchema = z.object({
  /** Heading label as it appears in the clinic's documents (e.g. "Tagesdoku"). */
  alias: ProfileLabel,
  /** Clinical module this heading should map to. */
  module: CandidateModuleSchema,
  /** Optional anamnese section id (only meaningful when `module === 'anamnese'`). */
  sectionId: z.string().trim().max(120).optional(),
})
export type HeadingAlias = z.infer<typeof HeadingAliasSchema>

/** A per-user table-column override: a header label → a module + field. */
export const TabularColumnAliasSchema = z.object({
  /** Column header label as it appears in the clinic's spreadsheets/CSVs. */
  header: ProfileLabel,
  module: CandidateModuleSchema,
  field: TabularFieldSchema,
})
export type TabularColumnAlias = z.infer<typeof TabularColumnAliasSchema>

/**
 * The full per-user parser profile. All correction lists default to empty and the
 * date hint defaults to `auto`, so an unconfigured profile is a no-op and the base
 * parser behaves exactly as before.
 */
export const ParserProfileSchema = z.object({
  version: z.literal(PARSER_PROFILE_VERSION).default(PARSER_PROFILE_VERSION),
  headingAliases: z.array(HeadingAliasSchema).max(500).default([]),
  dateLocation: DateLocationHintSchema.default('auto'),
  columnAliases: z.array(TabularColumnAliasSchema).max(500).default([]),
  /** ISO timestamp of the last save (set by the persistence layer). */
  updatedAt: z.string().optional(),
})
export type ParserProfile = z.infer<typeof ParserProfileSchema>

/** A pristine, no-op profile. */
export const EMPTY_PARSER_PROFILE: ParserProfile = {
  version: PARSER_PROFILE_VERSION,
  headingAliases: [],
  dateLocation: 'auto',
  columnAliases: [],
}

/** True when the profile adds nothing over the base parser. */
export function isParserProfileEmpty(profile: ParserProfile | null | undefined): boolean {
  if (!profile) return true
  return (
    profile.headingAliases.length === 0 &&
    profile.columnAliases.length === 0 &&
    profile.dateLocation === 'auto'
  )
}

/** Parse/validate an unknown value into a ParserProfile (throws on drift). */
export function parseParserProfile(value: unknown): ParserProfile {
  return ParserProfileSchema.parse(value)
}

/** Non-throwing variant for storage boundaries. */
export function safeParseParserProfile(value: unknown) {
  return ParserProfileSchema.safeParse(value)
}
