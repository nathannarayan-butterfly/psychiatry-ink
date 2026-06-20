/** Curated psychiatric diagnosis catalog with ICD-10 → ICD-11 / DSM-5 crosswalk. */

import type { UiLanguage } from '../types/settings'

export interface DiagnosisCatalogCoding {
  code: string
  /** German display label (source language). */
  label: string
  /** English display label — the standard published ICD/DSM category title. */
  label_en: string
}

export interface DiagnosisCatalogEntry {
  icd10: DiagnosisCatalogCoding
  icd11: DiagnosisCatalogCoding
  dsm: DiagnosisCatalogCoding
}

/** Pick the appropriate label for `lang`. Falls back to the German source. */
export function pickCatalogLabel(coding: DiagnosisCatalogCoding, lang: UiLanguage): string {
  if (lang === 'en') return coding.label_en || coding.label
  return coding.label
}

export const DIAGNOSIS_CATALOG: DiagnosisCatalogEntry[] = [
  {
    icd10: { code: 'F20.0', label: 'Paranoide Schizophrenie', label_en: 'Paranoid schizophrenia' },
    icd11: {
      code: '6A20.0',
      label: 'Schizophrenie, paranoider Typ',
      label_en: 'Schizophrenia, paranoid type',
    },
    dsm: {
      code: '295.90',
      label: 'Schizophrenie, paranoider Typ',
      label_en: 'Schizophrenia, paranoid type',
    },
  },
  {
    icd10: {
      code: 'F20.1',
      label: 'Hebephrene Schizophrenie',
      label_en: 'Hebephrenic schizophrenia',
    },
    icd11: {
      code: '6A20.1',
      label: 'Schizophrenie, desorganisierter Typ',
      label_en: 'Schizophrenia, disorganized type',
    },
    dsm: {
      code: '295.10',
      label: 'Schizophrenie, desorganisierter Typ',
      label_en: 'Schizophrenia, disorganized type',
    },
  },
  {
    icd10: { code: 'F20.2', label: 'Katatone Schizophrenie', label_en: 'Catatonic schizophrenia' },
    icd11: {
      code: '6A20.2',
      label: 'Schizophrenie, katatoner Typ',
      label_en: 'Schizophrenia, catatonic type',
    },
    dsm: {
      code: '295.20',
      label: 'Schizophrenie, katatoner Typ',
      label_en: 'Schizophrenia, catatonic type',
    },
  },
  {
    icd10: {
      code: 'F20.3',
      label: 'Undifferenzierte Schizophrenie',
      label_en: 'Undifferentiated schizophrenia',
    },
    icd11: {
      code: '6A20.3',
      label: 'Schizophrenie, undifferenzierter Typ',
      label_en: 'Schizophrenia, undifferentiated type',
    },
    dsm: {
      code: '295.90',
      label: 'Schizophrenie, undifferenzierter Typ',
      label_en: 'Schizophrenia, undifferentiated type',
    },
  },
  {
    icd10: { code: 'F20.5', label: 'Schizophrenes Residuum', label_en: 'Residual schizophrenia' },
    icd11: {
      code: '6A20.5',
      label: 'Schizophrenie, Residualzustand',
      label_en: 'Schizophrenia, residual state',
    },
    dsm: {
      code: '295.60',
      label: 'Schizophrenie, Residualzustand',
      label_en: 'Schizophrenia, residual type',
    },
  },
  {
    icd10: {
      code: 'F25.0',
      label: 'Schizoaffektive Störung, manische Form',
      label_en: 'Schizoaffective disorder, manic type',
    },
    icd11: {
      code: '6A21.0',
      label: 'Schizoaffektive Störung, manischer Typ',
      label_en: 'Schizoaffective disorder, manic type',
    },
    dsm: {
      code: '295.70',
      label: 'Schizoaffektive Störung, bipolare Typ',
      label_en: 'Schizoaffective disorder, bipolar type',
    },
  },
  {
    icd10: {
      code: 'F25.1',
      label: 'Schizoaffektive Störung, depressive Form',
      label_en: 'Schizoaffective disorder, depressive type',
    },
    icd11: {
      code: '6A21.1',
      label: 'Schizoaffektive Störung, depressiver Typ',
      label_en: 'Schizoaffective disorder, depressive type',
    },
    dsm: {
      code: '295.70',
      label: 'Schizoaffektive Störung, depressive Typ',
      label_en: 'Schizoaffective disorder, depressive type',
    },
  },
  {
    icd10: {
      code: 'F31.0',
      label: 'Bipolare affektive Störung, gegenwärtig manisch',
      label_en: 'Bipolar affective disorder, current episode manic',
    },
    icd11: {
      code: '6A60.0',
      label: 'Bipolare Störung I, manische Episode',
      label_en: 'Bipolar type I disorder, current episode manic',
    },
    dsm: {
      code: '296.41',
      label: 'Bipolare I-Störung, manische Episode',
      label_en: 'Bipolar I disorder, manic episode',
    },
  },
  {
    icd10: {
      code: 'F31.1',
      label: 'Bipolare affektive Störung, gegenwärtig manisch mit psychotischen Symptomen',
      label_en:
        'Bipolar affective disorder, current episode manic with psychotic symptoms',
    },
    icd11: {
      code: '6A60.1',
      label: 'Bipolare Störung I, manische Episode mit psychotischen Symptomen',
      label_en: 'Bipolar type I disorder, current episode manic with psychotic symptoms',
    },
    dsm: {
      code: '296.44',
      label: 'Bipolare I-Störung, manische Episode, schwer',
      label_en: 'Bipolar I disorder, manic episode, severe',
    },
  },
  {
    icd10: {
      code: 'F31.3',
      label: 'Bipolare affektive Störung, gegenwärtig leichte oder mittelgradige depressive Episode',
      label_en:
        'Bipolar affective disorder, current episode mild or moderate depression',
    },
    icd11: {
      code: '6A60.3',
      label: 'Bipolare Störung I, depressive Episode',
      label_en: 'Bipolar type I disorder, current episode depressive',
    },
    dsm: {
      code: '296.52',
      label: 'Bipolare I-Störung, depressive Episode',
      label_en: 'Bipolar I disorder, depressed episode',
    },
  },
  {
    icd10: {
      code: 'F31.5',
      label: 'Bipolare affektive Störung, gegenwärtig schwere depressive Episode',
      label_en: 'Bipolar affective disorder, current episode severe depression',
    },
    icd11: {
      code: '6A60.5',
      label: 'Bipolare Störung I, schwere depressive Episode',
      label_en: 'Bipolar type I disorder, current episode severe depression',
    },
    dsm: {
      code: '296.53',
      label: 'Bipolare I-Störung, schwere depressive Episode',
      label_en: 'Bipolar I disorder, severe depressed episode',
    },
  },
  {
    icd10: {
      code: 'F31.9',
      label: 'Bipolare affektive Störung, nicht näher bezeichnet',
      label_en: 'Bipolar affective disorder, unspecified',
    },
    icd11: {
      code: '6A60',
      label: 'Bipolare Störung I',
      label_en: 'Bipolar type I disorder',
    },
    dsm: { code: '296.80', label: 'Bipolare I-Störung', label_en: 'Bipolar I disorder' },
  },
  {
    icd10: { code: 'F32.0', label: 'Leichte depressive Episode', label_en: 'Mild depressive episode' },
    icd11: {
      code: '6A70.0',
      label: 'Depressive Episode, leicht',
      label_en: 'Depressive episode, mild',
    },
    dsm: {
      code: '296.21',
      label: 'Depressive Störung, einzelne Episode, leicht',
      label_en: 'Major depressive disorder, single episode, mild',
    },
  },
  {
    icd10: {
      code: 'F32.1',
      label: 'Mittelgradige depressive Episode',
      label_en: 'Moderate depressive episode',
    },
    icd11: {
      code: '6A70.1',
      label: 'Depressive Episode, mittelgradig',
      label_en: 'Depressive episode, moderate',
    },
    dsm: {
      code: '296.22',
      label: 'Depressive Störung, einzelne Episode, mittelgradig',
      label_en: 'Major depressive disorder, single episode, moderate',
    },
  },
  {
    icd10: {
      code: 'F32.2',
      label: 'Schwere depressive Episode ohne psychotische Symptome',
      label_en: 'Severe depressive episode without psychotic symptoms',
    },
    icd11: {
      code: '6A70.2',
      label: 'Depressive Episode, schwer',
      label_en: 'Depressive episode, severe',
    },
    dsm: {
      code: '296.23',
      label: 'Depressive Störung, einzelne Episode, schwer',
      label_en: 'Major depressive disorder, single episode, severe',
    },
  },
  {
    icd10: {
      code: 'F32.3',
      label: 'Schwere depressive Episode mit psychotischen Symptomen',
      label_en: 'Severe depressive episode with psychotic symptoms',
    },
    icd11: {
      code: '6A70.3',
      label: 'Depressive Episode mit psychotischen Symptomen',
      label_en: 'Depressive episode with psychotic symptoms',
    },
    dsm: {
      code: '296.24',
      label: 'Depressive Störung mit psychotischen Merkmalen',
      label_en: 'Major depressive disorder with psychotic features',
    },
  },
  {
    icd10: {
      code: 'F33.0',
      label: 'Rezidivierende depressive Störung, gegenwärtig leichte Episode',
      label_en: 'Recurrent depressive disorder, current episode mild',
    },
    icd11: {
      code: '6A71.0',
      label: 'Rezidivierende depressive Störung, leichte Episode',
      label_en: 'Recurrent depressive disorder, current episode mild',
    },
    dsm: {
      code: '296.31',
      label: 'Rezidivierende depressive Störung, leicht',
      label_en: 'Major depressive disorder, recurrent, mild',
    },
  },
  {
    icd10: {
      code: 'F33.1',
      label: 'Rezidivierende depressive Störung, gegenwärtig mittelgradige Episode',
      label_en: 'Recurrent depressive disorder, current episode moderate',
    },
    icd11: {
      code: '6A71.1',
      label: 'Rezidivierende depressive Störung, mittelgradige Episode',
      label_en: 'Recurrent depressive disorder, current episode moderate',
    },
    dsm: {
      code: '296.32',
      label: 'Rezidivierende depressive Störung, mittelgradig',
      label_en: 'Major depressive disorder, recurrent, moderate',
    },
  },
  {
    icd10: {
      code: 'F33.2',
      label: 'Rezidivierende depressive Störung, gegenwärtig schwere Episode',
      label_en: 'Recurrent depressive disorder, current episode severe',
    },
    icd11: {
      code: '6A71.2',
      label: 'Rezidivierende depressive Störung, schwere Episode',
      label_en: 'Recurrent depressive disorder, current episode severe',
    },
    dsm: {
      code: '296.33',
      label: 'Rezidivierende depressive Störung, schwer',
      label_en: 'Major depressive disorder, recurrent, severe',
    },
  },
  {
    icd10: { code: 'F34.0', label: 'Zyklothymie', label_en: 'Cyclothymia' },
    icd11: { code: '6A62', label: 'Zyklothymie', label_en: 'Cyclothymic disorder' },
    dsm: {
      code: '301.13',
      label: 'Zyklothymische Störung',
      label_en: 'Cyclothymic disorder',
    },
  },
  {
    icd10: { code: 'F40.0', label: 'Agrophobie', label_en: 'Agoraphobia' },
    icd11: { code: '6B02', label: 'Agrophobie', label_en: 'Agoraphobia' },
    dsm: { code: '300.22', label: 'Agrophobie', label_en: 'Agoraphobia' },
  },
  {
    icd10: { code: 'F40.1', label: 'Soziale Phobien', label_en: 'Social phobias' },
    icd11: {
      code: '6B04',
      label: 'Soziale Angststörung',
      label_en: 'Social anxiety disorder',
    },
    dsm: {
      code: '300.23',
      label: 'Soziale Angststörung',
      label_en: 'Social anxiety disorder',
    },
  },
  {
    icd10: { code: 'F41.0', label: 'Panikstörung', label_en: 'Panic disorder' },
    icd11: { code: '6B01', label: 'Panikstörung', label_en: 'Panic disorder' },
    dsm: { code: '300.01', label: 'Panikstörung', label_en: 'Panic disorder' },
  },
  {
    icd10: {
      code: 'F41.1',
      label: 'Generalisierte Angststörung',
      label_en: 'Generalized anxiety disorder',
    },
    icd11: {
      code: '6B00',
      label: 'Generalisierte Angststörung',
      label_en: 'Generalized anxiety disorder',
    },
    dsm: {
      code: '300.02',
      label: 'Generalisierte Angststörung',
      label_en: 'Generalized anxiety disorder',
    },
  },
  {
    icd10: {
      code: 'F42.0',
      label: 'Zwanghaftes Denken und Grübeln',
      label_en: 'Predominantly obsessional thoughts or ruminations',
    },
    icd11: {
      code: '6B20',
      label: 'Zwangsstörung',
      label_en: 'Obsessive-compulsive disorder',
    },
    dsm: {
      code: '300.3',
      label: 'Zwangsstörung',
      label_en: 'Obsessive-compulsive disorder',
    },
  },
  {
    icd10: {
      code: 'F43.0',
      label: 'Akute Belastungsreaktion',
      label_en: 'Acute stress reaction',
    },
    icd11: {
      code: '6B40',
      label: 'Akute Belastungsreaktion',
      label_en: 'Acute stress reaction',
    },
    dsm: {
      code: '308.3',
      label: 'Akute Belastungsstörung',
      label_en: 'Acute stress disorder',
    },
  },
  {
    icd10: {
      code: 'F43.1',
      label: 'Posttraumatische Belastungsstörung',
      label_en: 'Post-traumatic stress disorder',
    },
    icd11: {
      code: '6B41',
      label: 'Posttraumatische Belastungsstörung',
      label_en: 'Post-traumatic stress disorder',
    },
    dsm: {
      code: '309.81',
      label: 'Posttraumatische Belastungsstörung',
      label_en: 'Posttraumatic stress disorder',
    },
  },
  {
    icd10: { code: 'F43.2', label: 'Anpassungsstörungen', label_en: 'Adjustment disorders' },
    icd11: { code: '6B43', label: 'Anpassungsstörung', label_en: 'Adjustment disorder' },
    dsm: { code: '309.0', label: 'Anpassungsstörung', label_en: 'Adjustment disorder' },
  },
  {
    icd10: { code: 'F44.0', label: 'Dissoziative Amnesie', label_en: 'Dissociative amnesia' },
    icd11: { code: '6B64', label: 'Dissoziative Amnesie', label_en: 'Dissociative amnesia' },
    dsm: { code: '300.12', label: 'Dissoziative Amnesie', label_en: 'Dissociative amnesia' },
  },
  {
    icd10: {
      code: 'F45.0',
      label: 'Somatisierungsstörung',
      label_en: 'Somatization disorder',
    },
    icd11: {
      code: '6C20',
      label: 'Körperliche Belastungsstörung',
      label_en: 'Bodily distress disorder',
    },
    dsm: {
      code: '300.82',
      label: 'Körperliche Belastungsstörung',
      label_en: 'Somatic symptom disorder',
    },
  },
  {
    icd10: { code: 'F50.0', label: 'Anorexia nervosa', label_en: 'Anorexia nervosa' },
    icd11: { code: '6B80', label: 'Anorexia nervosa', label_en: 'Anorexia nervosa' },
    dsm: { code: '307.1', label: 'Anorexia nervosa', label_en: 'Anorexia nervosa' },
  },
  {
    icd10: { code: 'F50.2', label: 'Bulimia nervosa', label_en: 'Bulimia nervosa' },
    icd11: { code: '6B81', label: 'Bulimia nervosa', label_en: 'Bulimia nervosa' },
    dsm: { code: '307.51', label: 'Bulimia nervosa', label_en: 'Bulimia nervosa' },
  },
  {
    icd10: {
      code: 'F60.0',
      label: 'Emotional instabile Persönlichkeitsstörung',
      label_en: 'Emotionally unstable personality disorder',
    },
    icd11: {
      code: '6D10.0',
      label: 'Borderline-Persönlichkeitsstörung',
      label_en: 'Borderline personality disorder',
    },
    dsm: {
      code: '301.83',
      label: 'Borderline-Persönlichkeitsstörung',
      label_en: 'Borderline personality disorder',
    },
  },
  {
    icd10: {
      code: 'F60.1',
      label: 'Dissoziale Persönlichkeitsstörung',
      label_en: 'Dissocial personality disorder',
    },
    icd11: {
      code: '6D10.1',
      label: 'Dissoziale Persönlichkeitsstörung',
      label_en: 'Dissocial personality disorder',
    },
    dsm: {
      code: '301.7',
      label: 'Antisoziale Persönlichkeitsstörung',
      label_en: 'Antisocial personality disorder',
    },
  },
  {
    icd10: {
      code: 'F60.3',
      label: 'Emotional instabile Persönlichkeitsstörung, Borderline-Typ',
      label_en: 'Emotionally unstable personality disorder, borderline type',
    },
    icd11: {
      code: '6D10.3',
      label: 'Borderline-Persönlichkeitsstörung',
      label_en: 'Borderline personality disorder',
    },
    dsm: {
      code: '301.83',
      label: 'Borderline-Persönlichkeitsstörung',
      label_en: 'Borderline personality disorder',
    },
  },
  {
    icd10: {
      code: 'F10.2',
      label: 'Psychische und Verhaltensstörungen durch Alkohol : Abhängigkeitssyndrom',
      label_en:
        'Mental and behavioural disorders due to use of alcohol : Dependence syndrome',
    },
    icd11: { code: '6C40.2', label: 'Alkoholabhängigkeit', label_en: 'Alcohol dependence' },
    dsm: {
      code: '303.90',
      label: 'Alkoholgebrauchsstörung, schwer',
      label_en: 'Alcohol use disorder, severe',
    },
  },
  {
    icd10: {
      code: 'F11.2',
      label: 'Psychische und Verhaltensstörungen durch Opioide : Abhängigkeitssyndrom',
      label_en:
        'Mental and behavioural disorders due to use of opioids : Dependence syndrome',
    },
    icd11: { code: '6C43.2', label: 'Opioidabhängigkeit', label_en: 'Opioid dependence' },
    dsm: {
      code: '304.00',
      label: 'Opioidgebrauchsstörung, schwer',
      label_en: 'Opioid use disorder, severe',
    },
  },
  {
    icd10: {
      code: 'F12.2',
      label: 'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom',
      label_en:
        'Mental and behavioural disorders due to use of cannabinoids : Dependence syndrome',
    },
    icd11: { code: '6C41.2', label: 'Cannabisabhängigkeit', label_en: 'Cannabis dependence' },
    dsm: {
      code: '304.30',
      label: 'Cannabisgebrauchsstörung, schwer',
      label_en: 'Cannabis use disorder, severe',
    },
  },
  {
    icd10: {
      code: 'F15.2',
      label:
        'Psychische und Verhaltensstörungen durch andere Stimulanzien, einschließlich Koffein : Abhängigkeitssyndrom',
      label_en:
        'Mental and behavioural disorders due to use of other stimulants, including caffeine : Dependence syndrome',
    },
    icd11: {
      code: '6C45.2',
      label: 'Störungen durch Amphetamin oder ähnlich wirkende Substanzen, Abhängigkeitssyndrom',
      label_en:
        'Disorders due to use of amphetamines or other stimulants, dependence syndrome',
    },
    dsm: {
      code: '304.40',
      label: 'Stimulanziengebrauchsstörung, schwer',
      label_en: 'Stimulant use disorder, severe',
    },
  },
  {
    icd10: {
      code: 'F17.2',
      label: 'Psychische und Verhaltensstörungen durch Tabak : Abhängigkeitssyndrom',
      label_en:
        'Mental and behavioural disorders due to use of tobacco : Dependence syndrome',
    },
    icd11: { code: '6C4A.2', label: 'Tabakabhängigkeit', label_en: 'Nicotine dependence' },
    dsm: {
      code: '305.1',
      label: 'Tabakgebrauchsstörung, schwer',
      label_en: 'Tobacco use disorder, severe',
    },
  },
  {
    icd10: {
      code: 'F19.2',
      label:
        'Psychische und Verhaltensstörungen durch multiplen Substanzgebrauch und Verwendung anderer psychotroper Substanzen : Abhängigkeitssyndrom',
      label_en:
        'Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances : Dependence syndrome',
    },
    icd11: {
      code: '6C4E.2',
      label: 'Abhängigkeit von multiplen Substanzen',
      label_en: 'Dependence on multiple specified psychoactive substances',
    },
    dsm: {
      code: '304.90',
      label: 'Substanzgebrauchsstörung, schwer',
      label_en: 'Other (or unknown) substance use disorder, severe',
    },
  },
  {
    icd10: {
      code: 'F90.0',
      label: 'Aufmerksamkeitsdefizit-/Hyperaktivitätsstörung',
      label_en: 'Attention-deficit/hyperactivity disorder',
    },
    icd11: { code: '6A05', label: 'ADHS', label_en: 'Attention deficit hyperactivity disorder' },
    dsm: {
      code: '314.01',
      label: 'ADHS, kombinierte Präsentation',
      label_en: 'Attention-deficit/hyperactivity disorder, combined presentation',
    },
  },
  {
    icd10: { code: 'F84.0', label: 'Frühkindlicher Autismus', label_en: 'Childhood autism' },
    icd11: {
      code: '6A02.0',
      label: 'Autismus-Spektrum-Störung',
      label_en: 'Autism spectrum disorder',
    },
    dsm: {
      code: '299.00',
      label: 'Autismus-Spektrum-Störung',
      label_en: 'Autism spectrum disorder',
    },
  },
  {
    icd10: {
      code: 'F05.0',
      label: 'Delir ohne Demenz',
      label_en: 'Delirium not superimposed on dementia',
    },
    icd11: { code: '6D70', label: 'Delir', label_en: 'Delirium' },
    dsm: { code: '293.0', label: 'Delir', label_en: 'Delirium' },
  },
  {
    icd10: {
      code: 'F06.2',
      label: 'Organische halluzinatorische Störung',
      label_en: 'Organic hallucinatory disorder',
    },
    icd11: {
      code: '6E60',
      label: 'Psychotische Störung durch somatische Erkrankung',
      label_en: 'Secondary psychotic syndrome',
    },
    dsm: {
      code: '293.82',
      label: 'Psychotische Störung durch somatische Erkrankung',
      label_en: 'Psychotic disorder due to another medical condition',
    },
  },
]

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

export function searchDiagnosisCatalog(query: string, limit = 8): DiagnosisCatalogEntry[] {
  const q = normalizeQuery(query)
  if (!q) return []

  return DIAGNOSIS_CATALOG.filter((entry) => {
    const haystack = [
      entry.icd10.code,
      entry.icd10.label,
      entry.icd10.label_en,
      entry.icd11.code,
      entry.icd11.label,
      entry.icd11.label_en,
      entry.dsm.code,
      entry.dsm.label,
      entry.dsm.label_en,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q) || entry.icd10.code.toLowerCase().startsWith(q)
  }).slice(0, limit)
}

export function lookupByIcd10Code(code: string): DiagnosisCatalogEntry | undefined {
  const normalized = code.trim().toUpperCase()
  return DIAGNOSIS_CATALOG.find((e) => e.icd10.code.toUpperCase() === normalized)
}

/**
 * Bundled crosswalk label for interim display while WHO/API titles resolve.
 *
 * Pass `lang` to retrieve the localized title (English when `lang === 'en'`).
 * Defaults to German (the source language) for backwards compatibility with
 * call sites that have not yet wired through the active UI language.
 */
export function lookupCatalogLabel(
  code: string,
  system: 'icd10' | 'icd11' | 'dsm',
  lang: UiLanguage = 'de',
): string | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  for (const entry of DIAGNOSIS_CATALOG) {
    if (system === 'icd10' && entry.icd10.code.toUpperCase() === upper) {
      return pickCatalogLabel(entry.icd10, lang)
    }
    if (system === 'icd11' && entry.icd11.code.toUpperCase() === upper) {
      return pickCatalogLabel(entry.icd11, lang)
    }
    if (system === 'dsm' && entry.dsm.code.toUpperCase() === upper) {
      return pickCatalogLabel(entry.dsm, lang)
    }
  }
  return null
}
