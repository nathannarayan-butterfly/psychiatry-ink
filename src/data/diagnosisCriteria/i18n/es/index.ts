import type { DisorderTranslationMap } from '../types'
import { esF0 } from './f0'
import { esF1 } from './f1'
import { esF2 } from './f2'
import { esF3 } from './f3'
import { esF4 } from './f4'
import { esF5 } from './f5'
import { esF6 } from './f6'
import { esF7 } from './f7'
import { esF8 } from './f8'
import { esF9 } from './f9'

/** Full ES translation map (merged ICD-10 block modules). */
export const es: DisorderTranslationMap = {
  ...esF0,
  ...esF1,
  ...esF2,
  ...esF3,
  ...esF4,
  ...esF5,
  ...esF6,
  ...esF7,
  ...esF8,
  ...esF9,
}
