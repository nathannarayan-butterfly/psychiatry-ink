import type { Disorder } from '../schema'
import { domainSignal, durationSignal } from '../predicateHelpers'

/**
 * F5 block — Verhaltensauffälligkeiten mit körperlichen Störungen und Faktoren
 * (Ess-, Schlaf-, sexuelle und puerperale Störungen).
 *
 * Operationalisiert nach ICD-10 F50–F53 (mit ICD-11-Crosswalk, wo eindeutig).
 *
 * LIZENZ: Jeder `text_de` ist eine ORIGINALE deutsche operationale Paraphrase.
 * Es werden ausschließlich klinische Fakten (Merkmalszahlen, Dauer, Schwellen)
 * kodiert — kein ICD-/DSM-Wortlaut übernommen. DSM nur als Code/Label-Crosswalk.
 *
 * Hinweise zur ICD-11-Reklassifikation:
 * - Schlaf-Wach-Störungen sind in ICD-11 in das eigene Kapitel 7 ausgelagert
 *   (z. B. 7A00/7A01 Insomnie, 7B00/7B01 Parasomnien) — sie sind dort KEINE
 *   psychischen Störungen mehr; Crosswalk entsprechend vermerkt.
 * - Sexuelle Funktionsstörungen sind in ICD-11 unter „Conditions related to
 *   sexual health“ (HA0x) geführt, nicht mehr im Kapitel der psychischen Störungen.
 * - Die Binge-Eating-Störung (6B82) hat keine eigene scharfe ICD-10-Kategorie und
 *   ist daher primär auf ICD-11 verankert (ICD-10-Näherung: F50.4).
 */

const anorexiaNervosa: Disorder = {
  id: 'anorexia_nervosa',
  classification: 'icd10',
  code: 'F50.0',
  name_de: 'Anorexia nervosa',
  crosswalkKey: 'F50.0',
  sourceRef: 'operationalisiert nach ICD-10 F50.0 / ICD-11 6B80',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F50.0', label_de: 'Anorexia nervosa' },
    icd11: { code: '6B80', label_de: 'Anorexia nervosa' },
    dsm5tr: { code: '307.1', label_de: 'Anorexia Nervosa (Crosswalk)' },
  },
  differentials_de: [
    'Bulimia nervosa (Gewicht meist normal oder erhöht)',
    'Körperliche Ursache von Gewichtsverlust (z. B. Malignom, Hyperthyreose, Malabsorption)',
    'Depressive Episode mit Appetitverlust',
    'Vermeidend-restriktive Essstörung (ARFID; ohne Körperschemastörung)',
  ],
  groups: [
    {
      id: 'f50_0.core',
      label_de: 'Kern: selbst herbeigeführtes Untergewicht mit Gewichtsphobie',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f50_0.low_weight',
          text_de: 'Deutlich zu niedriges Körpergewicht (z. B. BMI ≤ 17,5 kg/m² bei Erwachsenen bzw. Unterschreiten des erwarteten Gewichts im Wachstumsalter), selbst herbeigeführt',
          citation: [{ classification: 'icd10', code: 'F50.0', ref: 'A' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /untergewicht|bmi.*1[0-7]|kachex|stark.*abgenommen|gewichtsverlust/i),
        },
        {
          id: 'f50_0.self_induced_weight_loss',
          text_de: 'Aktive Gewichtsreduktion durch eingeschränkte Nahrungsaufnahme und/oder zusätzliche Maßnahmen (übermäßige Bewegung, Erbrechen, Abführmittel, Appetitzügler)',
          citation: [{ classification: 'icd10', code: 'F50.0', ref: 'B' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /nahrung.*einschr[äa]nk|fasten|di[äa]t|erbrechen|abf[üu]hr|[üu]berm[äa][ßs]ig.*bewegung|hungern/i),
        },
        {
          id: 'f50_0.body_image_distortion',
          text_de: 'Körperschemastörung mit überwertiger Angst, zu dick zu werden, und niedriger persönlicher Gewichtsschwelle',
          citation: [{ classification: 'icd10', code: 'F50.0', ref: 'C' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /k[öo]rperschema|figur|gewichtsphobie|angst.*dick|[üu]bersch[äa]tz.*k[öo]rper/i),
        },
      ],
    },
    {
      id: 'f50_0.endocrine',
      label_de: 'Endokrine/körperliche Folgemerkmale (mindestens 1)',
      logic: 'at_least_n_of',
      threshold: 1,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f50_0.endocrine_disturbance',
          text_de: 'Endokrine Störung (z. B. Amenorrhö, Libido-/Potenzverlust) oder verzögerte Pubertätsentwicklung als Folge der Mangelernährung',
          citation: [{ classification: 'icd10', code: 'F50.0', ref: 'D' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /amenorrh|ausbleiben.*regel|libidoverlust|hormonell|pubert[äa]t/i),
        },
      ],
    },
    {
      id: 'f50_0.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f50_0.exclude_organic',
          text_de: 'Das Untergewicht ist nicht durch eine andere körperliche Erkrankung erklärt, die zu Appetit- oder Gewichtsverlust führt',
          citation: [{ classification: 'icd10', code: 'F50.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const bulimiaNervosa: Disorder = {
  id: 'bulimia_nervosa',
  classification: 'icd10',
  code: 'F50.2',
  name_de: 'Bulimia nervosa',
  crosswalkKey: 'F50.2',
  sourceRef: 'operationalisiert nach ICD-10 F50.2 / ICD-11 6B81',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F50.2', label_de: 'Bulimia nervosa' },
    icd11: { code: '6B81', label_de: 'Bulimia nervosa' },
    dsm5tr: { code: '307.51', label_de: 'Bulimia Nervosa (Crosswalk)' },
  },
  differentials_de: [
    'Anorexia nervosa, Binge-Purging-Typ (bei deutlichem Untergewicht)',
    'Binge-Eating-Störung (ohne gegensteuernde Maßnahmen)',
    'Gastrointestinale Ursache von Erbrechen',
    'Depressive Episode mit Essanfällen',
  ],
  groups: [
    {
      id: 'f50_2.core',
      label_de: 'Kern: wiederkehrende Essanfälle mit Gegenmaßnahmen',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f50_2.binge_episodes',
          text_de: 'Wiederkehrende Essanfälle mit Aufnahme großer Nahrungsmengen in kurzer Zeit und subjektivem Kontrollverlust über das Essverhalten',
          citation: [{ classification: 'icd10', code: 'F50.2', ref: 'A' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /essanf[äa]ll|fressanf|hei[ßs]hunger|kontrollverlust.*essen|binge/i),
        },
        {
          id: 'f50_2.compensatory',
          text_de: 'Wiederholte gegensteuernde Maßnahmen zur Gewichtskontrolle (z. B. selbst herbeigeführtes Erbrechen, Abführmittel-/Diuretikamissbrauch, Fasten, exzessiver Sport)',
          citation: [{ classification: 'icd10', code: 'F50.2', ref: 'B' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /erbrechen|abf[üu]hr|diuretik|fasten|exzessiv.*sport|purg/i),
        },
        {
          id: 'f50_2.overvalued_weight',
          text_de: 'Übermäßige Beschäftigung mit Figur und Gewicht mit überwertiger Furcht vor Gewichtszunahme',
          citation: [{ classification: 'icd10', code: 'F50.2', ref: 'C' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /figur|gewicht.*angst|gewichtsphobie|angst.*zunahme|k[öo]rperschema/i),
        },
      ],
    },
    {
      id: 'f50_2.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f50_2.exclude_anorexia',
          text_de: 'Das Bild ist nicht besser durch eine Anorexia nervosa (Binge-Purging-Typ) mit deutlichem Untergewicht erklärt',
          citation: [{ classification: 'icd10', code: 'F50.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const bingeEatingDisorder: Disorder = {
  id: 'binge_eating_disorder',
  classification: 'icd11',
  code: '6B82',
  name_de: 'Binge-Eating-Störung',
  crosswalkKey: 'F50.4',
  sourceRef: 'operationalisiert nach ICD-11 6B82 (ICD-10-Näherung: F50.4 – Essattacken bei sonstigen psychischen Störungen)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F50.4', label_de: 'Essattacken bei sonstigen psychischen Störungen (Näherung)' },
    icd11: { code: '6B82', label_de: 'Binge-Eating-Störung' },
    dsm5tr: { code: '307.51', label_de: 'Binge-Eating Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Bulimia nervosa (mit regelmäßigen Gegenmaßnahmen)',
    'Adipositas ohne Essanfälle',
    'Depressive Episode mit Appetitsteigerung',
    'Nächtliches Esssyndrom',
  ],
  groups: [
    {
      id: 'f50_4.core',
      label_de: 'Kern: wiederkehrende Essanfälle ohne regelmäßige Gegenmaßnahmen',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'binge_eating.recurrent_binges',
          text_de: 'Wiederkehrende Essanfälle mit Aufnahme ungewöhnlich großer Nahrungsmengen und ausgeprägtem Kontrollverlust über das Essen',
          citation: [{ classification: 'icd11', code: '6B82' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /essanf[äa]ll|fressanf|kontrollverlust.*essen|binge|hei[ßs]hunger/i),
        },
        {
          id: 'binge_eating.distress',
          text_de: 'Deutliches Leiden im Zusammenhang mit den Essanfällen (z. B. Scham, Schuld, Ekel) ohne regelmäßige kompensatorische Maßnahmen',
          citation: [{ classification: 'icd11', code: '6B82' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /scham|schuld|ekel|leiden.*essen/i),
        },
      ],
    },
    {
      id: 'f50_4.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'binge_eating.exclude_compensatory',
          text_de: 'Es bestehen keine regelmäßigen gegensteuernden Maßnahmen, die eher für eine Bulimia nervosa sprechen würden',
          citation: [{ classification: 'icd11', code: '6B82' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const nonorganicInsomnia: Disorder = {
  id: 'nonorganic_insomnia',
  classification: 'icd10',
  code: 'F51.0',
  name_de: 'Nichtorganische Insomnie',
  crosswalkKey: 'F51.0',
  // ICD-11 verlagert Schlaf-Wach-Störungen in Kapitel 7; chronische Insomnie 7A00,
  // kurzzeitige Insomnie 7A01 — dort keine psychische Störung mehr.
  sourceRef: 'operationalisiert nach ICD-10 F51.0; ICD-11-Crosswalk 7A00/7A01 (Schlaf-Wach-Kapitel 7)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F51.0', label_de: 'Nichtorganische Insomnie' },
    icd11: { code: '7A00', label_de: 'Chronische Insomnie (ICD-11 Kapitel 7)' },
    dsm5tr: { code: '780.52', label_de: 'Insomnia Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Organische Schlafstörung (z. B. Schlafapnoe, Restless-Legs-Syndrom)',
    'Depressive Episode oder Angststörung mit Schlafstörung',
    'Substanz-/medikamenteninduzierte Insomnie',
    'Zirkadiane Schlaf-Wach-Rhythmusstörung',
  ],
  groups: [
    {
      id: 'f51_0.core',
      label_de: 'Kern: anhaltende Ein-/Durchschlafstörung mit Tagesbeeinträchtigung',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 28 },
      criteria: [
        {
          id: 'f51_0.sleep_complaint',
          text_de: 'Klagen über Einschlafstörungen, Durchschlafstörungen oder nicht erholsamen Schlaf an mehreren Nächten pro Woche',
          citation: [{ classification: 'icd10', code: 'F51.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /insomn|einschlaf|durchschlaf|schlafst[öo]r|nicht.*erholsam|schlaf.*reduziert/i),
        },
        {
          id: 'f51_0.duration',
          text_de: 'Die Schlafstörung besteht über einen längeren Zeitraum (Größenordnung ≥ 1 Monat)',
          citation: [{ classification: 'icd10', code: 'F51.0' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(28),
        },
        {
          id: 'f51_0.daytime_distress',
          text_de: 'Deutlicher Leidensdruck oder Beeinträchtigung der Tagesbefindlichkeit/Leistungsfähigkeit infolge der Schlafstörung',
          citation: [{ classification: 'icd10', code: 'F51.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /tagesm[üu]dig|ersch[öo]pf|beeintr[äa]cht|leistungsf[äa]hig|konzentration/i),
        },
      ],
    },
    {
      id: 'f51_0.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f51_0.exclude_organic',
          text_de: 'Die Schlafstörung ist nicht durch eine organische Schlaferkrankung, eine Substanzwirkung oder eine andere psychische Störung hinreichend erklärt',
          citation: [{ classification: 'icd10', code: 'F51.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const nightmareDisorder: Disorder = {
  id: 'nonorganic_nightmare_disorder',
  classification: 'icd10',
  code: 'F51.5',
  name_de: 'Albträume (nichtorganisch)',
  crosswalkKey: 'F51.5',
  // ICD-11: REM-assoziierte Parasomnien (Albtraumstörung) im Schlaf-Wach-Kapitel 7 (7B01).
  sourceRef: 'operationalisiert nach ICD-10 F51.5; ICD-11-Crosswalk 7B01 (REM-Parasomnien, Kapitel 7)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F51.5', label_de: 'Albträume (Angstträume)' },
    icd11: { code: '7B01', label_de: 'Parasomnien des REM-Schlafs (Albtraumstörung)' },
    dsm5tr: { code: '307.47', label_de: 'Nightmare Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Pavor nocturnus (Aufwachen ohne klare Trauminhalte, Non-REM)',
    'Posttraumatische Belastungsstörung mit traumaassoziierten Albträumen',
    'Medikamenten-/substanzinduzierte Albträume',
    'Nächtliche Panikattacken',
  ],
  groups: [
    {
      id: 'f51_5.core',
      label_de: 'Kern: wiederholte angstbesetzte Träume mit vollständigem Erwachen',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f51_5.nightmares',
          text_de: 'Wiederholtes Erwachen mit lebhafter, detaillierter Erinnerung an intensiv angstbesetzte Träume (typischerweise in der zweiten Nachthälfte)',
          citation: [{ classification: 'icd10', code: 'F51.5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /albtraum|alptraum|angsttr[äa]um|angstr[äa]um/i),
        },
        {
          id: 'f51_5.full_orientation',
          text_de: 'Nach dem Erwachen rasche Orientierung und Wachheit; deutlicher Leidensdruck durch die Träume',
          citation: [{ classification: 'icd10', code: 'F51.5' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f51_5.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f51_5.exclude_organic_substance',
          text_de: 'Die Albträume sind nicht hinreichend durch eine Substanz-/Medikamentenwirkung oder eine körperliche Erkrankung erklärt',
          citation: [{ classification: 'icd10', code: 'F51.5' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const sleepTerrors: Disorder = {
  id: 'nonorganic_sleep_terrors',
  classification: 'icd10',
  code: 'F51.4',
  name_de: 'Pavor nocturnus (Nachtangst)',
  crosswalkKey: 'F51.4',
  // ICD-11: Non-REM-Aufwachstörungen (Pavor nocturnus, Schlafwandeln) im Kapitel 7 (7B00).
  sourceRef: 'operationalisiert nach ICD-10 F51.4; ICD-11-Crosswalk 7B00 (Non-REM-Aufwachstörungen, Kapitel 7)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F51.4', label_de: 'Pavor nocturnus' },
    icd11: { code: '7B00', label_de: 'Aufwachstörungen aus dem Non-REM-Schlaf (Pavor nocturnus)' },
    dsm5tr: { code: '307.46', label_de: 'Sleep Terrors / Non-REM Arousal Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Albtraumstörung (lebhafte Traumerinnerung, vollständiges Erwachen)',
    'Nächtliche epileptische Anfälle',
    'Schlafwandeln (Somnambulismus)',
    'Nächtliche Panikattacken',
  ],
  groups: [
    {
      id: 'f51_4.core',
      label_de: 'Kern: episodisches panikartiges Erwachen aus dem Tiefschlaf',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f51_4.terror_episodes',
          text_de: 'Wiederholte Episoden plötzlichen panikartigen Hochschreckens aus dem Schlaf (meist erstes Nachtdrittel) mit Angstschrei, vegetativer Übererregung und schwerer Erweckbarkeit',
          citation: [{ classification: 'icd10', code: 'F51.4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /pavor|nachtschreck|nachtangst|panikartig.*schlaf|hochschreck/i),
        },
        {
          id: 'f51_4.amnesia',
          text_de: 'Weitgehende Amnesie für die Episode; die Person ist während des Geschehens nur schwer beruhigbar und kaum ansprechbar',
          citation: [{ classification: 'icd10', code: 'F51.4' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f51_4.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f51_4.exclude_organic',
          text_de: 'Die Episoden sind nicht durch eine organische Erkrankung (z. B. nächtliche Epilepsie) oder eine Substanzwirkung erklärt',
          citation: [{ classification: 'icd10', code: 'F51.4' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const sexualDysfunction: Disorder = {
  id: 'nonorganic_sexual_dysfunction',
  classification: 'icd10',
  code: 'F52',
  name_de: 'Sexuelle Funktionsstörung, nicht organisch verursacht',
  crosswalkKey: 'F52',
  // ICD-11 führt sexuelle Funktionsstörungen unter „Conditions related to sexual
  // health“ (HA00–HA0z), nicht mehr im Kapitel der psychischen Störungen.
  sourceRef: 'operationalisiert nach ICD-10 F52; ICD-11 reklassifiziert unter HA0x (Conditions related to sexual health)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F52', label_de: 'Nichtorganische sexuelle Funktionsstörungen' },
    icd11: { code: 'HA00', label_de: 'Sexuelle Funktionsstörungen (ICD-11 sexuelle Gesundheit, HA0x)' },
    dsm5tr: { code: '302.7x', label_de: 'Sexual Dysfunctions (Crosswalk)' },
  },
  differentials_de: [
    'Organisch/medizinisch bedingte sexuelle Funktionsstörung (z. B. vaskulär, endokrin, neurologisch)',
    'Medikamenten-/substanzinduzierte sexuelle Funktionsstörung',
    'Depressive Episode oder Angststörung mit sekundärer Funktionsstörung',
    'Partnerschafts-/Beziehungskonflikt als primäre Ursache',
  ],
  groups: [
    {
      id: 'f52.core',
      label_de: 'Kern: anhaltende sexuelle Funktionsstörung ohne ausreichende organische Erklärung',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f52.desire_arousal',
          text_de: 'Anhaltender Mangel oder Verlust von sexuellem Verlangen bzw. gestörte sexuelle Erregung (z. B. Erektions- oder Lubrikationsstörung)',
          citation: [{ classification: 'icd10', code: 'F52' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f52.orgasm',
          text_de: 'Orgasmusstörung (Ausbleiben, deutliche Verzögerung) oder vorzeitiger/verzögerter Samenerguss',
          citation: [{ classification: 'icd10', code: 'F52' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f52.pain',
          text_de: 'Sexuell bedingte Schmerzen oder Funktionsstörung (z. B. Vaginismus, nichtorganische Dyspareunie)',
          citation: [{ classification: 'icd10', code: 'F52' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f52.qualifiers',
      label_de: 'Bedingungen',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f52.persistent_distress',
          text_de: 'Die Störung besteht häufig oder anhaltend und verhindert eine vom Betroffenen gewünschte sexuelle Beziehung bzw. verursacht deutlichen Leidensdruck',
          citation: [{ classification: 'icd10', code: 'F52' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f52.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f52.exclude_organic',
          text_de: 'Die Funktionsstörung ist nicht überwiegend durch eine körperliche Erkrankung, Medikamente oder Substanzen verursacht',
          citation: [{ classification: 'icd10', code: 'F52' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const puerperalDisorder: Disorder = {
  id: 'puerperal_mental_disorder',
  classification: 'icd10',
  code: 'F53',
  name_de: 'Psychische Störung im Wochenbett (Puerperium)',
  crosswalkKey: 'F53',
  sourceRef: 'operationalisiert nach ICD-10 F53 / ICD-11 6E20–6E21',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F53', label_de: 'Psychische/Verhaltensstörungen im Wochenbett' },
    icd11: { code: '6E20', label_de: 'Mit Schwangerschaft/Geburt/Puerperium assoziierte psychische Störung' },
    dsm5tr: { code: '648.4', label_de: 'Peripartum-Onset specifier (Crosswalk)' },
  },
  differentials_de: [
    'Eigenständige depressive Episode oder Psychose mit peripartalem Beginn',
    '„Baby Blues“ (leicht, selbstlimitierend, ohne Krankheitswert)',
    'Schilddrüsen- oder andere körperliche Ursache postpartal',
    'Bipolare Störung mit postpartaler Episode',
  ],
  groups: [
    {
      id: 'f53.core',
      label_de: 'Kern: psychische Störung mit Beginn im Wochenbett',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f53.postpartum_onset',
          text_de: 'Beginn einer relevanten psychischen Störung in engem zeitlichem Zusammenhang mit der Entbindung (in der Regel innerhalb von etwa sechs Wochen postpartal)',
          citation: [{ classification: 'icd10', code: 'F53' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f53.clinical_syndrome',
          text_de: 'Vorliegen eines klinisch bedeutsamen psychischen Syndroms (z. B. depressiv, ängstlich oder psychotisch) mit Krankheitswert über einen reinen „Baby Blues“ hinaus',
          citation: [{ classification: 'icd10', code: 'F53' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /depress|niedergeschlagen|angst|hoffnungslos|[üu]berfordert/i, /euthym/i),
        },
      ],
    },
    {
      id: 'f53.severity',
      label_de: 'Schweregrad-/Typisierungsmerkmale (mindestens 1)',
      logic: 'at_least_n_of',
      threshold: 1,
      groupType: 'severity',
      criteria: [
        {
          id: 'f53.psychotic_features',
          text_de: 'Psychotische Merkmale (Wahn, Halluzinationen, schwere Desorganisation) im Sinne einer postpartalen Psychose (ICD-11 6E21)',
          citation: [
            { classification: 'icd10', code: 'F53.1' },
            { classification: 'icd11', code: '6E21' },
          ],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('perception_hallucinations', /halluzin|wahn|psychotisch|stimmen/i),
        },
        {
          id: 'f53.nonpsychotic_features',
          text_de: 'Nichtpsychotische Symptomatik (z. B. postpartale Depression mit Erschöpfung, Schuldgefühlen, Sorge um das Kind; ICD-11 6E20)',
          citation: [
            { classification: 'icd10', code: 'F53.0' },
            { classification: 'icd11', code: '6E20' },
          ],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /depress|schuld|ersch[öo]pf|sorge.*kind|niedergeschlagen/i),
        },
        {
          id: 'f53.risk',
          text_de: 'Hinweise auf Eigen- oder Fremdgefährdung (einschließlich Gedanken, dem Kind zu schaden) — erfordert besondere Beachtung',
          citation: [{ classification: 'icd10', code: 'F53' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_self', /suizid|selbstsch[äa]dig|gefahr|schaden.*kind|infantizid/i, /verneint/i),
        },
      ],
    },
    {
      id: 'f53.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f53.exclude_classifiable',
          text_de: 'Die Störung wird nur dann hier kodiert, wenn sie sich nicht hinreichend einer anderswo klassifizierten Störung (z. B. eigenständige depressive Episode oder Schizophrenie) zuordnen lässt',
          citation: [{ classification: 'icd10', code: 'F53' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

export const f5BehaviouralDisorders: Disorder[] = [
  anorexiaNervosa,
  bulimiaNervosa,
  bingeEatingDisorder,
  nonorganicInsomnia,
  nightmareDisorder,
  sleepTerrors,
  sexualDysfunction,
  puerperalDisorder,
]
