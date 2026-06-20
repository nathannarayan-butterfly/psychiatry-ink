/**
 * Auto-generated ICD-11 tree i18n patches — fills en/fr/es group labels and criterion
 * texts for native ICD-11 trees added in Phase B/C. Uses licensing-safe clinical
 * paraphrases (not verbatim WHO text).
 */
import { DISORDER_CRITERIA } from '../registry'
import type { DisorderTranslationMap } from './types'

type TargetLang = 'en' | 'fr' | 'es'

const PHRASES: Record<TargetLang, Array<[RegExp, string]>> = {
  en: [
    [/Störung von Bewusstsein und Aufmerksamkeit/g, 'Disturbance of consciousness and attention'],
    [/Kognitive Störung \(mindestens ein Bereich betroffen\)/g, 'Cognitive disturbance (at least one domain affected)'],
    [/Akuter Beginn und fluktuierender Verlauf/g, 'Acute onset and fluctuating course'],
    [/Ausschlüsse/g, 'Exclusions'],
    [/Nachweis einer zugrunde liegenden somatischen Ursache/g, 'Evidence of an underlying somatic cause'],
    [/Akuter Konsum und zeitlicher Zusammenhang/g, 'Acute consumption and temporal relationship'],
    [/Substanztypische Intoxikationszeichen \(mindestens 1\)/g, 'Substance-typical intoxication signs (at least 1)'],
    [/Entzugskontext/g, 'Withdrawal context'],
    [/Entzugssymptome \(mindestens 1\)/g, 'Withdrawal symptoms (at least 1)'],
    [/Substanzbezogener Entzug mit Bewusstseinsstörung/g, 'Substance-related withdrawal with disturbance of consciousness'],
    [/Delirante Begleitsymptome \(mindestens 1\)/g, 'Delirium-associated features (at least 1)'],
    [/Psychotische Symptome \(mindestens 1\)/g, 'Psychotic symptoms (at least 1)'],
    [/Zeitlicher Zusammenhang mit dem Konsum/g, 'Temporal relationship with consumption'],
    [/Demenzsyndrom/g, 'Dementia syndrome'],
    [/Ätiologische Hinweise/g, 'Aetiological indicators'],
    [/Ätiologische Zuordnung/g, 'Aetiological attribution'],
    [/Kernsymptome/g, 'Core symptoms'],
    [/Beeinträchtigung/g, 'Impairment'],
    [/mindestens/g, 'at least'],
    [/Verminderte Fähigkeit/g, 'Reduced ability'],
    [/Reduzierte Orientierung/g, 'Reduced orientation'],
    [/Gedächtnisstörung/g, 'Memory impairment'],
    [/Desorientiertheit/g, 'Disorientation'],
    [/Sprachstörung/g, 'Language disturbance'],
    [/Wahrnehmungsstörungen/g, 'Perceptual disturbances'],
    [/Entwickelt sich über einen kurzen Zeitraum/g, 'Develops over a short period'],
    [/fluktuierende/g, 'fluctuating'],
    [/nicht besser durch/g, 'not better explained by'],
    [/organische Ursache/g, 'organic cause'],
    [/Substanzintoxikation/g, 'substance intoxication'],
    [/Kurz zurückliegender Konsum/g, 'Recent consumption'],
    [/während oder unmittelbar nach/g, 'during or immediately after'],
    [/vorübergehend/g, 'transient'],
    [/Absetzen oder/g, 'Cessation or'],
    [/Entzugssyndrom/g, 'withdrawal syndrome'],
    [/Halluzinationen/g, 'Hallucinations'],
    [/Wahngedanken/g, 'Delusional ideas'],
    [/Dissoziales oder aggressives Verhaltensmuster/g, 'Dissocial or aggressive behavioural pattern'],
    [/Belastungsbezogener Kontext und dauerhafte Veränderung/g, 'Stress-related context and enduring change'],
    [/Klinische Symptomatik ohne ausreichende Spezifität/g, 'Clinical presentation without sufficient specificity'],
    [/Kernkriterien/g, 'Core criteria'],
  ],
  fr: [
    [/Störung von Bewusstsein und Aufmerksamkeit/g, 'Trouble de la conscience et de l’attention'],
    [/Kognitive Störung \(mindestens ein Bereich betroffen\)/g, 'Trouble cognitif (au moins un domaine touché)'],
    [/Akuter Beginn und fluktuierender Verlauf/g, 'Début aigu et évolution fluctuante'],
    [/Ausschlüsse/g, 'Exclusions'],
    [/Akuter Konsum und zeitlicher Zusammenhang/g, 'Consommation aiguë et relation temporelle'],
    [/Substanztypische Intoxikationszeichen \(mindestens 1\)/g, 'Signes d’intoxication typiques de la substance (au moins 1)'],
    [/Entzugskontext/g, 'Contexte de sevrage'],
    [/Entzugssymptome \(mindestens 1\)/g, 'Symptômes de sevrage (au moins 1)'],
    [/Psychotische Symptome \(mindestens 1\)/g, 'Symptômes psychotiques (au moins 1)'],
    [/Zeitlicher Zusammenhang mit dem Konsum/g, 'Relation temporelle avec la consommation'],
    [/Demenzsyndrom/g, 'Syndrome démentiel'],
    [/Ausschlüsse/g, 'Exclusions'],
    [/mindestens/g, 'au moins'],
    [/Beeinträchtigung/g, 'Atteinte'],
    [/nicht besser durch/g, 'mieux expliqué par'],
  ],
  es: [
    [/Störung von Bewusstsein und Aufmerksamkeit/g, 'Alteración de la conciencia y la atención'],
    [/Kognitive Störung \(mindestens ein Bereich betroffen\)/g, 'Alteración cognitiva (al menos un dominio afectado)'],
    [/Akuter Beginn und fluktuierender Verlauf/g, 'Inicio agudo y curso fluctuante'],
    [/Ausschlüsse/g, 'Exclusiones'],
    [/Akuter Konsum und zeitlicher Zusammenhang/g, 'Consumo agudo y relación temporal'],
    [/Substanztypische Intoxikationszeichen \(mindestens 1\)/g, 'Signos de intoxicación típicos de la sustancia (al menos 1)'],
    [/Entzugskontext/g, 'Contexto de abstinencia'],
    [/Entzugssymptome \(mindestens 1\)/g, 'Síntomas de abstinencia (al menos 1)'],
    [/Psychotische Symptome \(mindestens 1\)/g, 'Síntomas psicóticos (al menos 1)'],
    [/Zeitlicher Zusammenhang mit dem Konsum/g, 'Relación temporal con el consumo'],
    [/Demenzsyndrom/g, 'Síndrome demencial'],
    [/mindestens/g, 'al menos'],
    [/Beeinträchtigung/g, 'Deterioro'],
    [/nicht besser durch/g, 'no se explica mejor por'],
  ],
}

function translateClinical(textDe: string, lang: TargetLang): string {
  let out = textDe
  for (const [pattern, replacement] of PHRASES[lang]) {
    out = out.replace(pattern, replacement)
  }
  if (lang === 'en') {
    return out
      .replace(/\bder\b/g, 'the')
      .replace(/\bdie\b/g, 'the')
      .replace(/\bdas\b/g, 'the')
      .replace(/\bund\b/g, 'and')
      .replace(/\boder\b/g, 'or')
      .replace(/\bnicht\b/g, 'not')
      .replace(/\bist\b/g, 'is')
      .replace(/\bsind\b/g, 'are')
      .replace(/\bzw\. B\./g, 'e.g.')
      .replace(/\bPerson\b/g, 'person')
      .replace(/\bSymptome\b/g, 'symptoms')
      .replace(/\bStörung\b/g, 'disorder')
  }
  if (lang === 'fr') {
    return out
      .replace(/\bund\b/g, 'et')
      .replace(/\boder\b/g, 'ou')
      .replace(/\bnicht\b/g, 'non')
      .replace(/\bSymptome\b/g, 'symptômes')
  }
  if (lang === 'es') {
    return out
      .replace(/\bund\b/g, 'y')
      .replace(/\boder\b/g, 'o')
      .replace(/\bnicht\b/g, 'no')
      .replace(/\bSymptome\b/g, 'síntomas')
  }
  return out
}

/** Merge ICD-11 tree translation keys into an existing map (non-destructive). */
export function augmentIcd11TreeI18n(base: DisorderTranslationMap, lang: TargetLang): DisorderTranslationMap {
  const out: DisorderTranslationMap = { ...base }
  for (const disorder of DISORDER_CRITERIA) {
    if (!disorder.icd11?.groups?.length) continue
    const existing = out[disorder.id] ?? {
      name: disorder.name_de,
      differentials: [...disorder.differentials_de],
      groups: {},
      criteria: {},
    }
    const groups = { ...existing.groups }
    const criteria = { ...existing.criteria }
    for (const group of disorder.icd11.groups) {
      if (!groups[group.id]?.trim()) {
        groups[group.id] = translateClinical(group.label_de, lang)
      }
      for (const criterion of group.criteria) {
        if (!criteria[criterion.id]?.trim()) {
          criteria[criterion.id] = translateClinical(criterion.text_de, lang)
        }
      }
    }
    out[disorder.id] = { ...existing, groups, criteria }
  }
  return out
}
