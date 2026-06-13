/**
 * Extended psychiatric drug seed (entries 151–195) — supplements the core ~150 list.
 * Use {@link getCombinedSeedList} to merge with core without duplicate generic names.
 */
import { normalizeGenericName } from '../../utils/kb/normalizeGenericName'
import {
  PSYCHIATRIC_DRUG_SEED_LIST,
  type PsychiatricDrugCategory,
  type PsychiatricDrugSeedEntry,
} from './psychiatric-drug-seed-list'

function entry(
  genericName: string,
  category: PsychiatricDrugCategory,
  normalizedName?: string,
): PsychiatricDrugSeedEntry {
  return normalizedName ? { genericName, category, normalizedName } : { genericName, category }
}

export const PSYCHIATRIC_DRUG_SEED_LIST_EXTENDED: PsychiatricDrugSeedEntry[] = [
  // ── New / modern psychiatry-relevant (151–154) ────────────────────────────
  entry('Xanomeline/trospium', 'Antipsychotics', 'xanomeline trospium'),
  entry('Dexmedetomidine sublingual film', 'Anxiolytics/hypnotics', 'dexmedetomidine'),
  entry('Viloxazine', 'ADHD'),
  entry('Lofexidine', 'Addiction'),

  // ── Additional antipsychotics / neuroleptics (155–167) ───────────────────
  ...[
    'Bromperidol',
    'Chlorprothixene',
    'Prothipendyl',
    'Fluspirilene',
    'Penfluridol',
    'Thioridazine',
    'Molindone',
    'Thiothixene',
    'Clotiapine',
    'Cyamemazine',
    'Periciazine',
    'Prochlorperazine',
    'Alimemazine / Trimeprazine',
  ].map((name) =>
    name === 'Alimemazine / Trimeprazine'
      ? entry(name, 'Antipsychotics', 'trimeprazine')
      : entry(name, 'Antipsychotics'),
  ),

  // ── Additional antidepressants, mostly older or regional (168–174) ─────────
  ...[
    'Protriptyline',
    'Dibenzepin',
    'Melitracen',
    'Butriptyline',
    'Quinupramine',
    'Iprindole',
    'Imipramine oxide',
  ].map((name) => entry(name, 'Antidepressants')),

  // ── Additional hypnotics / sedatives / withdrawal-related (175–182) ──────
  ...[
    'Clomethiazole',
    'Flunitrazepam',
    'Estazolam',
    'Quazepam',
    'Doxylamine',
    'Diphenhydramine',
    'Chloral hydrate',
    'Meprobamate',
  ].map((name) => entry(name, 'Anxiolytics/hypnotics')),

  // ── Narcolepsy / wakefulness (183–184) ───────────────────────────────────
  entry('Pitolisant', 'ADHD'),
  entry('Solriamfetol', 'ADHD'),

  // ── Addiction psychiatry adjuncts (185–187) ────────────────────────────────
  entry('Naloxone', 'Addiction'),
  entry('Nicotine replacement / Nicotine', 'Addiction', 'nicotine'),
  entry('Baclofen', 'Addiction'),

  // ── PTSD / augmentation / adverse-effect management (188–191) ─────────────
  entry('Prazosin', 'Anxiolytics/hypnotics'),
  entry('Amantadine', 'EPS management'),
  entry('Cyproheptadine', 'EPS management'),
  entry('Liothyronine', 'Antidepressants'),

  // ── Anti-dementia / neurocognitive (192–195) ───────────────────────────────
  entry('Tacrine', 'Anti-dementia'),
  entry('Aducanumab', 'Additional'),
  entry('Lecanemab', 'Additional'),
  entry('Donanemab', 'Additional'),
]

function seedKey(entry: PsychiatricDrugSeedEntry): string {
  return entry.normalizedName ?? normalizeGenericName(entry.genericName)
}

/** Merge core + extended lists; core entries win when normalized names collide. */
export function getCombinedSeedList(): PsychiatricDrugSeedEntry[] {
  const seen = new Set<string>()
  const merged: PsychiatricDrugSeedEntry[] = []

  for (const item of PSYCHIATRIC_DRUG_SEED_LIST) {
    const key = seedKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  for (const item of PSYCHIATRIC_DRUG_SEED_LIST_EXTENDED) {
    const key = seedKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged
}

export const ALL_PSYCHIATRIC_DRUG_SEEDS = getCombinedSeedList()
