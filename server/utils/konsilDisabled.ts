/**
 * Konsil document-sharing feature flag.
 *
 * Konsil (`ks_consultation_requests`, `ks_shared_items`, `ks_messages`,
 * `ks_invites`, `ks_reports`, `ks_participants`, `ks_audit_logs`) was disabled
 * as part of the Design D rollout because clients that selected
 * `patient_identifier_mode = 'full'` would otherwise write plaintext patient
 * names server-side — a structural conflict with the new identifier-vault
 * concept (audit 2026-06-30).
 *
 * What changed:
 *   - Every Konsil route that CREATES or MUTATES content responds with
 *     `410 Gone` + a JSON `code: 'konsil_disabled'`.
 *   - GET / read routes still return existing rows so previously shared
 *     consultations remain accessible (clinicians need to be able to read
 *     their own historical reports). Reads do NOT leak new data.
 *
 * Re-enable plan — when the invite-link E2EE Konsil flow is built:
 *   1. Remove this guard from the server routes and the
 *      `KonsilDisabledBanner` from the UI surfaces.
 *   2. Add a per-request AES-GCM envelope to `ks_consultation_requests`
 *      delivered via the invite link fragment (`src/utils/e2ee.ts` pattern,
 *      already used by DiscussCase identified packages).
 *   3. Reject server-side any `patient_identifier_mode = 'full'` request whose
 *      `ks_shared_items.content` is plaintext (mirror the new
 *      `requireDiscussIdentifiedE2EE` server validation).
 *
 * Set `ENABLE_KONSIL_SHARING=true` in `.env.local` to bypass the disable for
 * local development against legacy test data (NOT a production toggle).
 */
export const KONSIL_DISABLED_CODE = 'konsil_disabled'

export const KONSIL_DISABLED_MESSAGE_DE =
  'Konsil-Versand ist vorübergehend deaktiviert. Bestehende Konsile bleiben lesbar; neue Anfragen werden derzeit nicht angenommen.'

export const KONSIL_DISABLED_MESSAGE_EN =
  'Konsil sharing is temporarily disabled. Existing consultations remain readable; new requests are not accepted right now.'

export function isKonsilSharingEnabled(): boolean {
  return process.env.ENABLE_KONSIL_SHARING === 'true'
}
