import { describe, expect, it } from 'vitest'
import {
  countMappedStructureImageFiles,
  countMappedStructureImageKeys,
  getStructureImageAttribution,
  rescaleCommonsThumbUrl,
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

  it('returns Commons pre-rendered thumb URLs from bundled data (no invalid upscaling)', () => {
    const attr = getStructureImageAttribution('Haloperidol')
    expect(attr?.thumbUrl).toMatch(/\/120px-/)
    expect(attr?.detailThumbUrl).toMatch(/\/500px-/)
  })

  it('rescales Commons thumb path segments', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Haloperidol2DACS.svg/120px-Haloperidol2DACS.svg.png'
    expect(rescaleCommonsThumbUrl(url, 320)).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Haloperidol2DACS.svg/320px-Haloperidol2DACS.svg.png',
    )
  })

  it('covers the psychopharmacology seed catalog (minus mAbs without 2D structures)', () => {
    expect(countMappedStructureImageFiles()).toBeGreaterThanOrEqual(180)
    expect(countMappedStructureImageKeys()).toBeGreaterThan(countMappedStructureImageFiles())
  })
})
