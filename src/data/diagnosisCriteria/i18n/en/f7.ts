import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F7 block. */
export const enF7: DisorderTranslationMap = {
  'intellectual_disability_mild': {
    name: 'Mild intellectual disability',
    differentials: [
      'Specific learning or developmental disorder (a circumscribed deficit rather than global delay)',
      'Performance lag due to socio-economic or educational disadvantage',
      'Unrecognised sensory impairment (reduced vision or hearing)',
      'Autism spectrum disorder without intellectual disability',
    ],
    groups: {
      'f70.core': 'Core: the three diagnostic pillars of intellectual disability',
      'f70.assessment': 'Diagnostic conditions for establishing the diagnosis',
      'f70.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f70.intellectual_functioning': 'General intellectual functioning markedly below average, roughly in the range of an IQ of 50–69 (in adulthood this corresponds approximately to a developmental age of 9 to under 12 years)',
      'f70.adaptive_functioning': 'Difficulties with academic learning, yet independence in self-care and in practical and domestic skills is often achievable; support is required mainly for abstract and complex demands',
      'f70.functional_profile': 'Language is usually acquired sufficiently for everyday purposes; many affected individuals are capable of work in adulthood and can maintain social relationships',
      'f70.developmental_onset': 'Onset of the impairments during the developmental period (before completion of brain maturation), not as a later acquired decline in functioning in the sense of a dementing illness',
      'f70.standardized_assessment': 'Intellectual and adaptive functioning should ideally be established using standardised, normed and culturally fair instruments; assignment of severity does not rest on a single test score alone',
      'f70.exclude_acquired_decline': 'The reduced level of functioning is not explained by a cognitive decline acquired only after the developmental period (dementia, traumatic brain injury in adulthood)',
      'f70.exclude_sensory_deprivation': 'The performance lag is not sufficiently explained by an uncorrected sensory impairment, a severe mental disorder, or by lack of schooling or social deprivation alone',
    },
  },
  'intellectual_disability_moderate': {
    name: 'Moderate intellectual disability',
    differentials: [
      'Severe intellectual disability (F72)',
      'Pervasive developmental disorder with global delay',
      'Acquired neurocognitive disorder in childhood',
      'Severe deprivation with developmental delay',
    ],
    groups: {
      'f71.core': 'Core: the three diagnostic pillars of intellectual disability',
      'f71.assessment': 'Diagnostic conditions for establishing the diagnosis',
      'f71.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f71.intellectual_functioning': 'General intellectual functioning markedly below average, roughly in the range of an IQ of 35–49 (corresponding approximately to a developmental age of 6 to under 9 years)',
      'f71.adaptive_functioning': 'Markedly slowed development of language comprehension and use as well as of self-care and motor skills; ongoing support in daily life and management of living is required',
      'f71.functional_profile': 'Limited academic progress; in adulthood simple, supervised activities are usually possible; social participation in a structured environment',
      'f71.developmental_onset': 'Onset of the impairments during the developmental period (before completion of brain maturation), not as a later acquired decline in functioning in the sense of a dementing illness',
      'f71.standardized_assessment': 'Intellectual and adaptive functioning should ideally be established using standardised, normed and culturally fair instruments; assignment of severity does not rest on a single test score alone',
      'f71.exclude_acquired_decline': 'The reduced level of functioning is not explained by a cognitive decline acquired only after the developmental period (dementia, traumatic brain injury in adulthood)',
      'f71.exclude_sensory_deprivation': 'The performance lag is not sufficiently explained by an uncorrected sensory impairment, a severe mental disorder, or by lack of schooling or social deprivation alone',
    },
  },
  'intellectual_disability_severe': {
    name: 'Severe intellectual disability',
    differentials: [
      'Profound intellectual disability (F73)',
      'Progressive neurological or metabolic disease',
      'Multiple sensory or motor disability without global intellectual disability',
    ],
    groups: {
      'f72.core': 'Core: the three diagnostic pillars of intellectual disability',
      'f72.assessment': 'Diagnostic conditions for establishing the diagnosis',
      'f72.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f72.intellectual_functioning': 'General intellectual functioning severely below average, roughly in the range of an IQ of 20–34 (corresponding approximately to a developmental age of 3 to under 6 years)',
      'f72.adaptive_functioning': 'Marked and pervasive deficits across almost all adaptive domains; only rudimentary language acquisition; continuous care and assistance with self-care are required',
      'f72.functional_profile': 'Frequently associated motor impairments and accompanying neurological conditions; continuous support across all of daily life',
      'f72.developmental_onset': 'Onset of the impairments during the developmental period (before completion of brain maturation), not as a later acquired decline in functioning in the sense of a dementing illness',
      'f72.standardized_assessment': 'Intellectual and adaptive functioning should ideally be established using standardised, normed and culturally fair instruments; assignment of severity does not rest on a single test score alone',
      'f72.exclude_acquired_decline': 'The reduced level of functioning is not explained by a cognitive decline acquired only after the developmental period (dementia, traumatic brain injury in adulthood)',
      'f72.exclude_sensory_deprivation': 'The performance lag is not sufficiently explained by an uncorrected sensory impairment, a severe mental disorder, or by lack of schooling or social deprivation alone',
    },
  },
  'intellectual_disability_profound': {
    name: 'Profound intellectual disability',
    differentials: [
      'Severe intellectual disability (F72)',
      'Severe underlying neurological disease with vegetative state or minimal responsiveness',
      'Multiple sensory disability that masks the level of functioning',
    ],
    groups: {
      'f73.core': 'Core: the three diagnostic pillars of intellectual disability',
      'f73.assessment': 'Diagnostic conditions for establishing the diagnosis',
      'f73.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f73.intellectual_functioning': 'General intellectual functioning profoundly below average, roughly in the range of an IQ below 20 (corresponding approximately to a developmental age under 3 years)',
      'f73.adaptive_functioning': 'Profound limitation of comprehension and use of language, mobility, continence and self-care; complete and continuous nursing care and supervision are required',
      'f73.functional_profile': 'Very limited ability to understand simple requests; frequently severe associated physical and neurological impairments as well as restricted mobility',
      'f73.developmental_onset': 'Onset of the impairments during the developmental period (before completion of brain maturation), not as a later acquired decline in functioning in the sense of a dementing illness',
      'f73.standardized_assessment': 'Intellectual and adaptive functioning should ideally be established using standardised, normed and culturally fair instruments; assignment of severity does not rest on a single test score alone',
      'f73.exclude_acquired_decline': 'The reduced level of functioning is not explained by a cognitive decline acquired only after the developmental period (dementia, traumatic brain injury in adulthood)',
      'f73.exclude_sensory_deprivation': 'The performance lag is not sufficiently explained by an uncorrected sensory impairment, a severe mental disorder, or by lack of schooling or social deprivation alone',
    },
  },
}
