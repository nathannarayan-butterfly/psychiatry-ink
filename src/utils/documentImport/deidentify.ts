/**
 * Deterministic PHI de-identification for the (optional, flag-gated) AI mapping
 * path. NO uploaded content is ever sent to AI by default; when the clinician
 * explicitly enables AI mapping, text passes through `deidentifyText` first so
 * that names, dates, contact details and ids are masked before leaving the
 * device.
 *
 * This is a best-effort scrubber, not a guarantee — it is layered on top of the
 * primary safeguard that AI is off by default and AI output never auto-commits.
 */

export interface DeidentifyOptions {
  /** Known patient name tokens to mask (from case metadata, when available). */
  patientNames?: string[]
}

export interface DeidentifyResult {
  text: string
  /** Count of redactions per category — surfaced so the clinician can audit. */
  redactions: Record<string, number>
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
// German + international phone-ish sequences.
const PHONE_RE = /(?:\+?\d[\d ()/-]{6,}\d)/g
// Date of birth ONLY: a date immediately preceded by a DOB label
// ("geb. 01.02.1990", "geboren am 1.2.90", "DOB 1990-02-01"). Standalone
// clinical dates are intentionally NOT redacted (#13) — a bare date is not
// identifying on its own and is clinically important, so it is preserved.
const DOB_DATE_RE =
  /\b(geb\.?|geboren(?:\s+am)?|geburtsdatum|date of birth|dob)(\s*:?\s*)(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/gi
// Standalone numeric dates (kept, not redacted — used only to shield them from
// the phone / id scrubbers).
const STANDALONE_DATE_RE = /\b(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g
// German insurance / case numbers (long digit runs).
const LONG_NUMBER_RE = /\b\d{6,}\b/g
// "geb. 01.02.1990" / "geboren am" — masks explicit DOB label words.
const DOB_LABEL_RE = /\b(geb\.?|geboren am|date of birth|dob)\b/gi

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ---------------------------------------------------------------------------
// Patient-name-only de-identification (deterministic, runs DURING extraction)
// ---------------------------------------------------------------------------

/**
 * Clinician titles that, when they directly precede a name token, mark it as a
 * DOCTOR/clinician name. Such occurrences are never redacted — only the
 * patient's own name is replaced.
 */
const DOCTOR_TITLE_BEFORE_RE =
  /(?:dr\.?(?:\s*med\.?)?|prof\.?(?:\s*dr\.?)?|priv\.-doz\.?|pd\.?|dipl\.?-?\s*psych\.?|ober[äa]rzt(?:in)?|chef[äa]rzt(?:in)?|oa|oä|ca|facharzt|fachärztin|therapeut(?:in)?|behandler(?:in)?)\s*$/i

export interface PatientNameDeidOptions {
  vorname?: string
  nachname?: string
  /** Full name as written, if known. */
  fullName?: string
  /** Replacement token. Defaults to "[Patient]". */
  token?: string
}

export interface PatientNameDeidResult {
  text: string
  /** Number of patient-name occurrences replaced. */
  redactions: number
  /** Number of occurrences skipped because they were preceded by a doctor title. */
  preservedDoctorMatches: number
}

/** Build the de-dup list of name strings to redact, longest first. */
function patientNameVariants(options: PatientNameDeidOptions): string[] {
  const variants = new Set<string>()
  const add = (value?: string) => {
    const v = value?.trim()
    if (v && v.length >= 2) variants.add(v)
  }
  add(options.fullName)
  if (options.vorname && options.nachname) {
    add(`${options.vorname.trim()} ${options.nachname.trim()}`)
    add(`${options.nachname.trim()}, ${options.vorname.trim()}`)
  }
  add(options.nachname)
  add(options.vorname)
  return [...variants].sort((a, b) => b.length - a.length)
}

/**
 * Replace ONLY the known patient's name with a neutral token, leaving doctor /
 * clinician names intact (a name immediately preceded by a clinical title such
 * as "Dr." is preserved). Deterministic; runs before any DB write.
 */
export function redactPatientName(
  input: string,
  options: PatientNameDeidOptions,
): PatientNameDeidResult {
  const token = options.token ?? '[Patient]'
  const variants = patientNameVariants(options)
  let text = input
  let redactions = 0
  let preservedDoctorMatches = 0

  for (const variant of variants) {
    const re = new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'gi')
    text = text.replace(re, (match, offset: number, full: string) => {
      const before = full.slice(Math.max(0, offset - 24), offset)
      if (DOCTOR_TITLE_BEFORE_RE.test(before)) {
        preservedDoctorMatches += 1
        return match
      }
      redactions += 1
      return token
    })
  }

  return { text, redactions, preservedDoctorMatches }
}

export function deidentifyText(input: string, options: DeidentifyOptions = {}): DeidentifyResult {
  const redactions: Record<string, number> = {}
  let text = input

  const apply = (re: RegExp, token: string, label: string) => {
    text = text.replace(re, () => {
      redactions[label] = (redactions[label] ?? 0) + 1
      return token
    })
  }

  // Patient names first (longest first to avoid partial overlaps).
  const names = (options.patientNames ?? [])
    .flatMap((n) => n.split(/\s+/))
    .map((n) => n.trim())
    .filter((n) => n.length >= 2)
    .sort((a, b) => b.length - a.length)
  for (const name of names) {
    apply(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'), '[NAME]', 'name')
  }

  apply(EMAIL_RE, '[EMAIL]', 'email')

  // Redact the date ONLY when it sits in an explicit date-of-birth context; the
  // DOB label words are masked separately below. Standalone dates are kept (#13).
  text = text.replace(DOB_DATE_RE, (_match, label: string, sep: string) => {
    redactions.date = (redactions.date ?? 0) + 1
    return `${label}${sep}[DATE]`
  })

  // Protect the remaining standalone dates with a sentinel so the phone / id
  // patterns below cannot mistake an ISO ("2024-03-12") or slash ("12/03/2024")
  // date for a contact number. They are restored verbatim at the end (#13).
  const preservedDates: string[] = []
  text = text.replace(STANDALONE_DATE_RE, (match) => {
    preservedDates.push(match)
    return `\u0000DATE${preservedDates.length - 1}\u0000`
  })

  apply(PHONE_RE, '[CONTACT]', 'phone')
  apply(LONG_NUMBER_RE, '[ID]', 'id')
  apply(DOB_LABEL_RE, '[DOB]', 'dob')

  text = text.replace(/\u0000DATE(\d+)\u0000/g, (_match, index: string) => preservedDates[Number(index)])

  return { text, redactions }
}
