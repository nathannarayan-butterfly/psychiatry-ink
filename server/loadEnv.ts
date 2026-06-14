/**
 * Load .env / .env.local before any other server module reads process.env.
 * Import this module first in server/index.ts (side effect only).
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

dotenv.config({ path: path.join(projectRoot, '.env') })
dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true })

/**
 * Security-relevant flags read from the loaded environment (never printed):
 *
 * - ENABLE_DEV_AUTH_BYPASS: when "true" AND NODE_ENV === "development", AI/LLM
 *   routes accept the legacy `default` account without a real session. Defaults
 *   to false (disabled) in every other environment so paid AI endpoints cannot
 *   be reached anonymously. Consumed by
 *   `server/utils/requireAuthenticatedUserOrDevBypass.ts`.
 */
