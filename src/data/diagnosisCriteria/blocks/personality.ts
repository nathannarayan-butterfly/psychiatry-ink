import type { Criterion, Disorder, Icd11CriteriaSet } from '../schema'
import { UNKNOWN, met } from '../schema'
import { domainSignal } from '../predicateHelpers'

/**
 * Butterfly criteria block F6 — Persönlichkeits- und Verhaltensstörungen
 * (ICD-10 F60–F63), operationalized with ICD-11 crosswalks.
 *
 * LICENSING: every `text_de` is an ORIGINAL German operational paraphrase that
 * encodes clinical FACTS only (the existence of a trait, the enduring pattern,
 * onset, pervasiveness, the required exclusions). No ICD/DSM criterion wording
 * is reproduced. Each record cites the standard it was operationalized from via
 * `sourceRef` / `citation`.
 *
 * MAPPING NOTE: specific personality disorders are diagnosed from a clinician's
 * longitudinal appraisal of an enduring, pervasive trait pattern — not from a
 * single cross-sectional psychopathology finding. The ISDM phenomenology domains
 * capture state, not the longitudinal trait history, so the vast majority of
 * personality-disorder criteria are authored attestation-only
 * (`allowClinicianAttest: true`, no `operationalRule`, `mappingHints: []`). An
 * `operationalRule` is attached ONLY where a clean, conservative data mapping
 * exists (e.g. a documented interpersonal-style finding, self-harm under
 * `risk_self`, affective instability under `mood_affect`). This attestation-heavy
 * shape is EXPECTED and correct for F60 — completeness here means every disorder
 * and every field is populated, not that auto-rules are forced.
 *
 * ICD-11 NOTE: ICD-11 abolished the categorical personality-disorder subtypes in
 * favour of a severity grading (6D10: mild/moderate/severe) plus trait-domain
 * qualifiers (6D11). The categorical F60.x records below carry the closest ICD-11
 * trait-domain crosswalk; the dimensional model itself is captured separately in
 * `dimensionalPersonalityDisorder`.
 */

/**
 * Reusable "general criteria for a personality disorder" (ICD-10 F60 General).
 * Returned fresh per disorder so the criterion ids stay globally unique.
 */
function generalPersonalityGroup(prefix: string) {
  return {
    id: `${prefix}.general`,
    label_de: 'Allgemeine Kriterien einer Persönlichkeitsstörung (F60 General)',
    logic: 'all_of' as const,
    groupType: 'inclusion' as const,
    criteria: [
      {
        id: `${prefix}.general_deviation`,
        text_de:
          'Überdauerndes Muster von innerem Erleben und Verhalten, das deutlich von den Erwartungen der soziokulturellen Umgebung abweicht und sich in Kognition, Affektivität, Impulskontrolle oder im zwischenmenschlichen Verhalten zeigt',
        citation: [{ classification: 'icd10' as const, code: 'F60', ref: 'G1' }],
        mappingHints: [
          { kind: 'isdm_domain' as const, ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' },
        ],
        allowClinicianAttest: true,
        operationalRule: domainSignal(
          'personality_interpersonal_style',
          /pers[öo]nlichkeit|charakterz|[üu]berdauernd|zwischenmenschlich|beziehungsmuster|verhaltensmuster/i,
          /unauff[äa]llig|altersgerecht/i,
        ),
      },
      {
        id: `${prefix}.general_pervasive`,
        text_de:
          'Das abweichende Muster ist tiefgreifend und unflexibel über ein breites Spektrum persönlicher und sozialer Situationen hinweg (nicht auf eine einzelne Auslösesituation begrenzt)',
        citation: [{ classification: 'icd10' as const, code: 'F60', ref: 'G2' }],
        mappingHints: [],
        allowClinicianAttest: true,
      },
      {
        id: `${prefix}.general_distress`,
        text_de:
          'Das Muster führt zu persönlichem Leidensdruck und/oder zu deutlichen Beeinträchtigungen in sozialen, beruflichen oder anderen wichtigen Funktionsbereichen',
        citation: [{ classification: 'icd10' as const, code: 'F60', ref: 'G3' }],
        mappingHints: [{ kind: 'isdm_domain' as const, ref: 'functional_impairment' }],
        allowClinicianAttest: true,
        operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|leidensdruck|konflikt/i),
      },
      {
        id: `${prefix}.general_onset`,
        text_de:
          'Das Muster ist stabil und langdauernd und sein Beginn ist bis in die Adoleszenz oder das frühe Erwachsenenalter zurückzuverfolgen',
        citation: [{ classification: 'icd10' as const, code: 'F60', ref: 'G4' }],
        mappingHints: [{ kind: 'course' as const, ref: 'onset' }],
        allowClinicianAttest: true,
      },
      {
        id: `${prefix}.general_not_organic`,
        text_de:
          'Das Muster ist nicht Ausdruck oder Folge einer anderen psychischen Störung und nicht direkt durch eine Hirnerkrankung, -schädigung oder -funktionsstörung verursacht',
        citation: [{ classification: 'icd10' as const, code: 'F60', ref: 'G5/G6' }],
        mappingHints: [],
        allowClinicianAttest: true,
      },
    ],
  }
}

/**
 * ICD-11 DIMENSIONAL personality model, attached as the DISTINCT `icd11?` tree of
 * every categorical F60.x disorder below.
 *
 * ICD-11 abolishes the categorical subtypes: there is ONE Personality Disorder
 * (6D10) graded by SEVERITY (mild 6D10.0 / moderate 6D10.1 / severe 6D10.2), with
 * optional TRAIT-DOMAIN qualifiers (6D11.0 Negative Affectivity, 6D11.1
 * Detachment, 6D11.2 Dissociality, 6D11.3 Disinhibition, 6D11.4 Anankastia) and a
 * Borderline-pattern qualifier (6D11.5). Each categorical type therefore resolves
 * to the SAME general + severity structure plus the trait domain(s) that best
 * capture its old picture (see the per-disorder crosswalk comment on each
 * `icd11:` field). Personality Difficulty (QE50.7) is deliberately NOT coded as a
 * chapter-06 set.
 *
 * IDS: every ICD-11 id is 6xx-coded (`6d10_<slug>.*`, `6d11_<slug>.*`) — NEVER an
 * F-code — with a per-disorder `slug` so ids stay globally unique and distinct
 * from the ICD-10 `f60x.*` ids.
 */
type Icd11TraitKey =
  | 'negative_affectivity'
  | 'detachment'
  | 'dissociality'
  | 'disinhibition'
  | 'anankastia'
  | 'borderline_pattern'

/** A single 6D11 trait-domain qualifier criterion, id-prefixed per disorder. */
function icd11TraitCriterion(slug: string, key: Icd11TraitKey): Criterion {
  switch (key) {
    case 'negative_affectivity':
      return {
        id: `6d11_${slug}.negative_affectivity`,
        text_de:
          'Negative Affektivität: Neigung zu einem breiten Spektrum negativer Emotionen in unverhältnismäßiger Häufigkeit und Intensität (z. B. Ängstlichkeit, emotionale Labilität, Misstrauen, niedriger Selbstwert)',
        citation: [{ classification: 'icd11', code: '6D11.0' }],
        mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
        allowClinicianAttest: true,
        operationalRule: domainSignal('mood_affect', /labil|[äa]ngstlich|negativ.*affekt|reizbar|misstrau/i),
      }
    case 'detachment':
      return {
        id: `6d11_${slug}.detachment`,
        text_de:
          'Distanziertheit: Neigung zu sozialem und emotionalem Rückzug, eingeschränkter Beziehungsaufnahme und reduzierter Affektäußerung',
        citation: [{ classification: 'icd11', code: '6D11.1' }],
        mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
        allowClinicianAttest: true,
        operationalRule: domainSignal('personality_interpersonal_style', /distanziert|r[üu]ckzug|kontaktarm|verschlossen/i),
      }
    case 'dissociality':
      return {
        id: `6d11_${slug}.dissociality`,
        text_de:
          'Dissozialität: Missachtung der Rechte und Gefühle anderer, Selbstbezogenheit, mangelnde Empathie und fehlende Rücksichtnahme (auch durchgängiges Misstrauen/Geringschätzung anderer)',
        citation: [{ classification: 'icd11', code: '6D11.2' }],
        mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
        allowClinicianAttest: true,
        operationalRule: domainSignal(
          'personality_interpersonal_style',
          /dissozial|antisozial|empathiel|r[üu]cksichtslos|misstrau|herzlos/i,
        ),
      }
    case 'disinhibition':
      return {
        id: `6d11_${slug}.disinhibition`,
        text_de:
          'Enthemmung: Neigung zu impulsivem Handeln auf unmittelbare innere oder äußere Reize hin, ohne Berücksichtigung längerfristiger Konsequenzen',
        citation: [{ classification: 'icd11', code: '6D11.3' }],
        mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
        allowClinicianAttest: true,
        operationalRule: domainSignal('drive_psychomotor_activity', /impulsiv|enthemmt|unkontrolliert/i),
      }
    case 'anankastia':
      return {
        id: `6d11_${slug}.anankastia`,
        text_de:
          'Anankasmus: Fokus auf rigide Standards von Perfektion, Ordnung, Regelhaftigkeit und Kontrolle des eigenen und fremden Verhaltens',
        citation: [{ classification: 'icd11', code: '6D11.4' }],
        mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions' }],
        allowClinicianAttest: true,
        operationalRule: domainSignal('obsessions_compulsions', /perfektion|ordnung|kontroll|rigide|pedant/i),
      }
    case 'borderline_pattern':
      return {
        id: `6d11_${slug}.borderline_pattern`,
        text_de:
          'Borderline-Muster: durchgängige Instabilität von Selbstbild, Beziehungen und Affekt mit Impulsivität, Verlassenheitsangst und wiederkehrender Selbstschädigung',
        citation: [{ classification: 'icd11', code: '6D11.5' }],
        mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self' }],
        allowClinicianAttest: true,
        operationalRule: domainSignal('risk_self', /selbstverletz|suizid|svv|parasuizid/i),
      }
  }
}

/**
 * Build the DISTINCT ICD-11 dimensional criteria set for a categorical F60.x
 * disorder: the general 6D10 self/interpersonal dysfunction group, the 6D10
 * severity grading, the chosen 6D11 trait-domain qualifiers and the shared 6D10
 * exclusion. `slug` keeps every id globally unique and 6xx-coded.
 */
function icd11PersonalityDisorderSet(slug: string, traits: Icd11TraitKey[]): Icd11CriteriaSet {
  return {
    sourceRef: 'operationalisiert nach ICD-11 6D10 (Schweregrad) und 6D11 (Trait-Domänen-Qualifizierer)',
    groups: [
      {
        id: `6d10_${slug}.general`,
        label_de:
          'Allgemeine Kriterien der Persönlichkeitsstörung (ICD-11 6D10: Beeinträchtigung des Selbst- und/oder zwischenmenschlichen Funktionsniveaus)',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `6d10_${slug}.self_dysfunction`,
            text_de:
              'Beeinträchtigung von Aspekten des Selbst (Identität, Selbstwert, realistische Selbsteinschätzung, Selbststeuerung und Fähigkeit zur Zielsetzung)',
            citation: [{ classification: 'icd11', code: '6D10' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('self_experience_ego_disturbance', /identit[äa]t|selbstwert|selbststeuerung|selbstbild/i),
          },
          {
            id: `6d10_${slug}.interpersonal_dysfunction`,
            text_de:
              'Beeinträchtigung im zwischenmenschlichen Funktionsniveau (Aufbau und Aufrechterhalten naher, gegenseitig zufriedenstellender Beziehungen, Verständnis für die Sichtweise anderer, Umgang mit Konflikten)',
            citation: [{ classification: 'icd11', code: '6D10' }],
            mappingHints: [
              { kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' },
            ],
            allowClinicianAttest: true,
            operationalRule: domainSignal('personality_interpersonal_style', /beziehung|zwischenmenschlich|interpersonell|konflikt/i),
          },
          {
            id: `6d10_${slug}.duration_pervasive`,
            text_de:
              'Das Muster besteht über einen längeren Zeitraum (Größenordnung ≥ 2 Jahre), ist situationsübergreifend und tiefgreifend und nicht auf eine umschriebene Auslösesituation begrenzt',
            citation: [{ classification: 'icd11', code: '6D10' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `6d10_${slug}.severity`,
        label_de: 'Schweregradeinstufung (genau eine Stufe; 6D10)',
        logic: 'any_of',
        groupType: 'severity',
        criteria: [
          {
            id: `6d10_${slug}.severity_mild`,
            text_de:
              'Leichtgradig: Beeinträchtigungen einiger Funktionsbereiche des Selbst und/oder im zwischenmenschlichen Bereich bei erhaltener Funktionsfähigkeit in vielen Bereichen; in der Regel kein erhebliches Risiko für Selbst- oder Fremdschädigung (6D10.0)',
            citation: [{ classification: 'icd11', code: '6D10.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
          {
            id: `6d10_${slug}.severity_moderate`,
            text_de:
              'Mittelgradig: deutliche Probleme in mehreren Funktionsbereichen, ausgeprägte Beeinträchtigung der meisten zwischenmenschlichen Beziehungen und sozialen/beruflichen Rollen (6D10.1)',
            citation: [{ classification: 'icd11', code: '6D10.1' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
          {
            id: `6d10_${slug}.severity_severe`,
            text_de:
              'Schwergradig: schwerwiegende Beeinträchtigung des Selbst- und zwischenmenschlichen Funktionsniveaus über nahezu alle Lebensbereiche; häufig erhebliches Risiko für Selbst- oder Fremdschädigung (6D10.2)',
            citation: [{ classification: 'icd11', code: '6D10.2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `6d11_${slug}.traits`,
        label_de: 'Trait-Domänen-Qualifizierer (eine oder mehrere; 6D11)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: traits.map((t) => icd11TraitCriterion(slug, t)),
      },
      {
        id: `6d10_${slug}.exclusions`,
        label_de: 'Ausschlüsse / Abgrenzung',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `6d10_${slug}.not_better_explained`,
            text_de:
              'Die Auffälligkeiten sind nicht besser durch eine andere psychische Störung, eine Substanzwirkung oder eine Erkrankung des Nervensystems erklärbar und nicht entwicklungsphasentypisch oder soziokulturell normativ',
            citation: [{ classification: 'icd11', code: '6D10' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

/**
 * F60.0 — Paranoide Persönlichkeitsstörung.
 * ICD-11 crosswalk: 6D10 + Trait-Domänen Negative Affektivität / Distanziertheit.
 */
const paranoidPersonalityDisorder: Disorder = {
  id: 'paranoid_personality_disorder',
  classification: 'icd10',
  code: 'F60.0',
  name_de: 'Paranoide Persönlichkeitsstörung',
  crosswalkKey: 'F60.0',
  sourceRef: 'operationalisiert nach ICD-10 F60.0 / ICD-11 6D10 mit Trait-Qualifizierern (6D11)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.0', label_de: 'Paranoide Persönlichkeitsstörung' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Domäne Negative Affektivität/Distanziertheit (Misstrauen)' },
    dsm5tr: { code: '301.0', label_de: 'Paranoid Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Wahnhafte Störung / paranoide Schizophrenie (umschriebene psychotische Symptome)',
    'Schizoide oder schizotype Persönlichkeitsstörung',
    'Anhaltende paranoide Reaktion bei realer Belastung',
    'Substanzinduzierte paranoide Symptomatik',
  ],
  groups: [
    generalPersonalityGroup('f60_0'),
    {
      id: 'f60_0.features',
      label_de: 'Charakteristische Merkmale (mindestens 4)',
      logic: 'at_least_n_of',
      threshold: 4,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_0.suspiciousness',
          text_de: 'Durchgängiges Misstrauen und Neigung, das Handeln anderer als feindselig oder herabsetzend zu deuten, ohne ausreichende Belege',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /misstrau|argw[öo]hn|paranoid|feindselig.*deut|verfolgungs/i),
        },
        {
          id: 'f60_0.grudges',
          text_de: 'Nachtragendes Verhalten: anhaltender Groll, mangelnde Bereitschaft, Kränkungen oder Geringschätzungen zu verzeihen',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_0.distrust_loyalty',
          text_de: 'Wiederkehrende, unbegründete Zweifel an der Loyalität oder Vertrauenswürdigkeit von Freunden, Partnern oder Kollegen',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_0.reluctance_confide',
          text_de: 'Zurückhaltung, sich anderen anzuvertrauen, aus unbegründeter Furcht, die Information könne missbraucht werden',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_0.hidden_meanings',
          text_de: 'Tendenz, in harmlosen Bemerkungen oder Ereignissen verborgene erniedrigende oder bedrohliche Bedeutungen zu erkennen',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_0.self_reference',
          text_de: 'Übertriebenes Selbstbezogensein, häufig verbunden mit einem ausgeprägten Anspruchsdenken und streitsüchtigem Beharren auf eigenen Rechten',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_0.jealousy',
          text_de: 'Unberechtigter, hartnäckiger Verdacht hinsichtlich der sexuellen Treue des Partners',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f60_0.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_0.exclude_psychosis',
          text_de: 'Das Misstrauen tritt nicht ausschließlich im Rahmen einer schizophrenen oder anhaltenden wahnhaften Störung auf und erreicht keine umschriebene wahnhafte Qualität',
          citation: [{ classification: 'icd10', code: 'F60.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const delusion = ctx.present('delusions_overvalued_ideas', /wahn|verfolgungswahn|psychotisch/i)
            return delusion ? met(delusion.label) : UNKNOWN
          },
        },
      ],
    },
  ],
  // Crosswalk F60.0 → ICD-11 6D10 dimensional: durchgängiges Misstrauen/feindselige
  // Deutung anderer bilden sich am ehesten als Negative Affektivität (Misstrauen,
  // niedriger Selbstwert) + Dissozialität (Geringschätzung/Missachtung anderer) ab.
  icd11: icd11PersonalityDisorderSet('par', ['negative_affectivity', 'dissociality']),
}

/**
 * F60.1 — Schizoide Persönlichkeitsstörung.
 * ICD-11 crosswalk: 6D10 + Trait-Domäne Distanziertheit (Detachment).
 */
const schizoidPersonalityDisorder: Disorder = {
  id: 'schizoid_personality_disorder',
  classification: 'icd10',
  code: 'F60.1',
  name_de: 'Schizoide Persönlichkeitsstörung',
  crosswalkKey: 'F60.1',
  sourceRef: 'operationalisiert nach ICD-10 F60.1 / ICD-11 6D10 mit Trait-Qualifizierer Distanziertheit (6D11.1)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.1', label_de: 'Schizoide Persönlichkeitsstörung' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Trait-Domäne Distanziertheit' },
    dsm5tr: { code: '301.20', label_de: 'Schizoid Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Autismus-Spektrum-Störung (frühkindlicher Beginn, repetitive Muster)',
    'Schizotype Störung / Schizophrenie-Prodrom',
    'Paranoide Persönlichkeitsstörung',
    'Ängstlich-vermeidende Persönlichkeitsstörung (Rückzug aus Angst, nicht aus Desinteresse)',
    'Depressive Episode mit sozialem Rückzug',
  ],
  groups: [
    generalPersonalityGroup('f60_1'),
    {
      id: 'f60_1.features',
      label_de: 'Charakteristische Merkmale (mindestens 4)',
      logic: 'at_least_n_of',
      threshold: 4,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_1.anhedonia',
          text_de: 'Wenige bis keine Tätigkeiten bereiten Freude (eingeschränkte Fähigkeit, Vergnügen zu empfinden)',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /anhedon|freudlos|interessenverlust/i),
        },
        {
          id: 'f60_1.emotional_coldness',
          text_de: 'Emotionale Kühle, Distanziertheit oder abgeflachte Affektivität im zwischenmenschlichen Kontakt',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /distanziert|emotional\s+k[üu]hl|verschlossen|kontaktarm|zur[üu]ckgezogen/i),
        },
        {
          id: 'f60_1.limited_warmth',
          text_de: 'Eingeschränkte Fähigkeit, warme, zärtliche Gefühle oder auch Ärger gegenüber anderen auszudrücken',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_1.indifference_praise',
          text_de: 'Scheinbare Gleichgültigkeit gegenüber Lob oder Kritik durch andere',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_1.little_sexual_interest',
          text_de: 'Geringes Interesse an sexuellen Erfahrungen mit einer anderen Person',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_1.solitary',
          text_de: 'Deutliche Bevorzugung von Aktivitäten, die allein durchgeführt werden; nahezu durchgängige Wahl einsamer Beschäftigungen',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_1.no_close_friends',
          text_de: 'Wenige oder keine engen Freundschaften oder vertrauensvollen Beziehungen und fehlender Wunsch nach solchen',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_1.insensitive_norms',
          text_de: 'Unempfindlichkeit gegenüber geltenden sozialen Normen und Konventionen (unbeabsichtigtes Nichtbeachten)',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f60_1.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_1.exclude_asd_schizo',
          text_de: 'Der Rückzug ist nicht besser durch eine Autismus-Spektrum-Störung, eine schizotype Störung oder eine schizophrene Erkrankung erklärbar',
          citation: [{ classification: 'icd10', code: 'F60.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.1 → ICD-11 6D10 dimensional: emotionale Kühle, sozialer Rückzug
  // und Beziehungsdesinteresse bilden sich primär als Distanziertheit (6D11.1) ab.
  icd11: icd11PersonalityDisorderSet('szd', ['detachment']),
}

/**
 * F60.2 — Dissoziale (antisoziale) Persönlichkeitsstörung.
 * ICD-11 crosswalk: 6D10 + Trait-Domäne Dissozialität (6D11.2) / Enthemmung.
 */
const dissocialPersonalityDisorder: Disorder = {
  id: 'dissocial_personality_disorder',
  classification: 'icd10',
  code: 'F60.2',
  name_de: 'Dissoziale (antisoziale) Persönlichkeitsstörung',
  crosswalkKey: 'F60.2',
  sourceRef: 'operationalisiert nach ICD-10 F60.2 / ICD-11 6D10 mit Trait-Qualifizierer Dissozialität (6D11.2)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.2', label_de: 'Dissoziale Persönlichkeitsstörung' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Trait-Domäne Dissozialität' },
    dsm5tr: { code: '301.7', label_de: 'Antisocial Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Störung des Sozialverhaltens (vor dem 18. Lebensjahr)',
    'Manische oder hypomane Episode mit Enthemmung',
    'Substanzkonsumstörung mit dissozialem Verhalten unter Intoxikation',
    'Emotional instabile Persönlichkeitsstörung',
    'Sekundäres dissoziales Verhalten bei psychotischer Störung',
  ],
  groups: [
    generalPersonalityGroup('f60_2'),
    {
      id: 'f60_2.features',
      label_de: 'Charakteristische Merkmale (mindestens 3)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_2.callousness',
          text_de: 'Herzlose Unbekümmertheit gegenüber den Gefühlen anderer und Mangel an Empathie',
          citation: [{ classification: 'icd10', code: 'F60.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /empathiel|herzlos|gef[üu]hlskalt|r[üu]cksichtslos|dissozial|antisozial/i),
        },
        {
          id: 'f60_2.irresponsibility',
          text_de: 'Deutliche und andauernde Verantwortungslosigkeit sowie Missachtung sozialer Normen, Regeln und Verpflichtungen',
          citation: [{ classification: 'icd10', code: 'F60.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_2.unstable_relationships',
          text_de: 'Unfähigkeit, dauerhafte Beziehungen aufrechtzuerhalten, bei zugleich vorhandener Fähigkeit, Beziehungen einzugehen',
          citation: [{ classification: 'icd10', code: 'F60.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_2.low_frustration_aggression',
          text_de: 'Sehr geringe Frustrationstoleranz mit niedriger Schwelle für aggressives oder gewalttätiges Verhalten',
          citation: [{ classification: 'icd10', code: 'F60.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_others', /aggress|gewalt|fremdgef[äa]hrd|t[äa]tlich/i),
        },
        {
          id: 'f60_2.no_guilt',
          text_de: 'Fehlendes Schuldbewusstsein und Unfähigkeit, aus negativen Erfahrungen, insbesondere aus Bestrafung, zu lernen',
          citation: [{ classification: 'icd10', code: 'F60.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_2.blaming_others',
          text_de: 'Deutliche Neigung, andere zu beschuldigen oder vordergründige Rationalisierungen für das eigene Verhalten anzubieten',
          citation: [{ classification: 'icd10', code: 'F60.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_2.deceitfulness',
          text_de: 'Wiederholtes Lügen, Täuschen oder Manipulieren anderer zum eigenen Vorteil oder Vergnügen (ICD-11/DSM-Crosswalk)',
          citation: [{ classification: 'icd11', code: '6D10' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f60_2.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_2.exclude_mania_substance',
          text_de: 'Das Verhalten tritt nicht ausschließlich im Rahmen einer manischen Episode, einer schizophrenen Störung oder einer Substanzintoxikation auf',
          citation: [{ classification: 'icd10', code: 'F60.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.2 → ICD-11 6D10 dimensional: Empathiemangel, Missachtung von
  // Normen/Rechten anderer → Dissozialität (6D11.2); geringe Frustrationstoleranz
  // mit impulsiver Aggression → Enthemmung (6D11.3).
  icd11: icd11PersonalityDisorderSet('dsoc', ['dissociality', 'disinhibition']),
}

/**
 * F60.30 — Emotional instabile Persönlichkeitsstörung, impulsiver Typ.
 * ICD-11 crosswalk: 6D10 + Trait-Domäne Enthemmung / Negative Affektivität.
 */
const emotionallyUnstableImpulsive: Disorder = {
  id: 'emotionally_unstable_pd_impulsive',
  classification: 'icd10',
  code: 'F60.30',
  name_de: 'Emotional instabile Persönlichkeitsstörung, impulsiver Typ',
  crosswalkKey: 'F60.30',
  sourceRef: 'operationalisiert nach ICD-10 F60.30 / ICD-11 6D10 mit Trait-Qualifizierern Enthemmung und Negative Affektivität',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.30', label_de: 'Emotional instabile Persönlichkeitsstörung, impulsiver Typ' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Trait-Domänen Enthemmung/Negative Affektivität' },
    dsm5tr: { code: '301.83', label_de: 'Borderline Personality Disorder spectrum (Crosswalk)' },
  },
  differentials_de: [
    'Emotional instabile Persönlichkeitsstörung, Borderline-Typ (F60.31)',
    'Hypomane/manische Episode',
    'ADHS des Erwachsenenalters mit Impulsivität',
    'Substanzbedingte Enthemmung',
    'Dissoziale Persönlichkeitsstörung',
  ],
  groups: [
    generalPersonalityGroup('f60_30'),
    {
      id: 'f60_30.features',
      label_de: 'Charakteristische Merkmale (impulsiver Typ; mindestens 3, davon affektive Instabilität)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_30.impulsivity',
          text_de: 'Ausgeprägte Neigung, ohne Berücksichtigung der Konsequenzen unerwartet und impulsiv zu handeln',
          citation: [{ classification: 'icd10', code: 'F60.30' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /impulsiv|enthemmt|unkontrolliert\s+handeln/i),
        },
        {
          id: 'f60_30.quarrelsome',
          text_de: 'Ausgeprägte Neigung zu Streitereien und Konflikten mit anderen, vor allem wenn impulsive Handlungen unterbunden oder kritisiert werden',
          citation: [{ classification: 'icd10', code: 'F60.30' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_30.outbursts',
          text_de: 'Neigung zu Wut- oder Gewaltausbrüchen mit Unfähigkeit, das resultierende explosible Verhalten zu kontrollieren',
          citation: [{ classification: 'icd10', code: 'F60.30' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_others', /wutausbruch|aggress|gewalt|explosibel|impulsdurchbruch/i),
        },
        {
          id: 'f60_30.affective_instability',
          text_de: 'Unbeständige und launenhafte Stimmung mit rascher affektiver Auslenkbarkeit',
          citation: [{ classification: 'icd10', code: 'F60.30' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /affektlabil|stimmungsschwank|launenhaft|instabil|reizbar/i),
        },
        {
          id: 'f60_30.difficulty_planning',
          text_de: 'Schwierigkeiten, Handlungen vorausschauend zu planen und zu Ende zu führen, wenn diese keine unmittelbare Belohnung bieten',
          citation: [{ classification: 'icd10', code: 'F60.30' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f60_30.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_30.exclude_mania_substance',
          text_de: 'Die Impulsivität/affektive Labilität tritt nicht ausschließlich im Rahmen einer affektiven Episode oder einer Substanzwirkung auf',
          citation: [{ classification: 'icd10', code: 'F60.30' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.30 → ICD-11 6D10 dimensional: impulsives, konsequenzloses
  // Handeln und Wutdurchbrüche → Enthemmung (6D11.3); launenhafte, rasch
  // auslenkbare Stimmung → Negative Affektivität (6D11.0).
  icd11: icd11PersonalityDisorderSet('eui', ['disinhibition', 'negative_affectivity']),
}

/**
 * F60.31 — Emotional instabile Persönlichkeitsstörung, Borderline-Typ.
 * ICD-11 crosswalk: 6D11.5 Borderline-Muster (Borderline pattern).
 */
const emotionallyUnstableBorderline: Disorder = {
  id: 'emotionally_unstable_pd_borderline',
  classification: 'icd10',
  code: 'F60.31',
  name_de: 'Emotional instabile Persönlichkeitsstörung, Borderline-Typ',
  crosswalkKey: 'F60.31',
  sourceRef: 'operationalisiert nach ICD-10 F60.31 / ICD-11 6D10 mit Borderline-Muster-Qualifizierer 6D11.5',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.31', label_de: 'Emotional instabile Persönlichkeitsstörung, Borderline-Typ' },
    icd11: { code: '6D11.5', label_de: 'Borderline-Muster (Qualifizierer)' },
    dsm5tr: { code: '301.83', label_de: 'Borderline Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Emotional instabile Persönlichkeitsstörung, impulsiver Typ (F60.30)',
    'Bipolare affektive Störung (Episoden statt durchgängiger Instabilität)',
    'Komplexe posttraumatische Belastungsstörung',
    'Histrionische oder dissoziale Persönlichkeitsstörung',
    'Substanzkonsumstörung',
  ],
  groups: [
    generalPersonalityGroup('f60_31'),
    {
      id: 'f60_31.impulsive_core',
      label_de: 'Merkmale des impulsiven Typs (mindestens 2)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_31.impulsivity',
          text_de: 'Ausgeprägte Impulsivität mit Handeln ohne Berücksichtigung der Konsequenzen',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /impulsiv|enthemmt/i),
        },
        {
          id: 'f60_31.affective_instability',
          text_de: 'Unbeständige, rasch auslenkbare Stimmung mit ausgeprägter affektiver Labilität',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /affektlabil|stimmungsschwank|instabil|launenhaft/i),
        },
      ],
    },
    {
      id: 'f60_31.borderline_features',
      label_de: 'Borderline-Merkmale (mindestens 2)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_31.self_image',
          text_de: 'Störungen und Unsicherheit bezüglich Selbstbild, Zielen und inneren Präferenzen (einschließlich sexueller)',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('self_experience_ego_disturbance', /identit[äa]t|selbstbild|selbstunsicher|leeregef/i),
        },
        {
          id: 'f60_31.intense_unstable_relationships',
          text_de: 'Neigung, sich in intensive, aber instabile Beziehungen zu verstricken, häufig mit Wechsel zwischen Idealisierung und Entwertung',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /instabile?\s+beziehung|idealisier|entwert|beziehungsabbr/i),
        },
        {
          id: 'f60_31.abandonment',
          text_de: 'Übertriebene Bemühungen, ein reales oder befürchtetes Verlassenwerden zu vermeiden',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_31.self_harm',
          text_de: 'Wiederkehrende Suiziddrohungen oder selbstschädigende Handlungen (z. B. selbstverletzendes Verhalten)',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_self', /selbstverletz|suizid|parasuizid|svv|selbstsch[äa]dig/i),
        },
        {
          id: 'f60_31.chronic_emptiness',
          text_de: 'Anhaltendes Gefühl innerer Leere',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /innere\s+leere|leeregef|chronische\s+leere/i),
        },
        {
          id: 'f60_31.dissociation',
          text_de: 'Vorübergehende, belastungsabhängige paranoide Vorstellungen oder dissoziative Symptome (ICD-11/DSM-Crosswalk)',
          citation: [{ classification: 'icd11', code: '6D11.5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /dissoziat|depersonal|dereal|belastungsabh[äa]ngig.*paranoid/i),
        },
      ],
    },
    {
      id: 'f60_31.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_31.exclude_bipolar',
          text_de: 'Das Muster ist nicht besser durch eine bipolare affektive Störung mit umschriebenen Episoden erklärbar',
          citation: [{ classification: 'icd10', code: 'F60.31' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.31 → ICD-11 6D10 dimensional: Instabilität von Selbstbild,
  // Beziehungen und Affekt mit Verlassenheitsangst und Selbstschädigung →
  // Borderline-Muster (6D11.5); begleitende affektive Labilität → Negative
  // Affektivität (6D11.0).
  icd11: icd11PersonalityDisorderSet('bdl', ['borderline_pattern', 'negative_affectivity']),
}

/**
 * F60.4 — Histrionische Persönlichkeitsstörung.
 * ICD-11 crosswalk: 6D10 + Trait-Domänen Negative Affektivität / Dissozialität (Aufmerksamkeitssuche).
 */
const histrionicPersonalityDisorder: Disorder = {
  id: 'histrionic_personality_disorder',
  classification: 'icd10',
  code: 'F60.4',
  name_de: 'Histrionische Persönlichkeitsstörung',
  crosswalkKey: 'F60.4',
  sourceRef: 'operationalisiert nach ICD-10 F60.4 / ICD-11 6D10 mit Trait-Qualifizierern',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.4', label_de: 'Histrionische Persönlichkeitsstörung' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Trait-Domänen Negative Affektivität/Dissozialität' },
    dsm5tr: { code: '301.50', label_de: 'Histrionic Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Emotional instabile Persönlichkeitsstörung (Borderline-Typ)',
    'Dependente Persönlichkeitsstörung',
    'Narzisstische Persönlichkeitsstörung',
    'Manische/hypomane Episode',
  ],
  groups: [
    generalPersonalityGroup('f60_4'),
    {
      id: 'f60_4.features',
      label_de: 'Charakteristische Merkmale (mindestens 4)',
      logic: 'at_least_n_of',
      threshold: 4,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_4.dramatization',
          text_de: 'Übertriebener, theatralischer Gefühlsausdruck und Dramatisierung eigener Erlebnisse',
          citation: [{ classification: 'icd10', code: 'F60.4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /theatral|dramatisier|histrion|[üu]bertrieben.*gef[üu]hl/i),
        },
        {
          id: 'f60_4.suggestibility',
          text_de: 'Erhöhte Suggestibilität und leichte Beeinflussbarkeit durch andere oder durch Umstände',
          citation: [{ classification: 'icd10', code: 'F60.4' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_4.shallow_affect',
          text_de: 'Oberflächliche und labile Affektivität',
          citation: [{ classification: 'icd10', code: 'F60.4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /oberfl[äa]chlich|labil|affektlabil/i),
        },
        {
          id: 'f60_4.attention_seeking',
          text_de: 'Andauerndes Streben nach Aufregung, Anerkennung durch andere und Aktivitäten, in denen die Person im Mittelpunkt steht',
          citation: [{ classification: 'icd10', code: 'F60.4' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_4.seductiveness',
          text_de: 'Unangemessen verführerisches Erscheinungsbild oder Verhalten',
          citation: [{ classification: 'icd10', code: 'F60.4' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_4.appearance_focus',
          text_de: 'Übermäßige Beschäftigung mit der eigenen äußeren Attraktivität',
          citation: [{ classification: 'icd10', code: 'F60.4' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f60_4.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_4.exclude_other',
          text_de: 'Das Muster ist nicht besser durch eine affektive Episode oder eine andere Persönlichkeitsstörung erklärbar',
          citation: [{ classification: 'icd10', code: 'F60.4' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.4 → ICD-11 6D10 dimensional: dramatisierende Aufmerksamkeits-
  // und Anerkennungssuche, Selbstbezogenheit → Dissozialität (6D11.2,
  // Aufmerksamkeitssuche-Facette); oberflächlich-labile Affektivität → Negative
  // Affektivität (6D11.0).
  icd11: icd11PersonalityDisorderSet('his', ['dissociality', 'negative_affectivity']),
}

/**
 * F60.5 — Anankastische (zwanghafte) Persönlichkeitsstörung.
 * ICD-11 crosswalk: 6D10 + Trait-Domäne Anankasmus (Anankastia, 6D11.4).
 */
const anankasticPersonalityDisorder: Disorder = {
  id: 'anankastic_personality_disorder',
  classification: 'icd10',
  code: 'F60.5',
  name_de: 'Anankastische (zwanghafte) Persönlichkeitsstörung',
  crosswalkKey: 'F60.5',
  sourceRef: 'operationalisiert nach ICD-10 F60.5 / ICD-11 6D10 mit Trait-Qualifizierer Anankasmus (6D11.4)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.5', label_de: 'Anankastische Persönlichkeitsstörung' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Trait-Domäne Anankasmus' },
    dsm5tr: { code: '301.4', label_de: 'Obsessive-Compulsive Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Zwangsstörung (echte Zwangsgedanken/-handlungen, ich-dyston)',
    'Ängstlich-vermeidende Persönlichkeitsstörung',
    'Autismus-Spektrum-Störung mit Routinenbindung',
    'Depressive Episode mit Grübelneigung',
  ],
  groups: [
    generalPersonalityGroup('f60_5'),
    {
      id: 'f60_5.features',
      label_de: 'Charakteristische Merkmale (mindestens 4)',
      logic: 'at_least_n_of',
      threshold: 4,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_5.doubt_caution',
          text_de: 'Übermäßige Zweifel und Vorsicht bei Entscheidungen',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_5.preoccupation_detail',
          text_de: 'Ständige Beschäftigung mit Details, Regeln, Listen, Ordnung, Organisation oder Plänen, sodass der eigentliche Zweck verloren geht',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('obsessions_compulsions', /ordnung|perfektion|detail|kontroll|pedant|zwanghaft/i),
        },
        {
          id: 'f60_5.perfectionism',
          text_de: 'Perfektionismus, der die Fertigstellung von Aufgaben behindert',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_5.conscientiousness',
          text_de: 'Übermäßige Gewissenhaftigkeit und Skrupelhaftigkeit bei unverhältnismäßiger Leistungsbezogenheit unter Vernachlässigung von Vergnügen und Beziehungen',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_5.rigidity',
          text_de: 'Ausgeprägte Rigidität und Eigensinn bezüglich eigener Normen, Verfahren und moralischer Maßstäbe',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /rigide|starr|eigensinnig|unflexibel/i),
        },
        {
          id: 'f60_5.insistence_submission',
          text_de: 'Unangemessenes Bestehen darauf, dass sich andere genau den eigenen Gewohnheiten unterordnen, oder unbegründete Abneigung, andere Dinge tun zu lassen',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_5.intrusive_thoughts',
          text_de: 'Sich aufdrängende, hartnäckige Gedanken oder Handlungsimpulse ohne Erreichen der Schwere einer Zwangsstörung',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f60_5.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_5.exclude_ocd',
          text_de: 'Es liegen keine echten, ich-dystonen Zwangsgedanken oder -handlungen im Sinne einer Zwangsstörung (F42) vor',
          citation: [{ classification: 'icd10', code: 'F60.5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.5 → ICD-11 6D10 dimensional: Perfektionismus, Detail-/Regel-
  // versessenheit und rigide Kontrolle → Anankasmus (6D11.4) als führende
  // Trait-Domäne.
  icd11: icd11PersonalityDisorderSet('ana', ['anankastia']),
}

/**
 * F60.6 — Ängstliche (vermeidende) Persönlichkeitsstörung.
 * ICD-11 crosswalk: 6D10 + Trait-Domänen Negative Affektivität / Distanziertheit.
 */
const anxiousAvoidantPersonalityDisorder: Disorder = {
  id: 'anxious_avoidant_personality_disorder',
  classification: 'icd10',
  code: 'F60.6',
  name_de: 'Ängstliche (vermeidende) Persönlichkeitsstörung',
  crosswalkKey: 'F60.6',
  sourceRef: 'operationalisiert nach ICD-10 F60.6 / ICD-11 6D10 mit Trait-Qualifizierern Negative Affektivität/Distanziertheit',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.6', label_de: 'Ängstliche (vermeidende) Persönlichkeitsstörung' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Trait-Domänen Negative Affektivität/Distanziertheit' },
    dsm5tr: { code: '301.82', label_de: 'Avoidant Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Soziale Angststörung (situationsgebunden, nicht durchgängig)',
    'Schizoide Persönlichkeitsstörung (Rückzug aus Desinteresse statt Angst)',
    'Dependente Persönlichkeitsstörung',
    'Depressive Episode mit Rückzug',
  ],
  groups: [
    generalPersonalityGroup('f60_6'),
    {
      id: 'f60_6.features',
      label_de: 'Charakteristische Merkmale (mindestens 4)',
      logic: 'at_least_n_of',
      threshold: 4,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_6.tension_apprehension',
          text_de: 'Andauernde, durchgängige Gefühle von Anspannung und Besorgtheit',
          citation: [{ classification: 'icd10', code: 'F60.6' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /anspannung|besorg|[äa]ngstlich|nerv[öo]s/i),
        },
        {
          id: 'f60_6.feeling_inferior',
          text_de: 'Überzeugung, selbst sozial unbeholfen, unattraktiv oder anderen unterlegen zu sein',
          citation: [{ classification: 'icd10', code: 'F60.6' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('self_experience_ego_disturbance', /minderwertig|unterlegen|selbstwert/i),
        },
        {
          id: 'f60_6.preoccupation_criticism',
          text_de: 'Übermäßige Beschäftigung mit der Möglichkeit, in sozialen Situationen kritisiert oder abgelehnt zu werden',
          citation: [{ classification: 'icd10', code: 'F60.6' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_6.reluctance_without_acceptance',
          text_de: 'Abneigung, sich auf zwischenmenschliche Kontakte einzulassen, sofern keine sichere Gewähr für Akzeptanz besteht',
          citation: [{ classification: 'icd10', code: 'F60.6' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_6.restricted_lifestyle',
          text_de: 'Eingeschränkter Lebensstil aus dem Bedürfnis nach körperlicher Sicherheit heraus',
          citation: [{ classification: 'icd10', code: 'F60.6' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_6.avoidance_activities',
          text_de: 'Vermeidung beruflicher oder sozialer Aktivitäten mit bedeutsamem zwischenmenschlichem Kontakt aus Furcht vor Kritik, Missbilligung oder Ablehnung',
          citation: [{ classification: 'icd10', code: 'F60.6' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /vermeid|r[üu]ckzug|sozial.*[äa]ngst|kontaktvermeid/i),
        },
      ],
    },
    {
      id: 'f60_6.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_6.exclude_social_phobia',
          text_de: 'Das Muster ist durchgängig und überdauernd und nicht auf umschriebene phobische Situationen im Sinne einer sozialen Angststörung beschränkt',
          citation: [{ classification: 'icd10', code: 'F60.6' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.6 → ICD-11 6D10 dimensional: anhaltende Anspannung, Minder-
  // wertigkeits-/Kritikangst → Negative Affektivität (6D11.0); sozialer Rückzug
  // und Kontaktvermeidung → Distanziertheit (6D11.1).
  icd11: icd11PersonalityDisorderSet('avd', ['negative_affectivity', 'detachment']),
}

/**
 * F60.7 — Abhängige (dependente) Persönlichkeitsstörung.
 * ICD-11 crosswalk: 6D10 + Trait-Domäne Negative Affektivität (Dependenz).
 */
const dependentPersonalityDisorder: Disorder = {
  id: 'dependent_personality_disorder',
  classification: 'icd10',
  code: 'F60.7',
  name_de: 'Abhängige (dependente) Persönlichkeitsstörung',
  crosswalkKey: 'F60.7',
  sourceRef: 'operationalisiert nach ICD-10 F60.7 / ICD-11 6D10 mit Trait-Qualifizierer Negative Affektivität (Dependenz)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.7', label_de: 'Abhängige (asthenische) Persönlichkeitsstörung' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung mit Trait-Domäne Negative Affektivität (Dependenz)' },
    dsm5tr: { code: '301.6', label_de: 'Dependent Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Ängstlich-vermeidende Persönlichkeitsstörung',
    'Emotional instabile Persönlichkeitsstörung',
    'Depressive Episode mit Anklammerungstendenz',
    'Agoraphobie mit Begleitperson-Bedürfnis',
  ],
  groups: [
    generalPersonalityGroup('f60_7'),
    {
      id: 'f60_7.features',
      label_de: 'Charakteristische Merkmale (mindestens 4)',
      logic: 'at_least_n_of',
      threshold: 4,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f60_7.delegating_decisions',
          text_de: 'Aufforderung an andere oder Zulassen, dass andere die meisten wichtigen Entscheidungen des eigenen Lebens treffen',
          citation: [{ classification: 'icd10', code: 'F60.7' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /abh[äa]ngig|anklammer|unselbstst[äa]ndig|dependent|entscheidung.*andere/i),
        },
        {
          id: 'f60_7.subordination',
          text_de: 'Unterordnung eigener Bedürfnisse unter die der Personen, von denen man abhängig ist, und übermäßige Nachgiebigkeit gegenüber deren Wünschen',
          citation: [{ classification: 'icd10', code: 'F60.7' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_7.reluctance_demands',
          text_de: 'Mangelnde Bereitschaft, selbst angemessene Ansprüche gegenüber Bezugspersonen zu äußern',
          citation: [{ classification: 'icd10', code: 'F60.7' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_7.discomfort_alone',
          text_de: 'Unbehagen oder Hilflosigkeitsgefühle beim Alleinsein aus übertriebener Furcht, nicht für sich selbst sorgen zu können',
          citation: [{ classification: 'icd10', code: 'F60.7' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_7.fear_abandonment',
          text_de: 'Häufige Angst, von einer nahestehenden Person verlassen zu werden und auf sich allein gestellt zu sein',
          citation: [{ classification: 'icd10', code: 'F60.7' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f60_7.need_reassurance',
          text_de: 'Eingeschränkte Fähigkeit, alltägliche Entscheidungen ohne übermäßigen Rat und Zuspruch anderer zu treffen',
          citation: [{ classification: 'icd10', code: 'F60.7' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f60_7.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f60_7.exclude_depression_agora',
          text_de: 'Das Abhängigkeitsmuster ist überdauernd und nicht besser durch eine depressive Episode oder eine agoraphobe Störung erklärbar',
          citation: [{ classification: 'icd10', code: 'F60.7' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // Crosswalk F60.7 → ICD-11 6D10 dimensional: Anklammerung, Unterordnung und
  // Verlassenheits-/Trennungsangst → Negative Affektivität (6D11.0, Dependenz-
  // /Trennungsunsicherheits-Facette) als führende Trait-Domäne.
  icd11: icd11PersonalityDisorderSet('dep', ['negative_affectivity']),
}

/**
 * ICD-11 dimensionales Modell der Persönlichkeitsstörung.
 * Severity-Grading 6D10 (leicht/mittelgradig/schwer) + Trait-Domänen-Qualifizierer
 * 6D11 (Negative Affektivität, Distanziertheit, Dissozialität, Enthemmung, Anankasmus).
 * Vollständig attestationsbasiert — das dimensionale Schweregrad-/Trait-Urteil ist
 * eine klinische Längsschnitt-Einschätzung ohne sauberes Datenmapping.
 */
const dimensionalPersonalityDisorder: Disorder = {
  id: 'icd11_dimensional_personality_disorder',
  classification: 'icd11',
  code: '6D10',
  name_de: 'Persönlichkeitsstörung — dimensionales Modell (ICD-11)',
  crosswalkKey: 'F60.9',
  sourceRef: 'operationalisiert nach ICD-11 6D10 (Schweregrad) und 6D11 (Trait-Domänen-Qualifizierer)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F60.9', label_de: 'Persönlichkeitsstörung, nicht näher bezeichnet (Crosswalk)' },
    icd11: { code: '6D10', label_de: 'Persönlichkeitsstörung (dimensional: Schweregrad + Trait-Domänen)' },
  },
  differentials_de: [
    'Persönlichkeitsschwierigkeit (6D11.0, subklinisch)',
    'Vorübergehende belastungsreaktive Verhaltensänderung',
    'Andere primäre psychische Störung mit sekundären Persönlichkeitszügen',
    'Organische Persönlichkeitsstörung',
  ],
  groups: [
    {
      id: '6d10.core',
      label_de: 'Kern: überdauernde Persönlichkeitsfunktionsstörung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: '6d10.self_functioning',
          text_de: 'Anhaltende Beeinträchtigung von Aspekten des Selbst (z. B. Identität, Selbstwert, Selbststeuerung, Zielsetzung)',
          citation: [{ classification: 'icd11', code: '6D10' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('self_experience_ego_disturbance', /identit[äa]t|selbstwert|selbststeuerung|selbstbild/i),
        },
        {
          id: '6d10.interpersonal_functioning',
          text_de: 'Anhaltende Beeinträchtigung im zwischenmenschlichen Funktionsniveau (Aufbau und Aufrechterhalten naher, gegenseitig zufriedenstellender Beziehungen)',
          citation: [{ classification: 'icd11', code: '6D10' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /beziehung|zwischenmenschlich|interpersonell|konflikt/i),
        },
        {
          id: '6d10.duration_pervasive',
          text_de: 'Das Muster besteht über einen längeren Zeitraum (Größenordnung ≥ 2 Jahre) und zeigt sich situationsübergreifend',
          citation: [{ classification: 'icd11', code: '6D10' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
        },
        {
          id: '6d10.manifest_patterns',
          text_de: 'Die Störung manifestiert sich in maladaptiven Mustern von Kognition, emotionalem Erleben, Emotionsausdruck und Verhalten',
          citation: [{ classification: 'icd11', code: '6D10' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: '6d10.severity',
      label_de: 'Schweregradeinstufung (genau eine Stufe; 6D10)',
      logic: 'any_of',
      groupType: 'severity',
      criteria: [
        {
          id: '6d10.severity_mild',
          text_de: 'Leichte Persönlichkeitsstörung: Beeinträchtigungen einiger Funktionsbereiche, jedoch erhaltene Funktionsfähigkeit in vielen Bereichen; geringes Risiko für Selbst- oder Fremdschädigung (6D10.0)',
          citation: [{ classification: 'icd11', code: '6D10.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
        },
        {
          id: '6d10.severity_moderate',
          text_de: 'Mittelgradige Persönlichkeitsstörung: deutliche Probleme in mehreren Funktionsbereichen, ausgeprägte Beeinträchtigung in den meisten zwischenmenschlichen Beziehungen und sozialen/beruflichen Rollen (6D10.1)',
          citation: [{ classification: 'icd11', code: '6D10.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
        },
        {
          id: '6d10.severity_severe',
          text_de: 'Schwere Persönlichkeitsstörung: schwerwiegende Beeinträchtigung des Selbst- und zwischenmenschlichen Funktionsniveaus über nahezu alle Lebensbereiche; häufig erhebliches Risiko für Selbst- oder Fremdschädigung (6D10.2)',
          citation: [{ classification: 'icd11', code: '6D10.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: '6d11.trait_domains',
      label_de: 'Trait-Domänen-Qualifizierer (eine oder mehrere; 6D11)',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: '6d11.negative_affectivity',
          text_de: 'Negative Affektivität: Tendenz zu einem breiten Spektrum negativer Emotionen (Ängstlichkeit, emotionale Labilität, Misstrauen, niedriger Selbstwert) in unverhältnismäßiger Häufigkeit/Intensität (6D11.0)',
          citation: [{ classification: 'icd11', code: '6D11.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /labil|[äa]ngstlich|negativ.*affekt|reizbar|misstrau/i),
        },
        {
          id: '6d11.detachment',
          text_de: 'Distanziertheit: Tendenz zu sozialem und emotionalem Rückzug, eingeschränkter Beziehungsaufnahme und reduzierter Affektäußerung (6D11.1)',
          citation: [{ classification: 'icd11', code: '6D11.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /distanziert|r[üu]ckzug|kontaktarm|verschlossen/i),
        },
        {
          id: '6d11.dissociality',
          text_de: 'Dissozialität: Missachtung der Rechte und Gefühle anderer, Selbstbezogenheit, fehlende Empathie und mangelnde Rücksichtnahme (6D11.2)',
          citation: [{ classification: 'icd11', code: '6D11.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /dissozial|antisozial|empathiel|r[üu]cksichtslos/i),
        },
        {
          id: '6d11.disinhibition',
          text_de: 'Enthemmung: Tendenz zu impulsivem Handeln auf unmittelbare innere oder äußere Reize hin, ohne Berücksichtigung längerfristiger Konsequenzen (6D11.3)',
          citation: [{ classification: 'icd11', code: '6D11.3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /impulsiv|enthemmt|unkontrolliert/i),
        },
        {
          id: '6d11.anankastia',
          text_de: 'Anankasmus: Fokus auf rigide Standards von Perfektion, Ordnung und Kontrolle des eigenen und fremden Verhaltens (6D11.4)',
          citation: [{ classification: 'icd11', code: '6D11.4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('obsessions_compulsions', /perfektion|ordnung|kontroll|rigide|pedant/i),
        },
        {
          id: '6d11.borderline_pattern',
          text_de: 'Borderline-Muster: durchgängige Instabilität von Selbstbild, Beziehungen und Affekt mit Impulsivität, Verlassenheitsangst und wiederkehrender Selbstschädigung (6D11.5)',
          citation: [{ classification: 'icd11', code: '6D11.5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_self', /selbstverletz|suizid|svv|parasuizid/i),
        },
      ],
    },
    {
      id: '6d10.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: '6d10.exclude_other_organic',
          text_de: 'Die Auffälligkeiten sind nicht besser durch eine andere psychische Störung, eine Substanzwirkung oder eine Erkrankung des Nervensystems erklärbar und nicht entwicklungsphasentypisch oder soziokulturell normativ',
          citation: [{ classification: 'icd11', code: '6D10' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

/**
 * F63.0 — Pathologisches Spielen (Glücksspielstörung).
 * ICD-11 crosswalk: 6C50 (Gambling disorder).
 * icd10 == icd11: ICD-11 6C50 ist strukturell äquivalent (beeinträchtigte Kontrolle,
 * Priorisierung, Fortsetzung trotz Folgen); bereits in den ICD-10-`groups` über
 * 6C50-Zitate abgebildet → KEIN separates icd11-Set.
 */
const gamblingDisorder: Disorder = {
  id: 'gambling_disorder',
  classification: 'icd10',
  code: 'F63.0',
  name_de: 'Pathologisches Spielen (Glücksspielstörung)',
  crosswalkKey: 'F63.0',
  sourceRef: 'operationalisiert nach ICD-10 F63.0 / ICD-11 6C50',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F63.0', label_de: 'Pathologisches Spielen' },
    icd11: { code: '6C50', label_de: 'Glücksspielstörung (Gambling disorder)' },
    dsm5tr: { code: '312.31', label_de: 'Gambling Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Manische/hypomane Episode mit exzessivem Spielen',
    'Dissoziale Persönlichkeitsstörung mit Spielproblemen',
    'Spielen im Rahmen einer Substanzkonsumstörung',
    'Gewohnheitsmäßiges, sozial verträgliches Spielen ohne Kontrollverlust',
  ],
  groups: [
    {
      id: 'f63_0.core',
      label_de: 'Kern: wiederkehrendes, fehlangepasstes Spielverhalten',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 365 },
      criteria: [
        {
          id: 'f63_0.recurrent_gambling',
          text_de: 'Wiederholtes, anhaltendes Glücksspielverhalten, das fortgesetzt wird und sich trotz nachteiliger sozialer, beruflicher, materieller und familiärer Folgen intensiviert',
          citation: [{ classification: 'icd10', code: 'F63.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /spielen|gl[üu]cksspiel|gambling|spielsucht/i),
        },
        {
          id: 'f63_0.impaired_control',
          text_de: 'Beeinträchtigte Kontrolle über das Spielverhalten (Beginn, Häufigkeit, Intensität, Dauer, Beendigung)',
          citation: [{ classification: 'icd11', code: '6C50' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f63_0.priority',
          text_de: 'Das Spielen erhält zunehmenden Vorrang vor anderen Interessen und alltäglichen Verpflichtungen',
          citation: [{ classification: 'icd11', code: '6C50' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /vernachl[äa]ssig|beeintr[äa]chtig|vorrang|verpflichtung/i),
        },
        {
          id: 'f63_0.preoccupation',
          text_de: 'Gedankliche und drangvolle Vereinnahmung durch das Spielen sowie durch das Beschaffen der dafür nötigen Mittel',
          citation: [{ classification: 'icd10', code: 'F63.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f63_0.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f63_0.exclude_mania_dissocial',
          text_de: 'Das Spielverhalten tritt nicht ausschließlich im Rahmen einer manischen Episode auf und ist nicht durch eine dissoziale Persönlichkeitsstörung besser erklärt',
          citation: [{ classification: 'icd10', code: 'F63.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

/**
 * F63.1 — Pyromanie (pathologische Brandstiftung).
 * ICD-11 crosswalk: 6C70 (Pyromania).
 * icd10 == icd11: ICD-11 6C70 ist inhaltlich äquivalent (wiederholte Brandstiftung,
 * Faszination/Beschäftigung mit Feuer, Spannung-Erleichterungs-Zyklus) → KEIN
 * separates icd11-Set.
 */
const pyromania: Disorder = {
  id: 'pyromania',
  classification: 'icd10',
  code: 'F63.1',
  name_de: 'Pyromanie (pathologische Brandstiftung)',
  crosswalkKey: 'F63.1',
  sourceRef: 'operationalisiert nach ICD-10 F63.1 / ICD-11 6C70',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F63.1', label_de: 'Pathologische Brandstiftung (Pyromanie)' },
    icd11: { code: '6C70', label_de: 'Pyromanie' },
    dsm5tr: { code: '312.33', label_de: 'Pyromania (Crosswalk)' },
  },
  differentials_de: [
    'Vorsätzliche Brandstiftung aus Gewinnstreben, Rache oder politischer Motivation',
    'Brandstiftung im Rahmen einer dissozialen Persönlichkeitsstörung oder Störung des Sozialverhaltens',
    'Brandstiftung unter Intoxikation oder bei psychotischer Störung',
    'Brandstiftung bei Intelligenzminderung oder demenzieller Erkrankung',
  ],
  groups: [
    {
      id: 'f63_1.core',
      label_de: 'Kern: wiederkehrende Brandstiftung ohne nachvollziehbares Motiv',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f63_1.repeated_firesetting',
          text_de: 'Mehrfaches Legen oder versuchtes Legen von Bränden an Objekten oder Eigentum ohne erkennbares rationales Motiv',
          citation: [{ classification: 'icd10', code: 'F63.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_others', /brandstift|feuer\s+legen|pyroman|z[üu]ndeln/i),
        },
        {
          id: 'f63_1.preoccupation_fire',
          text_de: 'Intensive gedankliche Beschäftigung mit Feuer und Verbrennen sowie anhaltendes Interesse an allem, was mit Feuer zusammenhängt',
          citation: [{ classification: 'icd10', code: 'F63.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f63_1.tension_relief',
          text_de: 'Zunehmendes Spannungsgefühl vor der Tat und intensives Erleichterungs-, Erregungs- oder Befriedigungsgefühl während und unmittelbar nach dem Brandlegen',
          citation: [{ classification: 'icd10', code: 'F63.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f63_1.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f63_1.exclude_motivated_firesetting',
          text_de: 'Die Brandstiftung dient nicht einem materiellen Gewinn, der Rache, einer politischen Absicht oder der Verschleierung einer Straftat',
          citation: [{ classification: 'icd10', code: 'F63.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f63_1.exclude_other_disorder',
          text_de: 'Das Verhalten ist nicht besser durch eine dissoziale Persönlichkeitsstörung, eine psychotische Störung, eine Substanzintoxikation oder eine organische Störung erklärbar',
          citation: [{ classification: 'icd10', code: 'F63.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

/**
 * F63.2 — Kleptomanie (pathologisches Stehlen).
 * ICD-11 crosswalk: 6C71 (Kleptomania).
 * icd10 == icd11: ICD-11 6C71 ist inhaltlich äquivalent (Impulsdurchbruch zum
 * Stehlen ohne Bereicherungsabsicht, Spannung-Erleichterungs-Zyklus) → KEIN
 * separates icd11-Set.
 */
const kleptomania: Disorder = {
  id: 'kleptomania',
  classification: 'icd10',
  code: 'F63.2',
  name_de: 'Kleptomanie (pathologisches Stehlen)',
  crosswalkKey: 'F63.2',
  sourceRef: 'operationalisiert nach ICD-10 F63.2 / ICD-11 6C71',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F63.2', label_de: 'Pathologisches Stehlen (Kleptomanie)' },
    icd11: { code: '6C71', label_de: 'Kleptomanie' },
    dsm5tr: { code: '312.32', label_de: 'Kleptomania (Crosswalk)' },
  },
  differentials_de: [
    'Diebstahl aus persönlichem Gewinnstreben (gewöhnlicher Ladendiebstahl)',
    'Diebstahl im Rahmen einer dissozialen Persönlichkeitsstörung oder Störung des Sozialverhaltens',
    'Stehlen unter Intoxikation oder bei psychotischer/manischer Störung',
    'Stehlen bei demenzieller oder anderer organischer Störung',
  ],
  groups: [
    {
      id: 'f63_2.core',
      label_de: 'Kern: wiederholtes Stehlen ohne Bereicherungsabsicht',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f63_2.repeated_stealing',
          text_de: 'Wiederholtes Versagen, dem Impuls zum Stehlen von Gegenständen zu widerstehen, die nicht dem persönlichen Gebrauch oder dem materiellen Gewinn dienen',
          citation: [{ classification: 'icd10', code: 'F63.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /stehlen|diebstahl|kleptoman|impulsdurchbruch/i),
        },
        {
          id: 'f63_2.tension_relief',
          text_de: 'Zunehmendes Spannungsgefühl unmittelbar vor der Tat und Erleichterungs-, Befriedigungs- oder Lustgefühl während und nach dem Stehlen',
          citation: [{ classification: 'icd10', code: 'F63.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f63_2.no_personal_gain',
          text_de: 'Die gestohlenen Gegenstände werden nicht benötigt, häufig weggegeben, weggeworfen oder gehortet; das Stehlen erfolgt nicht aus Wut oder Rache',
          citation: [{ classification: 'icd10', code: 'F63.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f63_2.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f63_2.exclude_motivated_theft',
          text_de: 'Der Diebstahl erfolgt nicht zur Bereicherung und ist nicht besser durch eine dissoziale Persönlichkeitsstörung, eine manische Episode oder eine organische Störung erklärbar',
          citation: [{ classification: 'icd10', code: 'F63.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

/**
 * F63.3 — Trichotillomanie (pathologisches Haareausreißen).
 * ICD-11 crosswalk: 6B25.0 (Trichotillomania, im Block der zwangsbezogenen Störungen).
 * icd10 == icd11: ICD-11 6B25.0 ist inhaltlich äquivalent (wiederholtes Haareaus-
 * reißen mit Haarverlust, erfolglose Reduktionsversuche) → KEIN separates
 * icd11-Set.
 */
const trichotillomania: Disorder = {
  id: 'trichotillomania',
  classification: 'icd10',
  code: 'F63.3',
  name_de: 'Trichotillomanie (pathologisches Haareausreißen)',
  crosswalkKey: 'F63.3',
  sourceRef: 'operationalisiert nach ICD-10 F63.3 / ICD-11 6B25.0',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F63.3', label_de: 'Trichotillomanie' },
    icd11: { code: '6B25.0', label_de: 'Trichotillomanie (Body-focused repetitive behaviour)' },
    dsm5tr: { code: '312.39', label_de: 'Trichotillomania (Hair-Pulling Disorder) (Crosswalk)' },
  },
  differentials_de: [
    'Dermatologische Ursache des Haarverlusts (z. B. Alopecia areata)',
    'Haareausreißen als Reaktion auf Wahn oder Halluzination',
    'Stereotype Bewegungsstörung',
    'Körperdysmorphe Störung mit zupfendem Verhalten',
    'Zwangsstörung mit ritualisiertem Verhalten',
  ],
  groups: [
    {
      id: 'f63_3.core',
      label_de: 'Kern: wiederholtes Haareausreißen mit erkennbarem Haarverlust',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f63_3.hair_pulling',
          text_de: 'Wiederholtes Ausreißen eigener Haare, das zu deutlichem Haarverlust führt',
          citation: [{ classification: 'icd10', code: 'F63.3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('obsessions_compulsions', /haare?\s*ausrei|trichotillo|haarezupf/i),
        },
        {
          id: 'f63_3.failed_resistance',
          text_de: 'Wiederholte erfolglose Versuche, das Haareausreißen zu vermindern oder zu beenden',
          citation: [{ classification: 'icd11', code: '6B25.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f63_3.tension_relief',
          text_de: 'Zunehmendes Spannungsgefühl vor dem Ausreißen (oder beim Versuch, dem Impuls zu widerstehen) und Erleichterung oder Befriedigung danach',
          citation: [{ classification: 'icd10', code: 'F63.3' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f63_3.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f63_3.exclude_dermatological_psychotic',
          text_de: 'Der Haarverlust ist nicht durch eine entzündliche Hauterkrankung bedingt und das Ausreißen erfolgt nicht als Reaktion auf einen Wahn oder eine Halluzination',
          citation: [{ classification: 'icd10', code: 'F63.3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

export const personalityDisorders: Disorder[] = [
  paranoidPersonalityDisorder,
  schizoidPersonalityDisorder,
  dissocialPersonalityDisorder,
  emotionallyUnstableImpulsive,
  emotionallyUnstableBorderline,
  histrionicPersonalityDisorder,
  anankasticPersonalityDisorder,
  anxiousAvoidantPersonalityDisorder,
  dependentPersonalityDisorder,
  dimensionalPersonalityDisorder,
  gamblingDisorder,
  pyromania,
  kleptomania,
  trichotillomania,
]
