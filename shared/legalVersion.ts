/**
 * Single source of truth for the legal-document version string.
 *
 * Lives in `shared/` (compiled by both the client `tsconfig.app.json` and the
 * server `tsconfig.server.json`) so the signup-consent recording on the server
 * and the public legal pages on the client agree on exactly one version token.
 *
 * Bump this whenever the substance of the Datenschutz/AGB copy changes — the
 * value is stored verbatim as `privacy_version` / `terms_version` on every
 * recorded acceptance, so a bump re-prompts users for fresh consent.
 */
export const LEGAL_LAST_UPDATED = '2026-06-27'
