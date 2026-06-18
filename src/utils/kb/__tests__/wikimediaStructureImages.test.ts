import { describe, expect, it } from 'vitest'
import {
  countMappedStructureImageFiles,
  countMappedStructureImageKeys,
  getStructureImageAttribution,
} from '../wikimediaStructureImages'

describe('wikimediaStructureImages', () => {
  it('maps German and English INN names for seeded antipsychotics', () => {
    expect(getStructureImageAttribution('Aripiprazol')?.fileName).toMatch(/aripiprazole/i)
    expect(getStructureImageAttribution('Haloperidol')?.commonsFileUrl).toContain('commons.wikimedia.org')
    expect(getStructureImageAttribution('Risperidon')?.fileName).toMatch(/risperidone/i)
  })

  it('returns null for unmapped substances', () => {
    expect(getStructureImageAttribution('Totally Unknown Drug XYZ')).toBeNull()
  })

  it('covers the psychopharmacology seed catalog (minus mAbs without 2D structures)', () => {
    expect(countMappedStructureImageFiles()).toBeGreaterThanOrEqual(180)
    expect(countMappedStructureImageKeys()).toBeGreaterThan(countMappedStructureImageFiles())
  })
})
