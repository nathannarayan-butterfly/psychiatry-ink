import { describe, expect, it } from 'vitest'
import { ARIPIPRAZOLE_SEED, OLANZAPINE_SEED } from '../../../data/knowledgeBaseDrugSeedData'
import {
  computeCombinedReceptorFingerprint,
  computePickableReceptorTargets,
  computeSuggestedTargetReceptors,
  computeTargetedReceptors,
  computeZielrezeptorPickable,
  getAffinityPercent,
  resolveCuratedTargetReceptors,
  resolveReceptorProfiles,
  resolveZielrezeptorenBaseline,
  resolveZielrezeptorenDisplay,
  TARGET_AFFINITY_PERCENT,
} from '../receptorBurden'

describe('computeCombinedReceptorFingerprint', () => {
  it('matches the v2 KB profile for a single active drug (Aripiprazol)', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    expect(resolved).toHaveLength(1)

    const fingerprint = computeCombinedReceptorFingerprint(resolved)
    expect(fingerprint).not.toBeNull()
    expect(fingerprint!.contributorCount).toBe(1)

    const d2 = fingerprint!.targets.find((t) => t.target === 'D2')
    expect(d2?.percent).toBe(getAffinityPercent(resolved[0]!, 'D2'))

    const ht2a = fingerprint!.targets.find((t) => t.target === '5-HT2A')
    expect(ht2a?.percent).toBe(getAffinityPercent(resolved[0]!, '5-HT2A'))
    expect(ht2a?.percent).toBe(69)
  })

  it('uses the strongest affinity per receptor across multiple drugs', () => {
    const resolved = resolveReceptorProfiles(
      [
        { id: 'med-1', substance: 'Aripiprazol' },
        { id: 'med-2', substance: 'Olanzapin' },
      ],
      [ARIPIPRAZOLE_SEED, OLANZAPINE_SEED],
    )
    expect(resolved).toHaveLength(2)

    const fingerprint = computeCombinedReceptorFingerprint(resolved)
    expect(fingerprint).not.toBeNull()
    expect(fingerprint!.contributorCount).toBe(2)

    const h1Arip = getAffinityPercent(resolved[0]!, 'H1') ?? 0
    const h1Olan = getAffinityPercent(resolved[1]!, 'H1') ?? 0
    const h1Combined = fingerprint!.targets.find((t) => t.target === 'H1')
    expect(h1Combined?.percent).toBe(Math.max(h1Arip, h1Olan))
  })

  it('returns null when no KB receptor data resolves', () => {
    const fingerprint = computeCombinedReceptorFingerprint(
      resolveReceptorProfiles([{ id: 'med-1', substance: 'UnknownDrugXYZ' }], []),
    )
    expect(fingerprint).toBeNull()
  })

  it('includes all regimen receptors regardless of Zielrezeptoren curation', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const full = computeCombinedReceptorFingerprint(resolved)
    const curatedDisplay = resolveZielrezeptorenDisplay(['D2'], resolved, 'de')
    expect(full).not.toBeNull()
    expect(curatedDisplay.map((r) => r.target)).toEqual(['D2'])
    expect(full!.targets.length).toBeGreaterThan(curatedDisplay.length)
    expect(full!.targets.some((t) => t.target === '5-HT2A')).toBe(true)
  })
})

describe('resolveZielrezeptorenDisplay', () => {
  it('auto-populates moderate+ KB targets when not yet customized', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const auto = computeTargetedReceptors(resolved, 'de')
    expect(resolveZielrezeptorenDisplay(undefined, resolved, 'de').map((r) => r.target)).toEqual(
      auto.map((r) => r.target),
    )
  })

  it('shows only the persisted whitelist once customized', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const display = resolveZielrezeptorenDisplay(['D2'], resolved, 'de')
    expect(display.map((r) => r.target)).toEqual(['D2'])
  })

  it('allows an explicitly empty customized list', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    expect(resolveZielrezeptorenDisplay([], resolved, 'de')).toEqual([])
  })
})

describe('resolveZielrezeptorenBaseline', () => {
  it('derives baseline from KB when not customized', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const baseline = resolveZielrezeptorenBaseline(undefined, resolved, 'de')
    expect(baseline.length).toBeGreaterThan(0)
    expect(baseline).toContain('D2')
  })

  it('returns the persisted whitelist when customized', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    expect(resolveZielrezeptorenBaseline(['5-HT2A', 'd2'], resolved, 'de')).toEqual([
      '5-HT2A',
      'D2',
    ])
  })
})

describe('resolveCuratedTargetReceptors', () => {
  it('returns only explicitly curated targets enriched with regimen data', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const curated = resolveCuratedTargetReceptors(['D2', '5-HT2A'], resolved)
    expect(curated.map((r) => r.target)).toEqual(['D2', '5-HT2A'])
    expect(curated[0]!.maxPercent).toBeGreaterThan(0)
    expect(curated.some((r) => r.target === 'NET')).toBe(false)
  })

  it('preserves clinician order and deduplicates', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const curated = resolveCuratedTargetReceptors(['5-HT2A', 'd2', '5-HT2A'], resolved)
    expect(curated.map((r) => r.target)).toEqual(['5-HT2A', 'D2'])
  })
})

describe('computeZielrezeptorPickable', () => {
  it('lists regimen receptors not currently shown', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const pickable = computeZielrezeptorPickable(['D2'], resolved, 'de')
    expect(pickable.some((r) => r.target === 'D2')).toBe(false)
    expect(pickable.some((r) => r.target === '5-HT2A')).toBe(true)
  })

  it('lists hidden auto targets before customization', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const auto = computeTargetedReceptors(resolved, 'de')
    const hidden = auto.slice(1).map((r) => r.target)
    const pickable = computeZielrezeptorPickable(
      auto.slice(0, 1).map((r) => r.target),
      resolved,
      'de',
    )
    expect(pickable.map((r) => r.target)).toEqual(expect.arrayContaining(hidden))
  })
})

describe('computePickableReceptorTargets', () => {
  it('delegates to computeZielrezeptorPickable', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const pickable = computePickableReceptorTargets(['D2'], resolved, 'de')
    expect(pickable.some((r) => r.target === 'D2')).toBe(false)
    expect(pickable.some((r) => r.target === '5-HT2A')).toBe(true)
  })
})

describe('computeSuggestedTargetReceptors', () => {
  it('lists auto targets not currently visible in the customized whitelist', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const all = computeTargetedReceptors(resolved, 'de')
    const suggested = computeSuggestedTargetReceptors(['D2'], resolved, 'de')
    expect(suggested.some((r) => r.target === 'D2')).toBe(false)
    expect(suggested.length).toBe(all.length - 1)
  })
})

describe('computeTargetedReceptors', () => {
  it('lists receptors at or above the moderate-affinity threshold for Aripiprazol', () => {
    const resolved = resolveReceptorProfiles(
      [{ id: 'med-1', substance: 'Aripiprazol' }],
      [ARIPIPRAZOLE_SEED],
    )
    const targeted = computeTargetedReceptors(resolved, 'de')
    const d2 = targeted.find((r) => r.target === 'D2')
    expect(d2).toBeDefined()
    expect(d2!.maxPercent).toBeGreaterThanOrEqual(TARGET_AFFINITY_PERCENT)
    expect(d2!.drugs).toEqual(['Aripiprazol'])
    // Low-affinity NET should not appear as a targeted receptor.
    expect(targeted.some((r) => r.target === 'NET')).toBe(false)
  })

  it('aggregates per receptor across multiple active drugs', () => {
    const resolved = resolveReceptorProfiles(
      [
        { id: 'med-1', substance: 'Aripiprazol' },
        { id: 'med-2', substance: 'Olanzapin' },
      ],
      [ARIPIPRAZOLE_SEED, OLANZAPINE_SEED],
    )
    const targeted = computeTargetedReceptors(resolved, 'de')
    const ht2a = targeted.find((r) => r.target === '5-HT2A')
    expect(ht2a?.count).toBe(2)
    expect(ht2a?.drugs).toEqual(expect.arrayContaining(['Aripiprazol', 'Olanzapin']))
  })

  it('returns an empty list when no KB receptor data resolves', () => {
    expect(
      computeTargetedReceptors(
        resolveReceptorProfiles([{ id: 'med-1', substance: 'UnknownDrugXYZ' }], []),
        'de',
      ),
    ).toEqual([])
  })
})
