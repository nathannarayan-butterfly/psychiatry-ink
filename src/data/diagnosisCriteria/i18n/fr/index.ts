import type { DisorderTranslationMap } from '../types'
import { frF0 } from './f0'
import { frF1 } from './f1'
import { frF2 } from './f2'
import { frF3 } from './f3'
import { frF4 } from './f4'
import { frF5 } from './f5'
import { frF6 } from './f6'
import { frF7 } from './f7'
import { frF8 } from './f8'
import { frF9 } from './f9'

/** Full FR translation map (merged ICD-10 block modules). */
export const fr: DisorderTranslationMap = {
  ...frF0,
  ...frF1,
  ...frF2,
  ...frF3,
  ...frF4,
  ...frF5,
  ...frF6,
  ...frF7,
  ...frF8,
  ...frF9,
}
