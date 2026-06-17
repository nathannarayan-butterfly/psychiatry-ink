import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F5 block. */
export const enF5: DisorderTranslationMap = {
  anorexia_nervosa: {
    name: 'Anorexia nervosa',
    differentials: [
      'Bulimia nervosa (weight usually normal or raised)',
      'Physical cause of weight loss (e.g. malignancy, hyperthyroidism, malabsorption)',
      'Depressive episode with loss of appetite',
      'Avoidant/restrictive food intake disorder (ARFID; without body-image disturbance)',
    ],
    groups: {
      'f50_0.core': 'Core: self-induced underweight with weight phobia',
      'f50_0.endocrine': 'Endocrine/physical sequelae (at least 1)',
      'f50_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f50_0.low_weight':
        'Markedly low body weight (e.g. BMI ≤ 17.5 kg/m² in adults, or falling below the expected weight during the growth years), self-induced',
      'f50_0.self_induced_weight_loss':
        'Active weight reduction through restricted food intake and/or additional measures (excessive exercise, vomiting, laxatives, appetite suppressants)',
      'f50_0.body_image_distortion':
        'Body-image disturbance with an overvalued dread of becoming fat and a low personal weight threshold',
      'f50_0.endocrine_disturbance':
        'Endocrine disturbance (e.g. amenorrhoea, loss of libido or potency) or delayed pubertal development as a consequence of undernutrition',
      'f50_0.exclude_organic':
        'The underweight is not explained by another physical illness that leads to loss of appetite or weight',
    },
  },
  bulimia_nervosa: {
    name: 'Bulimia nervosa',
    differentials: [
      'Anorexia nervosa, binge-purge type (where there is marked underweight)',
      'Binge-eating disorder (without compensatory measures)',
      'Gastrointestinal cause of vomiting',
      'Depressive episode with binge eating',
    ],
    groups: {
      'f50_2.core': 'Core: recurrent binge eating with compensatory measures',
      'f50_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f50_2.binge_episodes':
        'Recurrent episodes of binge eating, with intake of large amounts of food in a short period and a subjective loss of control over eating',
      'f50_2.compensatory':
        'Repeated compensatory measures aimed at weight control (e.g. self-induced vomiting, laxative or diuretic misuse, fasting, excessive exercise)',
      'f50_2.overvalued_weight':
        'Excessive preoccupation with shape and weight, with an overvalued fear of weight gain',
      'f50_2.exclude_anorexia':
        'The picture is not better explained by anorexia nervosa (binge-purge type) with marked underweight',
    },
  },
  nonorganic_insomnia: {
    name: 'Non-organic insomnia',
    differentials: [
      'Organic sleep disorder (e.g. sleep apnoea, restless legs syndrome)',
      'Depressive episode or anxiety disorder with sleep disturbance',
      'Substance- or medication-induced insomnia',
      'Circadian sleep–wake rhythm disorder',
    ],
    groups: {
      'f51_0.core': 'Core: persistent difficulty initiating/maintaining sleep with daytime impairment',
      'f51_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f51_0.sleep_complaint':
        'Complaints of difficulty falling asleep, difficulty staying asleep, or non-restorative sleep on several nights per week',
      'f51_0.duration':
        'The sleep disturbance persists over a prolonged period (of the order of ≥ 1 month)',
      'f51_0.daytime_distress':
        'Marked distress or impairment of daytime wellbeing/performance as a consequence of the sleep disturbance',
      'f51_0.exclude_organic':
        'The sleep disturbance is not adequately explained by an organic sleep disorder, a substance effect or another mental disorder',
    },
  },
  nonorganic_nightmare_disorder: {
    name: 'Nightmares (non-organic)',
    differentials: [
      'Sleep terrors (awakening without clear dream content, non-REM)',
      'Post-traumatic stress disorder with trauma-related nightmares',
      'Medication- or substance-induced nightmares',
      'Nocturnal panic attacks',
    ],
    groups: {
      'f51_5.core': 'Core: repeated frightening dreams with full awakening',
      'f51_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f51_5.nightmares':
        'Repeated awakenings with vivid, detailed recall of intensely frightening dreams (typically in the second half of the night)',
      'f51_5.full_orientation':
        'On awakening, rapid orientation and alertness; marked distress arising from the dreams',
      'f51_5.exclude_organic_substance':
        'The nightmares are not adequately explained by a substance or medication effect or by a physical illness',
    },
  },
  nonorganic_sleep_terrors: {
    name: 'Sleep terrors (pavor nocturnus)',
    differentials: [
      'Nightmare disorder (vivid dream recall, full awakening)',
      'Nocturnal epileptic seizures',
      'Sleepwalking (somnambulism)',
      'Nocturnal panic attacks',
    ],
    groups: {
      'f51_4.core': 'Core: episodic panic-like arousal from deep sleep',
      'f51_4.exclusions': 'Exclusions',
    },
    criteria: {
      'f51_4.terror_episodes':
        'Repeated episodes of sudden panic-like arousal from sleep (usually in the first third of the night) with a cry of fear, autonomic overactivity and marked difficulty being roused',
      'f51_4.amnesia':
        'Largely amnesic for the episode; during the event the person is difficult to console and barely responsive',
      'f51_4.exclude_organic':
        'The episodes are not explained by an organic illness (e.g. nocturnal epilepsy) or a substance effect',
    },
  },
  nonorganic_sexual_dysfunction: {
    name: 'Sexual dysfunction not caused by an organic disorder',
    differentials: [
      'Organically/medically caused sexual dysfunction (e.g. vascular, endocrine, neurological)',
      'Medication- or substance-induced sexual dysfunction',
      'Depressive episode or anxiety disorder with secondary dysfunction',
      'Relationship/partnership conflict as the primary cause',
    ],
    groups: {
      'f52.core': 'Core: persistent sexual dysfunction without sufficient organic explanation',
      'f52.qualifiers': 'Qualifying conditions',
      'f52.exclusions': 'Exclusions',
    },
    criteria: {
      'f52.desire_arousal':
        'Persistent lack or loss of sexual desire, or impaired sexual arousal (e.g. erectile or lubrication difficulty)',
      'f52.orgasm':
        'Orgasmic dysfunction (absence, marked delay) or premature/delayed ejaculation',
      'f52.pain':
        'Sexually related pain or dysfunction (e.g. vaginismus, non-organic dyspareunia)',
      'f52.persistent_distress':
        'The disturbance is frequent or persistent and prevents the sexual relationship the person desires, or causes marked distress',
      'f52.exclude_organic':
        'The dysfunction is not predominantly caused by a physical illness, medication or substances',
    },
  },
  puerperal_mental_disorder: {
    name: 'Mental disorder of the puerperium (postpartum period)',
    differentials: [
      'An independent depressive episode or psychosis with peripartum onset',
      '“Baby blues” (mild, self-limiting, without clinical significance)',
      'Thyroid or other physical postpartum cause',
      'Bipolar disorder with a postpartum episode',
    ],
    groups: {
      'f53.core': 'Core: mental disorder with onset in the puerperium',
      'f53.severity': 'Severity/typing features (at least 1)',
      'f53.exclusions': 'Exclusions',
    },
    criteria: {
      'f53.postpartum_onset':
        'Onset of a relevant mental disorder in close temporal relation to childbirth (usually within approximately six weeks postpartum)',
      'f53.clinical_syndrome':
        'Presence of a clinically significant mental syndrome (e.g. depressive, anxious or psychotic) of clinical significance beyond a mere “baby blues”',
      'f53.psychotic_features':
        'Psychotic features (delusions, hallucinations, severe disorganisation) in the sense of a postpartum psychosis (ICD-11 6E21)',
      'f53.nonpsychotic_features':
        'Non-psychotic symptoms (e.g. postpartum depression with exhaustion, guilt, worry about the infant; ICD-11 6E20)',
      'f53.risk':
        'Indications of risk to self or others (including thoughts of harming the infant) — requires particular attention',
      'f53.exclude_classifiable':
        'The disorder is coded here only where it cannot be adequately assigned to a disorder classified elsewhere (e.g. an independent depressive episode or schizophrenia)',
    },
  },
}
