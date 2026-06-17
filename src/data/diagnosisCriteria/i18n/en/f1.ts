import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F1 block. */
export const enF1: DisorderTranslationMap = {
  alcohol_dependence: {
    name: 'Alcohol dependence',
    differentials: [
      'Harmful use / hazardous consumption (F10.1) without dependence',
      'Acute intoxication (F10.0)',
      'Substance-induced mood or anxiety disorder',
    ],
    groups: {
      'f10_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f10_2.craving': 'A strong desire or sense of compulsion to consume alcohol (craving)',
      'f10_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f10_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve or avoid withdrawal symptoms',
      'f10_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f10_2.neglect':
        'Progressive neglect of other interests and activities in favour of consumption, together with increased time spent obtaining, using and recovering from the substance',
      'f10_2.persistence_harm':
        'Continued consumption despite clear evidence of harmful physical, psychological or social consequences',
    },
  },
  alcohol_acute_intoxication: {
    name: 'Acute alcohol intoxication',
    differentials: [
      'Withdrawal state (F10.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f10_0.use': 'Evidence of consumption',
      'f10_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f10_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_0.recent_use': 'Recent consumption of alcohol at a sufficiently high dose',
      'f10_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f10_0.disinhibition': 'Disinhibition, mood lability or argumentativeness',
      'f10_0.ataxia': 'Unsteadiness of gait and stance (ataxia) and impaired coordination',
      'f10_0.slurred_speech': 'Slurred speech',
      'f10_0.nystagmus': 'Nystagmus or impaired eye movements',
      'f10_0.attention': 'Impaired attention and concentration',
      'f10_0.reduced_consciousness': 'Reduced level of consciousness, progressing to stupor at high doses',
      'f10_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  alcohol_withdrawal: {
    name: 'Alcohol withdrawal state',
    differentials: [
      'Acute intoxication (F10.0)',
      'Withdrawal state with delirium (F10.4)',
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      'f10_3.context': 'Withdrawal context',
      'f10_3.symptoms': 'Withdrawal symptoms (at least 1)',
      'f10_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_3.cessation':
        'Cessation or reduction of alcohol after repeated, usually sustained and/or high-dose consumption',
      'f10_3.withdrawal_syndrome': 'A withdrawal state typical of the substance is present',
      'f10_3.tremor': 'Tremor, especially of the hands',
      'f10_3.sweating_autonomic': 'Sweating, tachycardia and other autonomic overactivity',
      'f10_3.anxiety_agitation': 'Anxiety, restlessness or psychomotor agitation',
      'f10_3.nausea': 'Nausea or vomiting',
      'f10_3.insomnia': 'Difficulty falling and staying asleep',
      'f10_3.transient_hallucinations':
        'Transient visual, tactile or auditory misperceptions',
      'f10_3.exclude_other_cause':
        'The symptoms are not better explained by another physical or mental disorder',
    },
  },
  alcohol_withdrawal_delirium: {
    name: 'Alcohol withdrawal state with delirium',
    differentials: [
      'Withdrawal state without delirium (F10.3)',
      'Delirium of another (physical) cause (F05)',
      'Substance-induced psychotic disorder',
      'Wernicke encephalopathy (in alcohol use)',
    ],
    groups: {
      'f10_4.context': 'Withdrawal with disturbance of consciousness',
      'f10_4.features': 'Accompanying delirious features (at least 1)',
      'f10_4.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_4.withdrawal_context':
        'Cessation or reduction of alcohol in the context of pre-existing dependence',
      'f10_4.clouding':
        'Clouding of consciousness with impaired alertness and attention (delirious state)',
      'f10_4.disorientation': 'Disorientation and global impairment of cognitive function',
      'f10_4.hallucinations':
        'Vivid (frequently visual or scenic) hallucinations or illusions',
      'f10_4.psychomotor': 'Marked psychomotor restlessness or agitation',
      'f10_4.autonomic':
        'Marked autonomic overactivity (e.g. tachycardia, sweating, hypertension, coarse tremor); seizures possible',
      'f10_4.exclude_other_cause':
        'The delirium is not better explained by an independent physical illness',
    },
  },
  alcohol_psychotic_disorder: {
    name: 'Alcohol-induced psychotic disorder',
    differentials: [
      'Schizophrenia or persistent delusional disorder',
      'Acute intoxication (F10.0) with psychotic phenomena',
      'Withdrawal state with delirium (F10.4)',
      'Mood disorder with psychotic symptoms',
    ],
    groups: {
      'f10_5.symptoms': 'Psychotic symptoms (at least 1)',
      'f10_5.context': 'Temporal relationship with consumption',
      'f10_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_5.hallucinations':
        'Hallucinations (frequently auditory or visual) that are not solely an expression of simple intoxication',
      'f10_5.delusions': 'Delusional ideas, frequently persecutory or referential delusions',
      'f10_5.temporal_relation':
        'Onset of the psychotic symptoms during or shortly after (usually within two weeks of) consumption of alcohol',
      'f10_5.partial_remission':
        'The symptoms typically remit at least partially within a limited period (on the order of weeks to a few months)',
      'f10_5.exclude_primary_psychosis':
        'The presentation is not better explained by a primary psychotic disorder and does not occur exclusively in the context of intoxication or withdrawal delirium',
    },
  },
  opioids_acute_intoxication: {
    name: 'Acute opioid intoxication',
    differentials: [
      'Withdrawal state (F11.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f11_0.use': 'Evidence of consumption',
      'f11_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f11_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f11_0.recent_use': 'Recent consumption of opioids at a sufficiently high dose',
      'f11_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f11_0.miosis': 'Pupillary constriction (miosis)',
      'f11_0.sedation': 'Apathy, sedation or reduced level of consciousness',
      'f11_0.euphoria': 'Initial euphoria followed by apathy or dysphoria',
      'f11_0.respiratory_depression': 'Slowed breathing (respiratory depression) at high doses',
      'f11_0.slurred_speech': 'Slurred speech and impaired attention',
      'f11_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  opioids_harmful_use: {
    name: 'Harmful use of opioids',
    differentials: [
      'Dependence syndrome (F11.2)',
      'Acute intoxication (F11.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f11_1.harm': 'Consumption with damage to health',
      'f11_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f11_1.actual_use': 'Actual consumption of opioids is documented',
      'f11_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f11_1.exclude_dependence':
        'The criteria for a dependence syndrome (F11.2) are not met',
    },
  },
  opioids_dependence: {
    name: 'Opioid dependence syndrome',
    differentials: [
      'Harmful use of opioids (F11.1) without dependence',
      'Acute intoxication (F11.0)',
      'Substance-induced mood or psychotic disorder',
    ],
    groups: {
      'f11_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f11_2.craving': 'A strong desire or sense of compulsion to consume opioids (craving)',
      'f11_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f11_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      'f11_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f11_2.neglect':
        'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      'f11_2.persistence_harm':
        'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  },
  opioids_withdrawal: {
    name: 'Opioid withdrawal state',
    differentials: [
      'Acute intoxication (F11.0)',
      'Withdrawal state with delirium (F11.4)',
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      'f11_3.context': 'Withdrawal context',
      'f11_3.symptoms': 'Withdrawal symptoms (at least 1)',
      'f11_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f11_3.cessation':
        'Cessation or reduction of opioids after repeated, usually sustained and/or high-dose consumption',
      'f11_3.withdrawal_syndrome': 'A withdrawal state typical of the substance is present',
      'f11_3.craving': 'Strong craving for the substance',
      'f11_3.rhinorrhea_lacrimation': 'Runny nose and watering eyes',
      'f11_3.mydriasis_piloerection':
        'Pupillary dilation, gooseflesh (piloerection) and bouts of sweating',
      'f11_3.myalgia': 'Muscle and limb pains',
      'f11_3.gi_symptoms': 'Nausea, vomiting, abdominal cramps or diarrhoea',
      'f11_3.dysphoria': 'Dysphoric mood, yawning and disturbed sleep',
      'f11_3.exclude_other_cause':
        'The symptoms are not better explained by another physical or mental disorder',
    },
  },
  cannabinoids_acute_intoxication: {
    name: 'Acute cannabinoid intoxication',
    differentials: [
      'Withdrawal state (F12.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f12_0.use': 'Evidence of consumption',
      'f12_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f12_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_0.recent_use': 'Recent consumption of cannabinoids at a sufficiently high dose',
      'f12_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f12_0.euphoria_anxiety':
        'Euphoria and relaxation or, conversely, anxiety and agitation',
      'f12_0.time_perception':
        'Altered sense of time and an impression of heightened perception',
      'f12_0.impaired_coordination': 'Impaired coordination and reaction time',
      'f12_0.appetite': 'Increased appetite',
      'f12_0.conjunctival_injection': 'Reddened conjunctivae, dry mouth and tachycardia',
      'f12_0.suspiciousness': 'Suspiciousness or paranoid ideas',
      'f12_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  cannabinoids_harmful_use: {
    name: 'Harmful use of cannabinoids',
    differentials: [
      'Dependence syndrome (F12.2)',
      'Acute intoxication (F12.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f12_1.harm': 'Consumption with damage to health',
      'f12_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_1.actual_use': 'Actual consumption of cannabinoids is documented',
      'f12_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f12_1.exclude_dependence':
        'The criteria for a dependence syndrome (F12.2) are not met',
    },
  },
  cannabinoids_dependence: {
    name: 'Cannabinoid dependence syndrome',
    differentials: [
      'Harmful use of cannabinoids (F12.1) without dependence',
      'Acute intoxication (F12.0)',
      'Substance-induced mood or psychotic disorder',
    ],
    groups: {
      'f12_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f12_2.craving':
        'A strong desire or sense of compulsion to consume cannabinoids (craving)',
      'f12_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f12_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      'f12_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f12_2.neglect':
        'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      'f12_2.persistence_harm':
        'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  },
  cannabinoids_withdrawal: {
    name: 'Cannabinoid withdrawal state',
    differentials: [
      'Acute intoxication (F12.0)',
      'Withdrawal state with delirium (F12.4)',
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      'f12_3.context': 'Withdrawal context',
      'f12_3.symptoms': 'Withdrawal symptoms (at least 1)',
      'f12_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_3.cessation':
        'Cessation or reduction of cannabinoids after repeated, usually sustained and/or high-dose consumption',
      'f12_3.withdrawal_syndrome': 'A withdrawal state typical of the substance is present',
      'f12_3.irritability': 'Irritability, inner restlessness or nervousness',
      'f12_3.anxiety': 'Anxiety or tension',
      'f12_3.sleep_disturbance': 'Disturbed sleep, at times with vivid dreams',
      'f12_3.appetite_loss': 'Reduced appetite and weight loss',
      'f12_3.depressed_mood': 'Depressed mood',
      'f12_3.exclude_other_cause':
        'The symptoms are not better explained by another physical or mental disorder',
    },
  },
  cannabinoids_psychotic_disorder: {
    name: 'Cannabinoid-induced psychotic disorder',
    differentials: [
      'Schizophrenia or persistent delusional disorder',
      'Acute intoxication (F12.0) with psychotic phenomena',
      'Withdrawal state with delirium (F12.4)',
      'Mood disorder with psychotic symptoms',
    ],
    groups: {
      'f12_5.symptoms': 'Psychotic symptoms (at least 1)',
      'f12_5.context': 'Temporal relationship with consumption',
      'f12_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_5.hallucinations':
        'Hallucinations (frequently auditory or visual) that are not solely an expression of simple intoxication',
      'f12_5.delusions': 'Delusional ideas, frequently persecutory or referential delusions',
      'f12_5.temporal_relation':
        'Onset of the psychotic symptoms during or shortly after (usually within two weeks of) consumption of cannabinoids',
      'f12_5.partial_remission':
        'The symptoms typically remit at least partially within a limited period (on the order of weeks to a few months)',
      'f12_5.exclude_primary_psychosis':
        'The presentation is not better explained by a primary psychotic disorder and does not occur exclusively in the context of intoxication or withdrawal delirium',
    },
  },
  sedatives_acute_intoxication: {
    name: 'Acute intoxication with sedatives or hypnotics',
    differentials: [
      'Withdrawal state (F13.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f13_0.use': 'Evidence of consumption',
      'f13_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f13_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_0.recent_use':
        'Recent consumption of sedatives or hypnotics at a sufficiently high dose',
      'f13_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f13_0.sedation': 'Sedation, drowsiness and reduced alertness',
      'f13_0.ataxia': 'Unsteadiness of gait (ataxia) and impaired coordination',
      'f13_0.slurred_speech': 'Slurred speech',
      'f13_0.nystagmus': 'Nystagmus',
      'f13_0.memory_attention':
        'Impaired attention and memory (anterograde amnesia possible)',
      'f13_0.disinhibition': 'Disinhibition or paradoxical excitation',
      'f13_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  sedatives_harmful_use: {
    name: 'Harmful use of sedatives or hypnotics',
    differentials: [
      'Dependence syndrome (F13.2)',
      'Acute intoxication (F13.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f13_1.harm': 'Consumption with damage to health',
      'f13_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_1.actual_use': 'Actual consumption of sedatives or hypnotics is documented',
      'f13_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f13_1.exclude_dependence':
        'The criteria for a dependence syndrome (F13.2) are not met',
    },
  },
  sedatives_dependence: {
    name: 'Dependence syndrome due to sedatives or hypnotics',
    differentials: [
      'Harmful use of sedatives or hypnotics (F13.1) without dependence',
      'Acute intoxication (F13.0)',
      'Substance-induced mood or psychotic disorder',
    ],
    groups: {
      'f13_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f13_2.craving':
        'A strong desire or sense of compulsion to consume sedatives or hypnotics (craving)',
      'f13_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f13_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      'f13_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f13_2.neglect':
        'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      'f13_2.persistence_harm':
        'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  },
  sedatives_withdrawal: {
    name: 'Withdrawal state due to sedatives or hypnotics',
    differentials: [
      'Acute intoxication (F13.0)',
      'Withdrawal state with delirium (F13.4)',
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      'f13_3.context': 'Withdrawal context',
      'f13_3.symptoms': 'Withdrawal symptoms (at least 1)',
      'f13_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_3.cessation':
        'Cessation or reduction of sedatives or hypnotics after repeated, usually sustained and/or high-dose consumption',
      'f13_3.withdrawal_syndrome': 'A withdrawal state typical of the substance is present',
      'f13_3.tremor': 'Tremor and autonomic overactivity (sweating, tachycardia)',
      'f13_3.insomnia': 'Marked difficulty falling and staying asleep',
      'f13_3.anxiety_agitation': 'Anxiety, inner restlessness and agitation',
      'f13_3.nausea': 'Nausea or vomiting',
      'f13_3.perceptual_disturbance': 'Perceptual disturbances or transient hallucinations',
      'f13_3.seizures': 'Seizures possible',
      'f13_3.exclude_other_cause':
        'The symptoms are not better explained by another physical or mental disorder',
    },
  },
  sedatives_withdrawal_delirium: {
    name: 'Withdrawal state with delirium due to sedatives or hypnotics',
    differentials: [
      'Withdrawal state without delirium (F13.3)',
      'Delirium of another (physical) cause (F05)',
      'Substance-induced psychotic disorder',
      'Wernicke encephalopathy (in alcohol use)',
    ],
    groups: {
      'f13_4.context': 'Withdrawal with disturbance of consciousness',
      'f13_4.features': 'Accompanying delirious features (at least 1)',
      'f13_4.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_4.withdrawal_context':
        'Cessation or reduction of sedatives or hypnotics in the context of pre-existing dependence',
      'f13_4.clouding':
        'Clouding of consciousness with impaired alertness and attention (delirious state)',
      'f13_4.disorientation': 'Disorientation and global impairment of cognitive function',
      'f13_4.hallucinations':
        'Vivid (frequently visual or scenic) hallucinations or illusions',
      'f13_4.psychomotor': 'Marked psychomotor restlessness or agitation',
      'f13_4.autonomic':
        'Marked autonomic overactivity (e.g. tachycardia, sweating, hypertension, coarse tremor); seizures possible',
      'f13_4.exclude_other_cause':
        'The delirium is not better explained by an independent physical illness',
    },
  },
  cocaine_acute_intoxication: {
    name: 'Acute cocaine intoxication',
    differentials: [
      'Withdrawal state (F14.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f14_0.use': 'Evidence of consumption',
      'f14_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f14_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_0.recent_use': 'Recent consumption of cocaine at a sufficiently high dose',
      'f14_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f14_0.euphoria_grandiosity': 'Euphoria, heightened self-esteem and pressured speech',
      'f14_0.hypervigilance': 'Hypervigilance, agitation and increased activity',
      'f14_0.autonomic': 'Tachycardia, raised blood pressure, pupillary dilation and sweating',
      'f14_0.stereotypies': 'Stereotyped movements or teeth grinding',
      'f14_0.paranoia': 'Suspiciousness, paranoid ideas or tactile misperceptions',
      'f14_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  cocaine_harmful_use: {
    name: 'Harmful use of cocaine',
    differentials: [
      'Dependence syndrome (F14.2)',
      'Acute intoxication (F14.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f14_1.harm': 'Consumption with damage to health',
      'f14_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_1.actual_use': 'Actual consumption of cocaine is documented',
      'f14_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f14_1.exclude_dependence':
        'The criteria for a dependence syndrome (F14.2) are not met',
    },
  },
  cocaine_dependence: {
    name: 'Cocaine dependence syndrome',
    differentials: [
      'Harmful use of cocaine (F14.1) without dependence',
      'Acute intoxication (F14.0)',
      'Substance-induced mood or psychotic disorder',
    ],
    groups: {
      'f14_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f14_2.craving': 'A strong desire or sense of compulsion to consume cocaine (craving)',
      'f14_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f14_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      'f14_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f14_2.neglect':
        'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      'f14_2.persistence_harm':
        'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  },
  cocaine_withdrawal: {
    name: 'Cocaine withdrawal state',
    differentials: [
      'Acute intoxication (F14.0)',
      'Withdrawal state with delirium (F14.4)',
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      'f14_3.context': 'Withdrawal context',
      'f14_3.symptoms': 'Withdrawal symptoms (at least 1)',
      'f14_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_3.cessation':
        'Cessation or reduction of cocaine after repeated, usually sustained and/or high-dose consumption',
      'f14_3.withdrawal_syndrome': 'A withdrawal state typical of the substance is present',
      'f14_3.dysphoria': 'Dysphoric, depressed mood (“crash”)',
      'f14_3.fatigue': 'Exhaustion and reduced drive',
      'f14_3.sleep': 'Increased need for sleep, or insomnia with vivid dreams',
      'f14_3.appetite': 'Increased appetite',
      'f14_3.craving': 'Strong craving for the substance',
      'f14_3.exclude_other_cause':
        'The symptoms are not better explained by another physical or mental disorder',
    },
  },
  cocaine_psychotic_disorder: {
    name: 'Cocaine-induced psychotic disorder',
    differentials: [
      'Schizophrenia or persistent delusional disorder',
      'Acute intoxication (F14.0) with psychotic phenomena',
      'Withdrawal state with delirium (F14.4)',
      'Mood disorder with psychotic symptoms',
    ],
    groups: {
      'f14_5.symptoms': 'Psychotic symptoms (at least 1)',
      'f14_5.context': 'Temporal relationship with consumption',
      'f14_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_5.hallucinations':
        'Hallucinations (frequently auditory or visual) that are not solely an expression of simple intoxication',
      'f14_5.delusions': 'Delusional ideas, frequently persecutory or referential delusions',
      'f14_5.temporal_relation':
        'Onset of the psychotic symptoms during or shortly after (usually within two weeks of) consumption of cocaine',
      'f14_5.partial_remission':
        'The symptoms typically remit at least partially within a limited period (on the order of weeks to a few months)',
      'f14_5.exclude_primary_psychosis':
        'The presentation is not better explained by a primary psychotic disorder and does not occur exclusively in the context of intoxication or withdrawal delirium',
    },
  },
  stimulants_acute_intoxication: {
    name: 'Acute intoxication with other stimulants, including caffeine',
    differentials: [
      'Withdrawal state (F15.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f15_0.use': 'Evidence of consumption',
      'f15_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f15_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_0.recent_use':
        'Recent consumption of other stimulants, including caffeine, at a sufficiently high dose',
      'f15_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f15_0.euphoria_energy': 'Euphoria, pressured speech and increased energy/alertness',
      'f15_0.insomnia': 'Insomnia and reduced need for sleep',
      'f15_0.autonomic':
        'Tachycardia, raised blood pressure, pupillary dilation; hyperthermia possible',
      'f15_0.agitation': 'Agitation, restlessness or aggressive behaviour',
      'f15_0.paranoia': 'Suspiciousness or paranoid ideas (at higher doses)',
      'f15_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  stimulants_harmful_use: {
    name: 'Harmful use of other stimulants, including caffeine',
    differentials: [
      'Dependence syndrome (F15.2)',
      'Acute intoxication (F15.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f15_1.harm': 'Consumption with damage to health',
      'f15_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_1.actual_use':
        'Actual consumption of other stimulants, including caffeine, is documented',
      'f15_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f15_1.exclude_dependence':
        'The criteria for a dependence syndrome (F15.2) are not met',
    },
  },
  stimulants_dependence: {
    name: 'Dependence syndrome due to other stimulants, including caffeine',
    differentials: [
      'Harmful use of other stimulants, including caffeine (F15.1), without dependence',
      'Acute intoxication (F15.0)',
      'Substance-induced mood or psychotic disorder',
    ],
    groups: {
      'f15_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f15_2.craving':
        'A strong desire or sense of compulsion to consume other stimulants, including caffeine (craving)',
      'f15_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f15_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      'f15_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f15_2.neglect':
        'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      'f15_2.persistence_harm':
        'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  },
  stimulants_withdrawal: {
    name: 'Withdrawal state due to other stimulants, including caffeine',
    differentials: [
      'Acute intoxication (F15.0)',
      'Withdrawal state with delirium (F15.4)',
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      'f15_3.context': 'Withdrawal context',
      'f15_3.symptoms': 'Withdrawal symptoms (at least 1)',
      'f15_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_3.cessation':
        'Cessation or reduction of other stimulants, including caffeine, after repeated, usually sustained and/or high-dose consumption',
      'f15_3.withdrawal_syndrome': 'A withdrawal state typical of the substance is present',
      'f15_3.fatigue': 'Marked tiredness and exhaustion',
      'f15_3.depressed_mood': 'Depressed mood and anhedonia',
      'f15_3.hypersomnia': 'Increased need for sleep',
      'f15_3.appetite': 'Increased appetite',
      'f15_3.caffeine_headache':
        'With caffeine: headache, tiredness and impaired concentration',
      'f15_3.exclude_other_cause':
        'The symptoms are not better explained by another physical or mental disorder',
    },
  },
  stimulants_psychotic_disorder: {
    name: 'Psychotic disorder induced by other stimulants, including caffeine',
    differentials: [
      'Schizophrenia or persistent delusional disorder',
      'Acute intoxication (F15.0) with psychotic phenomena',
      'Withdrawal state with delirium (F15.4)',
      'Mood disorder with psychotic symptoms',
    ],
    groups: {
      'f15_5.symptoms': 'Psychotic symptoms (at least 1)',
      'f15_5.context': 'Temporal relationship with consumption',
      'f15_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_5.hallucinations':
        'Hallucinations (frequently auditory or visual) that are not solely an expression of simple intoxication',
      'f15_5.delusions': 'Delusional ideas, frequently persecutory or referential delusions',
      'f15_5.temporal_relation':
        'Onset of the psychotic symptoms during or shortly after (usually within two weeks of) consumption of other stimulants, including caffeine',
      'f15_5.partial_remission':
        'The symptoms typically remit at least partially within a limited period (on the order of weeks to a few months)',
      'f15_5.exclude_primary_psychosis':
        'The presentation is not better explained by a primary psychotic disorder and does not occur exclusively in the context of intoxication or withdrawal delirium',
    },
  },
  hallucinogens_acute_intoxication: {
    name: 'Acute intoxication with hallucinogens',
    differentials: [
      'Withdrawal state (F16.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f16_0.use': 'Evidence of consumption',
      'f16_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f16_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f16_0.recent_use': 'Recent consumption of hallucinogens at a sufficiently high dose',
      'f16_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f16_0.perceptual_changes':
        'Altered perception with illusions, hallucinations or synaesthesiae, usually with preserved reality testing',
      'f16_0.depersonalization': 'Depersonalisation or derealisation experiences',
      'f16_0.anxiety_panic': 'Anxiety, panic or paranoid reaction (“bad trip”)',
      'f16_0.autonomic': 'Pupillary dilation, tachycardia and tremor',
      'f16_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  hallucinogens_harmful_use: {
    name: 'Harmful use of hallucinogens',
    differentials: [
      'Dependence syndrome (F16.2)',
      'Acute intoxication (F16.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f16_1.harm': 'Consumption with damage to health',
      'f16_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f16_1.actual_use': 'Actual consumption of hallucinogens is documented',
      'f16_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f16_1.exclude_dependence':
        'The criteria for a dependence syndrome (F16.2) are not met',
    },
  },
  hallucinogens_psychotic_disorder: {
    name: 'Hallucinogen-induced psychotic disorder',
    differentials: [
      'Schizophrenia or persistent delusional disorder',
      'Acute intoxication (F16.0) with psychotic phenomena',
      'Withdrawal state with delirium (F16.4)',
      'Mood disorder with psychotic symptoms',
    ],
    groups: {
      'f16_5.symptoms': 'Psychotic symptoms (at least 1)',
      'f16_5.context': 'Temporal relationship with consumption',
      'f16_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f16_5.hallucinations':
        'Hallucinations (frequently auditory or visual) that are not solely an expression of simple intoxication',
      'f16_5.delusions': 'Delusional ideas, frequently persecutory or referential delusions',
      'f16_5.temporal_relation':
        'Onset of the psychotic symptoms during or shortly after (usually within two weeks of) consumption of hallucinogens',
      'f16_5.partial_remission':
        'The symptoms typically remit at least partially within a limited period (on the order of weeks to a few months)',
      'f16_5.exclude_primary_psychosis':
        'The presentation is not better explained by a primary psychotic disorder and does not occur exclusively in the context of intoxication or withdrawal delirium',
    },
  },
  nicotine_harmful_use: {
    name: 'Harmful use of tobacco/nicotine',
    differentials: [
      'Dependence syndrome (F17.2)',
      'Acute intoxication (F17.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f17_1.harm': 'Consumption with damage to health',
      'f17_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f17_1.actual_use': 'Actual consumption of tobacco/nicotine is documented',
      'f17_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f17_1.exclude_dependence':
        'The criteria for a dependence syndrome (F17.2) are not met',
    },
  },
  nicotine_dependence: {
    name: 'Tobacco/nicotine dependence syndrome',
    differentials: [
      'Harmful use of tobacco/nicotine (F17.1) without dependence',
      'Acute intoxication (F17.0)',
      'Substance-induced mood or psychotic disorder',
    ],
    groups: {
      'f17_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f17_2.craving':
        'A strong desire or sense of compulsion to consume tobacco/nicotine (craving)',
      'f17_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f17_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      'f17_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f17_2.neglect':
        'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      'f17_2.persistence_harm':
        'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  },
  nicotine_withdrawal: {
    name: 'Tobacco/nicotine withdrawal state',
    differentials: [
      'Acute intoxication (F17.0)',
      'Withdrawal state with delirium (F17.4)',
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      'f17_3.context': 'Withdrawal context',
      'f17_3.symptoms': 'Withdrawal symptoms (at least 1)',
      'f17_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f17_3.cessation':
        'Cessation or reduction of tobacco/nicotine after repeated, usually sustained and/or high-dose consumption',
      'f17_3.withdrawal_syndrome': 'A withdrawal state typical of the substance is present',
      'f17_3.craving': 'Strong craving to smoke',
      'f17_3.irritability': 'Irritability, frustration or anger',
      'f17_3.anxiety': 'Anxiety or inner restlessness',
      'f17_3.concentration': 'Difficulty concentrating',
      'f17_3.restlessness': 'Restlessness',
      'f17_3.appetite': 'Increased appetite or weight gain',
      'f17_3.depressed_mood': 'Depressed mood',
      'f17_3.insomnia': 'Disturbed sleep',
      'f17_3.exclude_other_cause':
        'The symptoms are not better explained by another physical or mental disorder',
    },
  },
  volatile_solvents_acute_intoxication: {
    name: 'Acute intoxication with volatile solvents',
    differentials: [
      'Withdrawal state (F18.3)',
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      'f18_0.use': 'Evidence of consumption',
      'f18_0.signs': 'Signs of intoxication typical of the substance (at least 1)',
      'f18_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f18_0.recent_use': 'Recent consumption of volatile solvents at a sufficiently high dose',
      'f18_0.causal_link':
        'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      'f18_0.euphoria_disinhibition': 'Euphoria, disinhibition and apathy',
      'f18_0.dizziness': 'Dizziness and light-headedness',
      'f18_0.ataxia': 'Unsteadiness of gait (ataxia) and impaired coordination',
      'f18_0.slurred_speech': 'Slurred speech and blurred vision',
      'f18_0.lethargy': 'Lethargy, progressing to stupor or reduced level of consciousness',
      'f18_0.exclude_other_cause':
        'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
    },
  },
  volatile_solvents_harmful_use: {
    name: 'Harmful use of volatile solvents',
    differentials: [
      'Dependence syndrome (F18.2)',
      'Acute intoxication (F18.0)',
      'Low-risk use without identifiable harm',
    ],
    groups: {
      'f18_1.harm': 'Consumption with damage to health',
      'f18_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f18_1.actual_use': 'Actual consumption of volatile solvents is documented',
      'f18_1.health_damage':
        'Demonstrable damage to physical or mental health as a consequence of consumption',
      'f18_1.exclude_dependence':
        'The criteria for a dependence syndrome (F18.2) are not met',
    },
  },
  volatile_solvents_dependence: {
    name: 'Dependence syndrome due to volatile solvents',
    differentials: [
      'Harmful use of volatile solvents (F18.1) without dependence',
      'Acute intoxication (F18.0)',
      'Substance-induced mood or psychotic disorder',
    ],
    groups: {
      'f18_2.dependence': 'Features of dependence (at least 3 within a 12-month period)',
    },
    criteria: {
      'f18_2.craving':
        'A strong desire or sense of compulsion to consume volatile solvents (craving)',
      'f18_2.impaired_control':
        'Impaired capacity to control the onset, cessation and amount of consumption',
      'f18_2.withdrawal':
        'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      'f18_2.tolerance':
        'Development of tolerance, requiring increased doses to achieve the original effect',
      'f18_2.neglect':
        'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      'f18_2.persistence_harm':
        'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  },
}
