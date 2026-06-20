import type { Disorder } from '../schema'
import { MERGED_ICD11_TREES } from './trees'

/** Attach Phase-C merged native ICD-11 trees where available. */
export function attachMergedIcd11Trees(disorders: Disorder[]): Disorder[] {
  return disorders.map((disorder) => {
    const icd11 = MERGED_ICD11_TREES[disorder.id]
    return icd11 ? { ...disorder, icd11 } : disorder
  })
}
