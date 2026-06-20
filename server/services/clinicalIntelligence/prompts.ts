/**
 * Clinical Intelligence — server-side prompts.
 *
 * V1 prompts are identical client/server so the development diagnostics panel
 * shows the model exactly what we will send. We import from the bundled
 * client-shared prompt module to avoid drift.
 */

export {
  buildDimensionalSystemPrompt,
  buildDimensionalUserPrompt,
  buildMechanismSystemPrompt,
  buildMechanismUserPrompt,
  formatCompactEvidenceForPrompt,
  type DimensionalPromptInput,
  type MechanismPromptInput,
} from '../../../src/data/clinicalIntelligence/prompts'
