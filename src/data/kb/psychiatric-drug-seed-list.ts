/**
 * ~150 psychiatric drugs for normalized KB seeding.
 * Organized by clinical category for batch enrichment.
 */
export type PsychiatricDrugCategory =
  | 'Antipsychotics'
  | 'Antidepressants'
  | 'Mood stabilizers'
  | 'Anxiolytics/hypnotics'
  | 'ADHD'
  | 'Anti-dementia'
  | 'Addiction'
  | 'EPS management'
  | 'Additional'

export interface PsychiatricDrugSeedEntry {
  genericName: string
  category: PsychiatricDrugCategory
  normalizedName?: string
}

function entry(
  genericName: string,
  category: PsychiatricDrugCategory,
  normalizedName?: string,
): PsychiatricDrugSeedEntry {
  return normalizedName ? { genericName, category, normalizedName } : { genericName, category }
}

export const PSYCHIATRIC_DRUG_SEED_LIST: PsychiatricDrugSeedEntry[] = [
  // ── Antipsychotics (typical + atypical) ───────────────────────────────────
  ...[
    'Haloperidol', 'Chlorpromazine', 'Perphenazine', 'Fluphenazine', 'Thioridazine',
    'Pimozide', 'Trifluoperazine', 'Flupentixol', 'Zuclopenthixol', 'Levomepromazine',
    'Promazine', 'Loxapine', 'Sulpiride', 'Tiapride', 'Melperone', 'Pipamperone',
    'Cyamemazine', 'Prochlorperazine', 'Triflupromazine', 'Mesoridazine', 'Penfluridol',
    'Droperidol', 'Thiothixene', 'Molindone', 'Pipotiazine',
    'Olanzapine', 'Risperidone', 'Quetiapine', 'Aripiprazole', 'Ziprasidone', 'Clozapine',
    'Paliperidone', 'Amisulpride', 'Asenapine', 'Lurasidone', 'Cariprazine', 'Brexpiprazole',
    'Iloperidone', 'Lumateperone', 'Blonanserin', 'Sertindole', 'Remoxipride', 'Pimavanserin',
    'Valbenazine', 'Deutetrabenazine', 'Tetrabenazine',
  ].map((name) => entry(name, 'Antipsychotics')),

  // ── Antidepressants ───────────────────────────────────────────────────────
  ...[
    'Fluoxetine', 'Sertraline', 'Paroxetine', 'Citalopram', 'Escitalopram', 'Fluvoxamine',
    'Venlafaxine', 'Desvenlafaxine', 'Duloxetine', 'Milnacipran', 'Levomilnacipran',
    'Amitriptyline', 'Nortriptyline', 'Imipramine', 'Clomipramine', 'Desipramine', 'Doxepin',
    'Maprotiline', 'Trimipramine', 'Protriptyline',
    'Phenelzine', 'Tranylcypromine', 'Selegiline', 'Moclobemide', 'Isocarboxazid',
    'Mirtazapine', 'Mianserin', 'Bupropion', 'Trazodone', 'Vortioxetine', 'Agomelatine',
    'Vilazodone', 'Reboxetine', 'Opipramol', 'Tianeptine', 'Hypericum perforatum',
    'Ketamine', 'Esketamine',
  ].map((name) => entry(name, 'Antidepressants')),

  // ── Mood stabilizers ──────────────────────────────────────────────────────
  ...[
    'Lithium carbonate', 'Valproic acid', 'Lamotrigine', 'Carbamazepine', 'Oxcarbazepine',
    'Topiramate', 'Gabapentin', 'Levetiracetam',
  ].map((name) => entry(name, 'Mood stabilizers')),

  // ── Anxiolytics / hypnotics ─────────────────────────────────────────────────
  ...[
    'Diazepam', 'Lorazepam', 'Oxazepam', 'Alprazolam', 'Clonazepam', 'Bromazepam',
    'Midazolam', 'Prazepam', 'Tetrazepam', 'Flurazepam', 'Nitrazepam', 'Lormetazepam',
    'Buspirone', 'Pregabalin', 'Hydroxyzine', 'Propranolol',
    'Zolpidem', 'Zopiclone', 'Eszopiclone', 'Zaleplon', 'Melatonin', 'Ramelteon',
    'Doxylamine', 'Chloral hydrate', 'Diphenhydramine',
  ].map((name) => entry(name, 'Anxiolytics/hypnotics')),

  // ── ADHD ──────────────────────────────────────────────────────────────────
  ...[
    'Methylphenidate', 'Lisdexamfetamine', 'Amphetamine', 'Atomoxetine', 'Guanfacine',
    'Clonidine', 'Modafinil',
  ].map((name) => entry(name, 'ADHD')),

  // ── Anti-dementia ─────────────────────────────────────────────────────────
  ...[
    'Donepezil', 'Rivastigmine', 'Galantamine', 'Memantine',
  ].map((name) => entry(name, 'Anti-dementia')),

  // ── Addiction medicine ──────────────────────────────────────────────────────
  ...[
    'Methadone', 'Buprenorphine', 'Naltrexone', 'Acamprosate', 'Disulfiram', 'Varenicline',
    'Nicotine', 'Nalmefene', 'Lofexidine',
  ].map((name) => entry(name, 'Addiction')),

  // ── EPS management ────────────────────────────────────────────────────────
  ...[
    'Biperiden', 'Trihexyphenidyl', 'Benztropine', 'Procyclidine', 'Orphenadrine',
  ].map((name) => entry(name, 'EPS management')),

  // ── Additional high-use psychotropics ─────────────────────────────────────
  ...[
    'Chlorprothixene', 'Levosulpiride', 'Amoxapine', 'Nefazodone', 'Flibanserin',
    'Suvorexant', 'Lemborexant', 'Daridorexant', 'Promethazine', 'Pipradrol',
  ].map((name, i) => {
    const cat: PsychiatricDrugCategory =
      i < 2 ? 'Antipsychotics' : i < 4 ? 'Antidepressants' : i < 7 ? 'Anxiolytics/hypnotics' : 'Antipsychotics'
    return entry(name, cat)
  }),
]

export const PSYCHIATRIC_DRUG_CATEGORIES: PsychiatricDrugCategory[] = [
  'Antipsychotics',
  'Antidepressants',
  'Mood stabilizers',
  'Anxiolytics/hypnotics',
  'ADHD',
  'Anti-dementia',
  'Addiction',
  'EPS management',
  'Additional',
]
