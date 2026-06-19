import { describe, expect, it } from 'vitest'
import {
  parseTherapyPlanningSubsectionId,
  THERAPY_PLANNING_SECTIONS,
  THERAPY_PAGE_SECTIONS,
  therapyPlanningSubsectionId,
} from '../therapyPageSections'

describe('therapyPageSections planning helpers', () => {
  it('excludes journal notes from planning sections', () => {
    const keys = THERAPY_PLANNING_SECTIONS.map((section) => section.key)
    expect(keys).not.toContain('notizen')
    expect(keys).toEqual(
      THERAPY_PAGE_SECTIONS.filter((section) => section.key !== 'notizen').map(
        (section) => section.key,
      ),
    )
  })

  it('round-trips workspace subsection ids', () => {
    for (const section of THERAPY_PLANNING_SECTIONS) {
      const id = therapyPlanningSubsectionId(section.key)
      expect(parseTherapyPlanningSubsectionId(id)).toBe(section.key)
    }
    expect(parseTherapyPlanningSubsectionId('aufnahme-anamnese')).toBeNull()
  })
})
