import type { UiLanguage } from '../../types/settings'
import {
  normalizePsychClass,
  type KnowledgeBaseDrug,
  type PsychopharmacaClass,
} from '../../types/knowledgeBase'
import { derivePsychClass } from '../medication/psychClass'

/** Coarse browse sections (German clinical grouping, not per-subclass tags). */
export type PsychClassSectionId =
  | 'antipsychotika'
  | 'antidepressiva'
  | 'phasenprophylaktika'
  | 'benzodiazepine'
  | 'anxiolytika'
  | 'hypnotika'
  | 'adhs'
  | 'antidemenz'
  | 'suchtmedizin'
  | 'sonstiges'
  | 'unclassified'

export interface PsychClassSectionMeta {
  id: PsychClassSectionId
  title: Record<UiLanguage, string>
  subtitle: Record<UiLanguage, string>
  order: number
}

const SECTION_META: Record<PsychClassSectionId, PsychClassSectionMeta> = {
  antipsychotika: {
    id: 'antipsychotika',
    order: 10,
    title: {
      de: 'Antipsychotika',
      en: 'Antipsychotics',
      fr: 'Antipsychotiques',
      es: 'Antipsicóticos',
    },
    subtitle: {
      de: 'Typische und atypische Neuroleptika',
      en: 'Typical and atypical antipsychotics',
      fr: 'Neuroleptiques typiques et atypiques',
      es: 'Neurolépticos típicos y atípicos',
    },
  },
  antidepressiva: {
    id: 'antidepressiva',
    order: 20,
    title: {
      de: 'Antidepressiva',
      en: 'Antidepressants',
      fr: 'Antidépresseurs',
      es: 'Antidepresivos',
    },
    subtitle: {
      de: 'SSRI, SNRI, TZA, MAO-Hemmer und sonstige Antidepressiva',
      en: 'SSRIs, SNRIs, TCAs, MAOIs, and other antidepressants',
      fr: 'ISRS, IRSN, ATC, IMAO et autres antidépresseurs',
      es: 'ISRS, IRSN, ATC, IMAO y otros antidepresivos',
    },
  },
  phasenprophylaktika: {
    id: 'phasenprophylaktika',
    order: 30,
    title: {
      de: 'Phasenprophylaktika',
      en: 'Mood stabilizers',
      fr: 'Thymorégulateurs',
      es: 'Estabilizadores del ánimo',
    },
    subtitle: {
      de: 'Lithium und Antiepileptika mit stimmungsstabilisierender Wirkung',
      en: 'Lithium and anticonvulsants with mood-stabilizing effect',
      fr: 'Lithium et anticonvulsivants à effet thymorégulateur',
      es: 'Litio y anticonvulsivos con efecto estabilizador del ánimo',
    },
  },
  benzodiazepine: {
    id: 'benzodiazepine',
    order: 40,
    title: {
      de: 'Benzodiazepine',
      en: 'Benzodiazepines',
      fr: 'Benzodiazépines',
      es: 'Benzodiazepinas',
    },
    subtitle: {
      de: 'Anxiolytische und sedierende Benzodiazepine',
      en: 'Anxiolytic and sedative benzodiazepines',
      fr: 'Benzodiazépines anxiolytiques et sédatives',
      es: 'Benzodiazepinas ansiolíticas y sedantes',
    },
  },
  anxiolytika: {
    id: 'anxiolytika',
    order: 50,
    title: {
      de: 'Anxiolytika',
      en: 'Anxiolytics',
      fr: 'Anxiolytiques',
      es: 'Ansiolíticos',
    },
    subtitle: {
      de: 'Nicht-benzodiazepine Anxiolytika',
      en: 'Non-benzodiazepine anxiolytics',
      fr: 'Anxiolytiques non benzodiazépiniques',
      es: 'Ansiolíticos no benzodiazepínicos',
    },
  },
  hypnotika: {
    id: 'hypnotika',
    order: 60,
    title: {
      de: 'Hypnotika',
      en: 'Hypnotics',
      fr: 'Hypnotiques',
      es: 'Hipnóticos',
    },
    subtitle: {
      de: 'Hypnotika und Sedativa',
      en: 'Hypnotics and sedatives',
      fr: 'Hypnotiques et sédatifs',
      es: 'Hipnóticos y sedantes',
    },
  },
  adhs: {
    id: 'adhs',
    order: 70,
    title: {
      de: 'ADHS / Psychostimulanzien',
      en: 'ADHD / psychostimulants',
      fr: 'TDAH / psychostimulants',
      es: 'TDAH / psicoestimulantes',
    },
    subtitle: {
      de: 'Stimulanzien und nicht-stimulierende ADHS-Medikation',
      en: 'Stimulants and non-stimulant ADHD medication',
      fr: 'Stimulants et médication TDAH non stimulante',
      es: 'Estimulantes y medicación TDAH no estimulante',
    },
  },
  antidemenz: {
    id: 'antidemenz',
    order: 80,
    title: {
      de: 'Antidementiva',
      en: 'Antidementia agents',
      fr: 'Antidémentiels',
      es: 'Antidemencia',
    },
    subtitle: {
      de: 'Cholinesterase-Hemmer und NMDA-Antagonisten',
      en: 'Cholinesterase inhibitors and NMDA antagonists',
      fr: 'Inhibiteurs de la cholinestérase et antagonistes NMDA',
      es: 'Inhibidores de la colinesterasa y antagonistas NMDA',
    },
  },
  suchtmedizin: {
    id: 'suchtmedizin',
    order: 90,
    title: {
      de: 'Suchtmedizin',
      en: 'Addiction medicine',
      fr: 'Addictologie',
      es: 'Medicina de adicciones',
    },
    subtitle: {
      de: 'Substitution und suchttherapeutische Wirkstoffe',
      en: 'Substitution and addiction-treatment agents',
      fr: 'Substitution et traitements de l’addiction',
      es: 'Sustitución y tratamiento de adicciones',
    },
  },
  sonstiges: {
    id: 'sonstiges',
    order: 100,
    title: {
      de: 'Sonstige Psychopharmaka',
      en: 'Other psychotropics',
      fr: 'Autres psychotropes',
      es: 'Otros psicofármacos',
    },
    subtitle: {
      de: 'Weitere Wirkstoffe ohne eindeutige Klassenzuordnung',
      en: 'Additional agents without a clear class assignment',
      fr: 'Autres substances sans classe claire',
      es: 'Otros fármacos sin clasificación clara',
    },
  },
  unclassified: {
    id: 'unclassified',
    order: 110,
    title: {
      de: 'Nicht klassifiziert',
      en: 'Unclassified',
      fr: 'Non classé',
      es: 'Sin clasificar',
    },
    subtitle: {
      de: 'Wirkstoffe ohne gesetzte psychopharmakologische Klasse',
      en: 'Drugs without an assigned psychopharmacology class',
      fr: 'Substances sans classe psychopharmacologique',
      es: 'Fármacos sin clase psicofarmacológica asignada',
    },
  },
}

const PSYCH_CLASS_TO_SECTION: Record<PsychopharmacaClass, PsychClassSectionId> = {
  antipsychotic_typical: 'antipsychotika',
  antipsychotic_atypical: 'antipsychotika',
  antidepressant_ssri: 'antidepressiva',
  antidepressant_snri: 'antidepressiva',
  antidepressant_tricyclic: 'antidepressiva',
  antidepressant_maoi: 'antidepressiva',
  antidepressant_nassa: 'antidepressiva',
  antidepressant_other: 'antidepressiva',
  mood_stabilizer: 'phasenprophylaktika',
  anticonvulsant: 'phasenprophylaktika',
  anxiolytic_benzodiazepine: 'benzodiazepine',
  anxiolytic_other: 'anxiolytika',
  hypnotic: 'hypnotika',
  psychostimulant: 'adhs',
  antidementia: 'antidemenz',
  addiction: 'suchtmedizin',
  other: 'sonstiges',
  unspecified: 'unclassified',
}

export function resolveDrugPsychClass(drug: KnowledgeBaseDrug): PsychopharmacaClass {
  const stored = normalizePsychClass(drug.psychClass)
  if (stored !== 'unspecified') return stored
  return derivePsychClass(drug.genericName, drug.category, drug.drugClass)
}

export function psychClassToSectionId(psychClass: PsychopharmacaClass): PsychClassSectionId {
  return PSYCH_CLASS_TO_SECTION[psychClass]
}

export function getPsychClassSectionMeta(sectionId: PsychClassSectionId): PsychClassSectionMeta {
  return SECTION_META[sectionId]
}

export const PSYCH_CLASS_SECTION_ORDER: PsychClassSectionId[] = (
  Object.values(SECTION_META) as PsychClassSectionMeta[]
)
  .sort((a, b) => a.order - b.order)
  .map((section) => section.id)

export function localizePsychClassSection(
  sectionId: PsychClassSectionId,
  language: string,
): { title: string; subtitle: string } {
  const lang: UiLanguage =
    language === 'en' || language === 'fr' || language === 'es' ? language : 'de'
  const meta = SECTION_META[sectionId]
  return { title: meta.title[lang], subtitle: meta.subtitle[lang] }
}
