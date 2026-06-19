/**
 * Deterministic patient-identity extraction.
 *
 * Pulls the patient's name and date of birth from a document using explicit
 * label patterns ("Name:", "Patient:", "geb.", "Geburtsdatum:") and JSON-style
 * keys ("name", "vorname", "nachname", "geburtsdatum"). The result is NEVER
 * applied automatically — it is offered to the clinician for confirmation before
 * a patient is created, and (once confirmed) feeds the patient-name
 * de-identification step.
 *
 * No network, no AI.
 */
import type { ExtractedPatientIdentity } from '../../schemas/documentImport/envelope'
import { parseGermanDate } from './dateAssociation'

const DATE_PATTERN = String.raw`\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}`

// Labelled name: "Name: Max Mustermann", "Patient: Mustermann, Max", "Pat.: …".
const LABEL_NAME_RE =
  /(?:^|\n)[^\S\n]*(?:name|patient(?:in)?|pat\.?|patientenname)[^\S\n]*[:\-][^\S\n]*([^\n,;|]+(?:,[^\S\n]*[^\n,;|]+)?)/i
// JSON-style keys.
const JSON_NAME_RE = /"(?:patientname|name)"\s*:\s*"([^"]{2,})"/i
const JSON_VORNAME_RE = /"vorname"\s*:\s*"([^"]{1,})"/i
const JSON_NACHNAME_RE = /"nachname"\s*:\s*"([^"]{1,})"/i

// Labelled DOB: "geb. 01.02.1990", "Geburtsdatum: 1990-02-01", "DOB: …".
const LABEL_DOB_RE = new RegExp(
  String.raw`(?:geb\.?|geboren\s+am|geburtsdatum|geburtstag|date\s+of\s+birth|dob)[^\S\n]*[:\-]?[^\S\n]*(${DATE_PATTERN})`,
  'i',
)
const JSON_DOB_RE = /"(?:geburtsdatum|geburtsdatumiso|dob|birthdate)"\s*:\s*"([^"]+)"/i

/** Split a captured name string into vorname/nachname, handling "Nachname, Vorname". */
function splitName(raw: string): { vorname?: string; nachname?: string; name: string } {
  const cleaned = raw.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '')
  if (cleaned.includes(',')) {
    const [last, first] = cleaned.split(',').map((s) => s.trim())
    if (last && first) {
      return { vorname: first, nachname: last, name: `${first} ${last}` }
    }
  }
  const parts = cleaned.split(' ').filter(Boolean)
  if (parts.length === 1) return { nachname: parts[0], name: cleaned }
  const vorname = parts[0]
  const nachname = parts.slice(1).join(' ')
  return { vorname, nachname, name: cleaned }
}

function firstMatch(re: RegExp, text: string): string | undefined {
  const m = re.exec(text)
  return m ? m[1].trim() : undefined
}

/**
 * Extract a best-effort patient identity from document text. Returns null when no
 * name signal is found (so callers can fall back to manual entry).
 */
export function extractPatientIdentity(text: string): ExtractedPatientIdentity | null {
  if (!text || !text.trim()) return null

  const evidence: string[] = []
  let vorname: string | undefined
  let nachname: string | undefined
  let name: string | undefined
  let labelledName = false

  const jsonVorname = firstMatch(JSON_VORNAME_RE, text)
  const jsonNachname = firstMatch(JSON_NACHNAME_RE, text)
  if (jsonVorname || jsonNachname) {
    vorname = jsonVorname
    nachname = jsonNachname
    name = [jsonVorname, jsonNachname].filter(Boolean).join(' ') || undefined
    labelledName = true
    if (jsonVorname) evidence.push(`"vorname": "${jsonVorname}"`)
    if (jsonNachname) evidence.push(`"nachname": "${jsonNachname}"`)
  }

  if (!name) {
    const jsonName = firstMatch(JSON_NAME_RE, text)
    if (jsonName) {
      const split = splitName(jsonName)
      vorname = split.vorname
      nachname = split.nachname
      name = split.name
      labelledName = true
      evidence.push(`"name": "${jsonName}"`)
    }
  }

  if (!name) {
    const labelName = firstMatch(LABEL_NAME_RE, text)
    if (labelName) {
      const split = splitName(labelName)
      vorname = split.vorname
      nachname = split.nachname
      name = split.name
      labelledName = true
      evidence.push(labelName.trim())
    }
  }

  // DOB.
  let geburtsdatum: string | undefined
  let geburtsdatumRaw: string | undefined
  const jsonDob = firstMatch(JSON_DOB_RE, text)
  const labelDob = firstMatch(LABEL_DOB_RE, text)
  const dobRaw = jsonDob ?? labelDob
  if (dobRaw) {
    geburtsdatumRaw = dobRaw
    geburtsdatum = parseGermanDate(dobRaw) ?? undefined
    evidence.push(dobRaw)
  }

  if (!name && !geburtsdatum && !geburtsdatumRaw) return null

  const confidence: ExtractedPatientIdentity['confidence'] =
    labelledName && geburtsdatum ? 'high' : labelledName || geburtsdatum ? 'medium' : 'low'

  return {
    vorname,
    nachname,
    name,
    geburtsdatum,
    geburtsdatumRaw,
    confidence,
    evidence,
  }
}
