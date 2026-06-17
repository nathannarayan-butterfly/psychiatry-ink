import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F8 block. */
export const enF8: DisorderTranslationMap = {
  'developmental_speech_language_disorder': {
    name: 'Specific developmental disorder of speech and language',
    differentials: [
      'Hearing impairment as the cause of the language difficulty',
      'Intellectual disability with global developmental delay',
      'Autism spectrum disorder',
      'Selective mutism (able to speak, but falls silent in particular situations)',
      'Multilingualism / environmental factors',
    ],
    groups: {
      'f80.core': 'Core: circumscribed delay in speech or language development',
      'f80.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f80.delayed_acquisition': 'Acquisition of language skills (articulation, expressive and/or receptive language) is markedly below the level expected for age from the early stages of development onward',
      'f80.early_onset': 'The difficulty has been present since the early developmental years and is not the consequence of a language loss acquired only later',
      'f80.functional_impact': 'The language delay impairs academic performance, everyday communication or social participation',
      'f80.exclude_hearing_neuro': 'The language delay is not sufficiently explained by a hearing impairment, a neurological disease or an anomaly of the speech apparatus',
      'f80.exclude_global_delay': 'Language abilities lie markedly below the general non-verbal developmental level (no global delay in the sense of intellectual disability)',
    },
  },
  'developmental_learning_disorder': {
    name: 'Specific developmental disorder of scholastic skills',
    differentials: [
      'Intellectual disability (global performance lag)',
      'Inadequate or interrupted schooling',
      'Sensory impairment (reduced vision or hearing)',
      'Attention disorder (ADHD) as the cause of learning problems',
      'Developmental language disorder',
    ],
    groups: {
      'f81.core': 'Core: circumscribed impairment of scholastic skills',
      'f81.qualifiers': 'Diagnostic conditions',
      'f81.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f81.reading_spelling': 'Markedly impaired reading and/or spelling skills that are not explained by age, intelligence or inappropriate schooling alone (reading and spelling disorder)',
      'f81.arithmetic': 'Markedly impaired arithmetic skills (basic operations, number sense) that are not explained by age, intelligence or inappropriate schooling alone (arithmetic disorder / dyscalculia)',
      'f81.early_onset': 'The learning impairment is present from the beginning of formal schooling onward and is not acquired only secondarily',
      'f81.functional_impact': 'The performance lag impairs academic achievement or everyday demands that require these skills',
      'f81.exclude_intellectual_sensory': 'The lag is not sufficiently explained by intellectual disability, an uncorrected sensory impairment or lack of schooling',
    },
  },
  'developmental_motor_coordination_disorder': {
    name: 'Specific developmental disorder of motor function',
    differentials: [
      'Neurological disease (e.g. cerebral palsy, myopathy)',
      'Intellectual disability with general developmental delay',
      'Visual impairment',
      'Autism spectrum disorder',
    ],
    groups: {
      'f82.core': 'Core: impaired motor coordination',
      'f82.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f82.coordination_deficit': 'Motor coordination (fine and/or gross motor skills) lies markedly below the level expected for age and intelligence (e.g. clumsy handling, delayed acquisition of motor milestones)',
      'f82.early_onset': 'The coordination weakness has been present since early development and is not acquired only later',
      'f82.functional_impact': 'The motor clumsiness markedly impairs academic performance, everyday activities or play',
      'f82.exclude_neuro_intellectual': 'The coordination disorder is not sufficiently explained by a circumscribed neurological disease or by intellectual disability',
    },
  },
  'autism_spectrum_disorder': {
    name: 'Autism spectrum disorder',
    differentials: [
      'Intellectual disability without core autistic features',
      'Specific developmental language disorder',
      'Social (pragmatic) communication disorder',
      'Reactive attachment disorder / deprivation',
      'Early-onset schizophrenia',
      'ADHD (attention/impulse-control problems without core autistic features)',
    ],
    groups: {
      'f84.social_communication': 'Persistent deficits in social communication and interaction',
      'f84.restricted_repetitive': 'Restricted, repetitive patterns of behaviour, interests and activities (at least 2)',
      'f84.developmental_context': 'Onset and impairment',
      'f84.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f84.social_reciprocity': 'Persistent impairment of social-emotional reciprocity (e.g. reduced initiation of contact, shared attention or response to social approach)',
      'f84.nonverbal_communication': 'Impairment of non-verbal communication (e.g. eye contact, facial expression, gestures) and of the social use of language',
      'f84.relationships': 'Difficulty establishing and maintaining age-appropriate relationships or adapting behaviour to social contexts',
      'f84.stereotyped_behavior': 'Stereotyped or repetitive motor movements, speech patterns (e.g. echolalia) or use of objects',
      'f84.insistence_sameness': 'Excessive adherence to sameness, routines or ritualised sequences; marked distress at change',
      'f84.restricted_interests': 'Highly restricted, unusually intense or fixated special interests',
      'f84.sensory': 'Over- or under-sensitivity to sensory stimuli, or unusual interest in sensory aspects of the environment',
      'f84.early_onset': 'The features have been present since early childhood (they may become fully apparent only later when social demands are lower)',
      'f84.functional_impact': 'The features cause clinically significant impairment in social, academic or other important areas of functioning',
      'f84.exclude_better_explained': 'The difficulties are not better explained by isolated intellectual disability or another mental disorder',
    },
  },
}
