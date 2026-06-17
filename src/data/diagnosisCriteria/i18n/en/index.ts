import type { DisorderTranslationMap } from '../types'
import { enF0 } from './f0'
import { enF1 } from './f1'
import { enF2 } from './f2'
import { enF3 } from './f3'
import { enF4 } from './f4'
import { enF5 } from './f5'
import { enF6 } from './f6'
import { enF7 } from './f7'
import { enF8 } from './f8'
import { enF9 } from './f9'

/** Full EN translation map (merged ICD-10 block modules). */
export const en: DisorderTranslationMap = {
  ...enF0,
  ...enF1,
  ...enF2,
  ...enF3,
  ...enF4,
  ...enF5,
  ...enF6,
  ...enF7,
  ...enF8,
  ...enF9,
}
