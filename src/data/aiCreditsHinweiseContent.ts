/**
 * @deprecated Import from `src/data/aiCreditsHinweise` instead.
 */
export {
  aiCreditsHinweiseContentByLanguage,
  getAiCreditsHinweiseContent,
} from './aiCreditsHinweise'

import { aiCreditsHinweiseContentByLanguage } from './aiCreditsHinweise'

const en = aiCreditsHinweiseContentByLanguage.en

export const aiCreditsHinweiseMeta = en.meta
export const aiCreditsHinweiseNav = en.nav
export const aiCreditsHinweiseWarnings = en.warnings
export const aiCreditsHinweiseActionTable = en.actionTable
export const aiCreditsHinweiseCapacityTable = en.capacityTable
