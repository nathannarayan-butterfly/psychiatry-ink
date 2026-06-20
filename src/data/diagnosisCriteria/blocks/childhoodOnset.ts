import type { Disorder } from '../schema'
import { UNKNOWN, met } from '../schema'
import { domainSignal } from '../predicateHelpers'
import { attachGapIcd11Tree } from '../factories/icd11GapFactories'

/**
 * Butterfly criteria block F9 — Verhaltens- und emotionale Störungen mit Beginn
 * in Kindheit und Jugend, operationalized from ICD-10 F90–F98 with ICD-11
 * crosswalks.
 *
 * LICENSING: every `text_de` is an ORIGINAL German operational paraphrase that
 * encodes clinical FACTS only (the existence of a feature, required counts,
 * onset pattern, exclusions). No ICD/DSM criterion wording is reproduced. Each
 * record cites the standard it was operationalized from via `sourceRef` /
 * `citation`.
 *
 * MAPPING NOTE: the ISDM phenomenology domains are oriented at adult-state
 * psychopathology and only partially capture child-/adolescent-onset behavioural
 * phenomena. Operational rules are attached ONLY where the mapping is clean
 * (e.g. Aufmerksamkeit, Antrieb/Psychomotorik, Angst, Fremdaggression). Where no
 * clean mapping exists (Enuresis, Enkopresis, Bindungsanamnese, Tic-Anamnese),
 * criteria are authored attestation-only (`allowClinicianAttest: true`, no
 * `operationalRule`, `mappingHints: []`).
 *
 * ICD-11 RELOCATION NOTE: primary tic disorders (incl. Tourette) were moved out
 * of the mental/behavioural chapter into the neurology chapter (Chapter 08,
 * Diseases of the nervous system) in ICD-11; they are cross-referenced to 8A05
 * below rather than to a 6x code.
 */

/**
 * F90 — Hyperkinetische Störung / Aufmerksamkeitsdefizit-/Hyperaktivitätsstörung.
 * ICD-11 crosswalk: 6A05 (Attention deficit hyperactivity disorder).
 */
const hyperkineticDisorder: Disorder = {
  id: 'hyperkinetic_disorder_adhd',
  classification: 'icd10',
  code: 'F90',
  name_de: 'Hyperkinetische Störung (ADHS)',
  crosswalkKey: 'F90',
  sourceRef: 'operationalisiert nach ICD-10 F90 / ICD-11 6A05',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F90.0', label_de: 'Einfache Aktivitäts- und Aufmerksamkeitsstörung' },
    icd11: { code: '6A05', label_de: 'Aufmerksamkeitsdefizit-/Hyperaktivitätsstörung' },
    dsm5tr: { code: '314.0x', label_de: 'Attention-Deficit/Hyperactivity Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Altersgemäße Lebhaftigkeit / unangemessene Anforderungen',
    'Angst- oder depressive Störung mit Konzentrations- bzw. Unruhebeschwerden',
    'Umschriebene Lern- oder Sprachstörung',
    'Autismus-Spektrum-Störung',
    'Bindungsstörung / psychosoziale Belastung',
    'Substanzwirkung oder somatische Ursache (z. B. Schilddrüse, Schlafstörung)',
  ],
  groups: [
    {
      id: 'f90.inattention',
      label_de: 'Unaufmerksamkeit (mehrere Merkmale, situationsübergreifend)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f90.short_attention',
          text_de: 'Aufgaben oder Spieltätigkeiten werden häufig vorzeitig abgebrochen; die Aufmerksamkeit kann nur kurz aufrechterhalten werden',
          citation: [{ classification: 'icd10', code: 'F90' }, { classification: 'icd11', code: '6A05' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'attention_concentration',
            /unaufmerksam|ablenkbar|konzentration|aufmerksamkeit.*(kurz|vermindert|gest[öo]rt)|flatterhaft/i,
            /unauff[äa]llig|altersgerecht/i,
          ),
        },
        {
          id: 'f90.distractibility',
          text_de: 'Leichte Ablenkbarkeit durch äußere Reize; Schwierigkeiten, Details zu beachten, und scheinbares Nicht-Zuhören',
          citation: [{ classification: 'icd10', code: 'F90' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('attention_concentration', /ablenkbar|abgelenkt|fl[üu]chtigkeitsfehler|vergesslich/i),
        },
        {
          id: 'f90.disorganization',
          text_de: 'Schwierigkeiten bei der Organisation von Aufgaben; häufiges Verlieren von Gegenständen und Vermeiden anhaltender geistiger Anstrengung',
          citation: [{ classification: 'icd11', code: '6A05' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f90.hyperactivity_impulsivity',
      label_de: 'Überaktivität und Impulsivität (mehrere Merkmale, situationsübergreifend)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f90.motor_overactivity',
          text_de: 'Anhaltende motorische Überaktivität (Zappeln, Aufstehen in Situationen, in denen Sitzenbleiben erwartet wird, ständige Unruhe)',
          citation: [{ classification: 'icd10', code: 'F90' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'drive_psychomotor_activity',
            /[üu]beraktiv|hyperaktiv|unruhig|zappel|getrieben|rastlos|gesteigerter\s+antrieb/i,
            /unauff[äa]llig|ruhig/i,
          ),
        },
        {
          id: 'f90.restless_noisy',
          text_de: 'Übermäßiges Laufen, Klettern oder Lärmen sowie Schwierigkeiten, sich ruhig mit Freizeit zu beschäftigen',
          citation: [{ classification: 'icd10', code: 'F90' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /unruhig|getrieben|rastlos|[üu]beraktiv/i),
        },
        {
          id: 'f90.impulsivity',
          text_de: 'Impulsives Verhalten: Herausplatzen mit Antworten, Schwierigkeiten zu warten oder abzuwarten, häufiges Unterbrechen oder Stören anderer',
          citation: [{ classification: 'icd10', code: 'F90' }, { classification: 'icd11', code: '6A05' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /impulsiv|distanzlos|ungehemmt|vorschnell|unterbricht/i),
        },
      ],
    },
    {
      id: 'f90.qualifiers',
      label_de: 'Beginn, Durchgängigkeit und Beeinträchtigung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f90.early_onset',
          text_de: 'Die Auffälligkeiten begannen in der frühen Kindheit (Größenordnung vor dem mittleren Schulalter) und bestehen über mehrere Monate',
          citation: [{ classification: 'icd10', code: 'F90' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f90.pervasiveness',
          text_de: 'Die Symptome treten situationsübergreifend auf (z. B. zu Hause und in Schule/Betreuung), nicht nur in einem einzigen Umfeld',
          citation: [{ classification: 'icd10', code: 'F90' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f90.functional_impact',
          text_de: 'Die Symptome führen zu deutlicher Beeinträchtigung in schulischen, sozialen oder familiären Funktionsbereichen',
          citation: [{ classification: 'icd11', code: '6A05' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|sozial/i),
        },
      ],
    },
    {
      id: 'f90.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f90.exclude_pervasive_affective',
          text_de: 'Die Symptomatik ist nicht besser durch eine tiefgreifende Entwicklungsstörung, eine affektive oder eine Angststörung erklärbar',
          citation: [{ classification: 'icd10', code: 'F90' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A05 (Aufmerksamkeitsdefizit-/Hyperaktivitätsstörung) — DISTINKTER
  // icd11-Baum (echte strukturelle Divergenz gegenüber ICD-10 F90). ICD-11
  // definiert ZWEI eigenständige Symptomdimensionen (Unaufmerksamkeit sowie
  // Hyperaktivität/Impulsivität), die ALTERNATIV oder kombiniert vorliegen können
  // (Präsentationsformen 6A05.0/.1/.2) — anders als ICD-10 F90, das BEIDE
  // Dimensionen gemeinsam verlangte. Zudem ist der Beginn weiter gefasst: während
  // der Entwicklungsphase, typischerweise vor dem Alter von ~12 Jahren (statt des
  // strengeren sehr frühen ICD-10-Beginns). Pervasivität und funktionelle
  // Beeinträchtigung bleiben gefordert.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A05',
    groups: [
      {
        id: '6a05.inattention',
        label_de: 'Unaufmerksamkeitsdimension (mehrere Merkmale, situationsübergreifend)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a05.inattention_sustaining',
            text_de: 'Schwierigkeiten, die Aufmerksamkeit bei Aufgaben aufrechtzuerhalten, die keine hohe Anregung oder unmittelbare Belohnung bieten; Tätigkeiten werden häufig nicht zu Ende geführt',
            citation: [{ classification: 'icd11', code: '6A05', ref: 'inattention' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'attention_concentration',
              /unaufmerksam|ablenkbar|konzentration|aufmerksamkeit.*(kurz|vermindert|gest[öo]rt)|flatterhaft/i,
              /unauff[äa]llig|altersgerecht/i,
            ),
          },
          {
            id: '6a05.inattention_distractible',
            text_de: 'Leichte Ablenkbarkeit durch äußere Reize, Flüchtigkeitsfehler durch mangelnde Detailbeachtung und scheinbares Nicht-Zuhören im direkten Gespräch',
            citation: [{ classification: 'icd11', code: '6A05', ref: 'inattention' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('attention_concentration', /ablenkbar|abgelenkt|fl[üu]chtigkeitsfehler|vergesslich/i),
          },
          {
            id: '6a05.inattention_organization',
            text_de: 'Schwierigkeiten beim Organisieren von Aufgaben und Tätigkeiten, häufiges Verlieren von Gegenständen, Vergesslichkeit im Alltag und Vermeidung anhaltender geistiger Anstrengung',
            citation: [{ classification: 'icd11', code: '6A05', ref: 'inattention' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a05.hyperactivity_impulsivity',
        label_de: 'Hyperaktivitäts-/Impulsivitätsdimension (mehrere Merkmale, situationsübergreifend)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a05.hi_motor',
            text_de: 'Anhaltende motorische Überaktivität: Zappeln, Verlassen des Platzes oder Unruhe in Situationen, in denen ruhiges Verhalten erwartet wird',
            citation: [{ classification: 'icd11', code: '6A05', ref: 'hyperactivity-impulsivity' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'drive_psychomotor_activity',
              /[üu]beraktiv|hyperaktiv|unruhig|zappel|getrieben|rastlos|gesteigerter\s+antrieb/i,
              /unauff[äa]llig|ruhig/i,
            ),
          },
          {
            id: '6a05.hi_restless',
            text_de: 'Innere Rastlosigkeit oder ein Gefühl des Getriebenseins, Schwierigkeiten, sich ruhig zu beschäftigen, sowie übermäßiges Reden',
            citation: [{ classification: 'icd11', code: '6A05', ref: 'hyperactivity-impulsivity' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('drive_psychomotor_activity', /unruhig|getrieben|rastlos|[üu]beraktiv/i),
          },
          {
            id: '6a05.hi_impulsive',
            text_de: 'Impulsives Handeln ohne Bedenken möglicher Folgen: Herausplatzen mit Antworten, Schwierigkeiten zu warten sowie häufiges Unterbrechen oder Stören anderer',
            citation: [{ classification: 'icd11', code: '6A05', ref: 'hyperactivity-impulsivity' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('appearance_behavior', /impulsiv|distanzlos|ungehemmt|vorschnell|unterbricht/i),
          },
        ],
      },
      {
        id: '6a05.presentation',
        label_de: 'Erscheinungsbild (Präsentationsform)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a05.presentation_inattentive',
            text_de: 'Vorwiegend unaufmerksames Erscheinungsbild: die Merkmale der Unaufmerksamkeit überwiegen deutlich',
            citation: [{ classification: 'icd11', code: '6A05.0' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a05.presentation_hyperactive',
            text_de: 'Vorwiegend hyperaktiv-impulsives Erscheinungsbild: die Merkmale der Hyperaktivität/Impulsivität überwiegen deutlich',
            citation: [{ classification: 'icd11', code: '6A05.1' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a05.presentation_combined',
            text_de: 'Kombiniertes Erscheinungsbild: Merkmale beider Dimensionen liegen gemeinsam in klinisch bedeutsamem Ausmaß vor',
            citation: [{ classification: 'icd11', code: '6A05.2' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a05.qualifiers',
        label_de: 'Entwicklungsbeginn, Durchgängigkeit und Beeinträchtigung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a05.developmental_onset',
            text_de: 'Beginn der Symptome während der Entwicklungsphase, typischerweise vor dem Alter von etwa 12 Jahren (weiter gefasst als die ICD-10-Vorgabe eines sehr frühen Beginns)',
            citation: [{ classification: 'icd11', code: '6A05' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a05.persistence',
            text_de: 'Die Symptome bestehen anhaltend über einen längeren Zeitraum (Größenordnung ≥ 6 Monate)',
            citation: [{ classification: 'icd11', code: '6A05' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a05.pervasiveness',
            text_de: 'Die Symptome zeigen sich situationsübergreifend in mehreren Lebensbereichen (z. B. zu Hause, in Schule/Ausbildung/Arbeit und in sozialen Beziehungen)',
            citation: [{ classification: 'icd11', code: '6A05' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a05.impairment',
            text_de: 'Die Symptome führen zu deutlicher Beeinträchtigung in schulischen, beruflichen, sozialen oder anderen wichtigen Funktionsbereichen',
            citation: [{ classification: 'icd11', code: '6A05' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|beruf|sozial/i),
          },
        ],
      },
      {
        id: '6a05.exclusions',
        label_de: 'Ausschlüsse / Abgrenzung',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a05.exclude_other',
            text_de: 'Die Symptome sind nicht besser durch eine andere psychische Störung (z. B. Angst-, affektive oder Autismus-Spektrum-Störung) oder durch eine Substanzwirkung erklärbar',
            citation: [{ classification: 'icd11', code: '6A05' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

/**
 * F91 — Störung des Sozialverhaltens.
 * ICD-11 crosswalk: 6C91 (Conduct-dissocial disorder).
 */
const conductDisorder: Disorder = {
  id: 'conduct_disorder',
  classification: 'icd10',
  code: 'F91',
  name_de: 'Störung des Sozialverhaltens',
  crosswalkKey: 'F91',
  sourceRef: 'operationalisiert nach ICD-10 F91 / ICD-11 6C91',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F91', label_de: 'Störungen des Sozialverhaltens' },
    icd11: { code: '6C91', label_de: 'Dissoziale Verhaltensstörung' },
    dsm5tr: { code: '312.8x', label_de: 'Conduct Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Altersgemäße oppositionelle Phasen ohne anhaltendes Muster',
    'Hyperkinetische Störung (ADHS) mit sekundären Konflikten',
    'Anpassungsstörung nach akuter Belastung',
    'Affektive Störung mit Reizbarkeit',
    'Substanzbedingte Verhaltensänderung',
    'Gemischte Störung des Sozialverhaltens und der Emotionen (F92)',
  ],
  groups: [
    {
      id: 'f91.core_pattern',
      label_de: 'Wiederholtes, anhaltendes dissoziales/aggressives Verhaltensmuster (mindestens mehrere Merkmale)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 180 },
      criteria: [
        {
          id: 'f91.aggression_people',
          text_de: 'Aggressives Verhalten gegenüber Menschen oder Tieren (z. B. Drohen, Einschüchtern, körperliche Auseinandersetzungen, Grausamkeit)',
          citation: [{ classification: 'icd10', code: 'F91' }, { classification: 'icd11', code: '6C91' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'risk_others',
            /aggressi|gewalt|fremdgef[äa]hrd|t[äa]tlich|drohung|grausam/i,
            /keine\s+fremdgef[äa]hrdung|verneint/i,
          ),
        },
        {
          id: 'f91.destruction_property',
          text_de: 'Vorsätzliche Zerstörung fremden Eigentums, einschließlich Brandstiftung',
          citation: [{ classification: 'icd10', code: 'F91' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_others', /zerst[öo]r|sachbesch[äa]dig|brandstift|vandal/i),
        },
        {
          id: 'f91.deceit_theft',
          text_de: 'Betrug, Lügen oder Diebstahl (z. B. Einbruch, Stehlen ohne Konfrontation, wiederholtes Lügen zum Vorteil)',
          citation: [{ classification: 'icd10', code: 'F91' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f91.serious_rule_violations',
          text_de: 'Schwerwiegende Regelverstöße (z. B. wiederholtes Schulschwänzen vor dem 13. Lebensjahr, nächtliches Wegbleiben, Weglaufen von zu Hause)',
          citation: [{ classification: 'icd10', code: 'F91' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f91.defiance',
          text_de: 'Anhaltend aufsässiges, trotziges oder provozierendes Verhalten gegenüber Autoritätspersonen, das über altersübliche Trotzphasen hinausgeht',
          citation: [{ classification: 'icd10', code: 'F91.3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /opposition|trotzig|auf[sä]ssig|provozier|reizbar.*verhalten/i),
        },
      ],
    },
    {
      id: 'f91.qualifiers',
      label_de: 'Dauer und Beeinträchtigung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f91.duration',
          text_de: 'Das Verhaltensmuster besteht anhaltend (Größenordnung ≥ 6 Monate) und ist nicht auf eine einzelne Episode beschränkt',
          citation: [{ classification: 'icd10', code: 'F91' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f91.functional_impact',
          text_de: 'Das Verhalten beeinträchtigt die soziale, schulische oder familiäre Funktionsfähigkeit deutlich',
          citation: [{ classification: 'icd11', code: '6C91' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|sozial|schul|familie/i),
        },
      ],
    },
    {
      id: 'f91.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f91.exclude_other_primary',
          text_de: 'Das Verhalten ist nicht ausschließlich im Rahmen einer anderen vorrangigen Störung erklärbar (z. B. affektive Störung, Psychose)',
          citation: [{ classification: 'icd10', code: 'F91' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6C91 (Conduct-dissocial disorder / Dissoziale Verhaltensstörung) —
  // DELIBERATE icd10==icd11 mapping (no distinct `icd11` set). Beide Systeme
  // definieren dasselbe Kernkonstrukt: ein wiederholtes, anhaltendes Muster von
  // Verhalten, das die grundlegenden Rechte anderer oder wesentliche
  // altersangemessene Normen verletzt. ICD-11 rahmt dies innerhalb der
  // disruptiven/dissozialen Gruppe neu und führt die oppositionell-trotzige
  // Störung als EIGENE Kategorie (6C90); der hier operationalisierte F91-Baum
  // (Aggression, Eigentumszerstörung, Betrug/Diebstahl, schwere Regelverstöße,
  // Trotz, ≥ 6 Monate, Beeinträchtigung) ist mit den 6C91-Anforderungen
  // operationell äquivalent, sodass der ICD-11-Modus ihn wiederverwendet.
}

/**
 * F92 — Kombinierte Störung des Sozialverhaltens und der Emotionen.
 * ICD-11 hat keine eigenständige kombinierte Kategorie; dort werden die
 * dissoziale Verhaltensstörung (6C91) und die emotionale/depressive Symptomatik
 * separat kodiert. Crosswalk daher mit Hinweis auf diese Aufteilung.
 */
const mixedConductEmotions: Disorder = {
  id: 'mixed_conduct_emotional_disorder',
  classification: 'icd10',
  code: 'F92',
  name_de: 'Kombinierte Störung des Sozialverhaltens und der Emotionen',
  crosswalkKey: 'F92',
  sourceRef:
    'operationalisiert nach ICD-10 F92 / ICD-11: keine kombinierte Kategorie — getrennte Kodierung von dissozialer Verhaltensstörung (6C91) und emotionaler/depressiver Symptomatik',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F92', label_de: 'Kombinierte Störung des Sozialverhaltens und der Emotionen' },
    icd11: { code: '6C91', label_de: 'Dissoziale Verhaltensstörung (emotionale Anteile separat kodiert)' },
    dsm5tr: { code: '312.8x', label_de: 'Conduct Disorder (+ koexistente affektive Störung, Crosswalk)' },
  },
  differentials_de: [
    'Reine Störung des Sozialverhaltens (F91) ohne emotionale Beschwerden',
    'Reine emotionale/depressive Störung ohne dissoziales Verhalten',
    'Hyperkinetische Störung mit sekundären Konflikten',
    'Anpassungsstörung',
  ],
  groups: [
    {
      id: 'f92.conduct',
      label_de: 'Dissoziales/aggressives Verhaltensmuster',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f92.conduct_pattern',
          text_de: 'Es besteht ein anhaltendes Muster dissozialen, aggressiven oder aufsässigen Verhaltens (entsprechend einer Störung des Sozialverhaltens)',
          citation: [{ classification: 'icd10', code: 'F92' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_others', /aggressi|dissozial|gewalt|fremdgef[äa]hrd|t[äa]tlich/i),
        },
      ],
    },
    {
      id: 'f92.emotional',
      label_de: 'Zusätzliche emotionale Symptomatik',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f92.depressive_symptoms',
          text_de: 'Gleichzeitig deutliche depressive Symptome (z. B. niedergeschlagene Stimmung, Freudlosigkeit, Rückzug)',
          citation: [{ classification: 'icd10', code: 'F92.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /depress|niedergeschlagen|traurig|freudlos|gedr[üu]ckt/i, /euthym/i),
        },
        {
          id: 'f92.anxiety_symptoms',
          text_de: 'Gleichzeitig deutliche Angst-, Sorgen- oder andere emotionale Symptome',
          citation: [{ classification: 'icd10', code: 'F92' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /angst|sorge|bef[üu]rcht|anspannung|phob/i),
        },
      ],
    },
  ],
  // ICD-11 6C91 (Conduct-dissocial disorder) — DELIBERATE icd10==icd11 mapping
  // (no distinct `icd11` set). ICD-11 kennt KEINE kombinierte „Sozialverhalten +
  // Emotionen“-Kategorie mehr: die dissoziale Verhaltenskomponente wird mit 6C91
  // (MERGE der F92-Verhaltensanteile in dieselbe Kategorie wie F91) kodiert, die
  // emotionale/depressive Komponente separat (z. B. depressive oder
  // Angststörung). Der F92-Baum (Verhaltensmuster + zusätzliche emotionale
  // Symptomatik) bildet diese Konstellation operationell weiterhin ab; der
  // ICD-11-Modus verwendet ihn mit dem Hinweis auf die getrennte Kodierung.
}

/**
 * F93.0 — Emotionale Störung mit Trennungsangst des Kindesalters.
 * ICD-11 crosswalk: 6B05 (Separation anxiety disorder).
 */
const separationAnxietyDisorder: Disorder = {
  id: 'separation_anxiety_disorder',
  classification: 'icd10',
  code: 'F93.0',
  name_de: 'Trennungsangst des Kindesalters',
  crosswalkKey: 'F93.0',
  sourceRef: 'operationalisiert nach ICD-10 F93.0 / ICD-11 6B05',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F93.0', label_de: 'Emotionale Störung mit Trennungsangst des Kindesalters' },
    icd11: { code: '6B05', label_de: 'Störung mit Trennungsangst' },
    dsm5tr: { code: '309.21', label_de: 'Separation Anxiety Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Altersgemäße Trennungsängstlichkeit (z. B. Kleinkindalter)',
    'Generalisierte Angst des Kindesalters',
    'Spezifische oder soziale Phobie',
    'Schulvermeidung im Rahmen anderer Störungen',
    'Depressive Störung mit Rückzug',
  ],
  groups: [
    {
      id: 'f93_0.core',
      label_de: 'Unrealistische, anhaltende Angst vor Trennung von Bezugspersonen',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f93_0.worry_harm',
          text_de: 'Anhaltende, unrealistische Sorge, einer Hauptbezugsperson könnte etwas zustoßen oder sie könnte weggehen und nicht zurückkehren',
          citation: [{ classification: 'icd10', code: 'F93.0' }, { classification: 'icd11', code: '6B05' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'anxiety_panic_phobic_symptoms',
            /trennungsangst|trennung|verlassen|bezugsperson|sorge.*(eltern|mutter|vater)/i,
            /keine\s+angst/i,
          ),
        },
        {
          id: 'f93_0.refusal_separation',
          text_de: 'Anhaltende Weigerung oder Widerstreben, ohne Bezugsperson in die Schule/Betreuung zu gehen, allein zu sein oder zu schlafen',
          citation: [{ classification: 'icd10', code: 'F93.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /schulvermeid|weigert|klammer|nicht\s+allein/i),
        },
        {
          id: 'f93_0.somatic_on_separation',
          text_de: 'Wiederholte körperliche Beschwerden (z. B. Bauch-, Kopfschmerzen, Übelkeit) oder ausgeprägter Kummer bei tatsächlicher oder drohender Trennung',
          citation: [{ classification: 'icd10', code: 'F93.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /bauchschmerz|kopfschmerz|[üu]belkeit|k[öo]rperlich.*beschwerden/i),
        },
      ],
    },
    {
      id: 'f93_0.qualifiers',
      label_de: 'Beginn und Beeinträchtigung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f93_0.onset_childhood',
          text_de: 'Beginn der Symptomatik im Kindesalter; die Angst übersteigt das für die Entwicklungsstufe zu erwartende Maß deutlich',
          citation: [{ classification: 'icd10', code: 'F93.0' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f93_0.functional_impact',
          text_de: 'Die Trennungsangst beeinträchtigt Alltag, Schulbesuch oder soziale Aktivitäten deutlich',
          citation: [{ classification: 'icd11', code: '6B05' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|alltag/i),
        },
      ],
    },
  ],
  // ICD-11 6B05 (Störung mit Trennungsangst) — DISTINKTER icd11-Baum (echte
  // Divergenz gegenüber ICD-10 F93.0). ICD-11 ordnet die Trennungsangst der
  // GRUPPE DER ANGSTSTÖRUNGEN zu und löst die ICD-10-Beschränkung auf das
  // Kindesalter ausdrücklich auf: Beginn bzw. Diagnose sind über die gesamte
  // Lebensspanne — auch erstmals im Jugend- oder ERWACHSENENALTER — möglich. Die
  // Angst muss entwicklungs-/kontextunangemessen sein, über mehrere Monate
  // anhalten und zu funktioneller Beeinträchtigung führen.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6B05',
    groups: [
      {
        id: '6b05.core',
        label_de: 'Entwicklungsunangemessene, ausgeprägte Furcht oder Angst vor Trennung von Bindungspersonen',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b05.worry_harm',
            text_de: 'Anhaltende, übermäßige Sorge um das Wohlergehen oder den möglichen Verlust spezifischer Bindungspersonen (z. B. Furcht vor Unfall, Erkrankung oder Tod)',
            citation: [{ classification: 'icd11', code: '6B05' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'anxiety_panic_phobic_symptoms',
              /trennungsangst|trennung|verlassen|bindungsperson|bezugsperson|sorge.*(eltern|mutter|vater|partner|angeh[öo]rig)/i,
              /keine\s+angst/i,
            ),
          },
          {
            id: '6b05.reluctance_separation',
            text_de: 'Anhaltendes Widerstreben oder Weigerung, sich von Bindungspersonen zu entfernen (z. B. Schule, Arbeit, Ausgehen, Alleinsein oder Schlafen ohne die Bindungsperson)',
            citation: [{ classification: 'icd11', code: '6B05' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /schulvermeid|weigert|klammer|nicht\s+allein|vermeid.*trennung/i),
          },
          {
            id: '6b05.somatic_distress',
            text_de: 'Wiederholte körperliche Beschwerden oder ausgeprägter emotionaler Stress bei tatsächlicher oder antizipierter Trennung von der Bindungsperson',
            citation: [{ classification: 'icd11', code: '6B05' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('somatic_preoccupation', /bauchschmerz|kopfschmerz|[üu]belkeit|k[öo]rperlich.*beschwerden/i),
          },
        ],
      },
      {
        id: '6b05.qualifiers',
        label_de: 'Lebensspannen-Beginn, Dauer und Beeinträchtigung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b05.lifespan_onset',
            text_de: 'Die Symptomatik kann in der Kindheit beginnen, in ICD-11 jedoch ausdrücklich auch erstmals im Jugend- oder Erwachsenenalter auftreten oder fortbestehen (nicht auf das Kindesalter beschränkt)',
            citation: [{ classification: 'icd11', code: '6B05' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
          {
            id: '6b05.developmentally_inappropriate',
            text_de: 'Die Furcht/Angst ist entwicklungs- bzw. situationsunangemessen und übersteigt das altersentsprechend oder kontextuell zu erwartende Maß deutlich',
            citation: [{ classification: 'icd11', code: '6B05' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6b05.duration',
            text_de: 'Die Symptome bestehen über einen längeren Zeitraum (Größenordnung mehrere Monate)',
            citation: [{ classification: 'icd11', code: '6B05' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
          },
          {
            id: '6b05.functional_impact',
            text_de: 'Die Trennungsangst führt zu deutlicher Beeinträchtigung in persönlichen, familiären, sozialen, schulischen, beruflichen oder anderen wichtigen Funktionsbereichen',
            citation: [{ classification: 'icd11', code: '6B05' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|beruf|alltag|sozial/i),
          },
        ],
      },
    ],
  },
}

/**
 * F94.0 — Elektiver (selektiver) Mutismus.
 * ICD-11 crosswalk: 6B06 (Selective mutism).
 */
const selectiveMutism: Disorder = {
  id: 'selective_mutism',
  classification: 'icd10',
  code: 'F94.0',
  name_de: 'Elektiver (selektiver) Mutismus',
  crosswalkKey: 'F94.0',
  sourceRef: 'operationalisiert nach ICD-10 F94.0 / ICD-11 6B06',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F94.0', label_de: 'Elektiver Mutismus' },
    icd11: { code: '6B06', label_de: 'Selektiver Mutismus' },
    dsm5tr: { code: '313.23', label_de: 'Selective Mutism (Crosswalk)' },
  },
  differentials_de: [
    'Umschriebene Sprachentwicklungsstörung',
    'Autismus-Spektrum-Störung',
    'Soziale Angststörung',
    'Vorübergehendes Verstummen bei Migration/Mehrsprachigkeit (Eingewöhnung)',
    'Trennungsangst',
  ],
  groups: [
    {
      id: 'f94_0.core',
      label_de: 'Situationsgebundene Sprechverweigerung bei erhaltener Sprachfähigkeit',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f94_0.situational_mutism',
          text_de: 'Anhaltende Unfähigkeit zu sprechen in bestimmten sozialen Situationen (z. B. in der Schule), während in anderen, vertrauten Situationen normal gesprochen wird',
          citation: [{ classification: 'icd10', code: 'F94.0' }, { classification: 'icd11', code: '6B06' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('speech_language', /mutism|verstumm|spricht\s+nicht|sprechverweiger|selektiv.*stumm/i),
        },
        {
          id: 'f94_0.language_intact',
          text_de: 'Das Sprachverständnis und die grundsätzliche Sprechfähigkeit sind erhalten (kein primärer Sprachdefekt)',
          citation: [{ classification: 'icd10', code: 'F94.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f94_0.duration',
          text_de: 'Das Verstummen besteht über einen längeren Zeitraum (Größenordnung ≥ 1 Monat) und ist nicht auf die erste Eingewöhnungszeit beschränkt',
          citation: [{ classification: 'icd11', code: '6B06' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f94_0.functional_impact',
          text_de: 'Die Sprechverweigerung beeinträchtigt schulische Leistungen oder soziale Kommunikation deutlich',
          citation: [{ classification: 'icd11', code: '6B06' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|kommunikation|sozial/i),
        },
      ],
    },
    {
      id: 'f94_0.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f94_0.exclude_language_asd',
          text_de: 'Das Verstummen ist nicht ausreichend durch eine Sprachentwicklungsstörung, eine Autismus-Spektrum-Störung oder mangelnde Kenntnis der gesprochenen Sprache erklärbar',
          citation: [{ classification: 'icd10', code: 'F94.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6B06 (Selektiver Mutismus) — DELIBERATE icd10==icd11 mapping (no
  // distinct `icd11` set). ICD-11 verschiebt den selektiven Mutismus in die
  // GRUPPE DER ANGSTSTÖRUNGEN, behält aber dieselben operationalen Kernmerkmale:
  // konsistentes Nichtsprechen in bestimmten sozialen Situationen bei erhaltener
  // Sprechfähigkeit in anderen, Dauer ≥ 1 Monat und funktionelle
  // Beeinträchtigung. Der F94.0-Baum ist damit operationell äquivalent.
}

/**
 * F94.1 — Reaktive Bindungsstörung des Kindesalters.
 * ICD-11 crosswalk: 6B44 (Reactive attachment disorder).
 */
const reactiveAttachmentDisorder: Disorder = {
  id: 'reactive_attachment_disorder',
  classification: 'icd10',
  code: 'F94.1',
  name_de: 'Reaktive Bindungsstörung des Kindesalters',
  crosswalkKey: 'F94.1',
  sourceRef: 'operationalisiert nach ICD-10 F94.1 / ICD-11 6B44',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F94.1', label_de: 'Reaktive Bindungsstörung des Kindesalters' },
    icd11: { code: '6B44', label_de: 'Reaktive Bindungsstörung' },
    dsm5tr: { code: '313.89', label_de: 'Reactive Attachment Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Autismus-Spektrum-Störung',
    'Intelligenzminderung mit Entwicklungsrückstand',
    'Depressive Störung im Kindesalter',
    'Bindungsstörung mit Enthemmung (F94.2)',
    'Posttraumatische Belastungsstörung',
  ],
  groups: [
    {
      id: 'f94_1.core',
      label_de: 'Anhaltend gehemmtes, ambivalentes Bindungsverhalten',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f94_1.inhibited_attachment',
          text_de: 'Durchgängig gehemmtes, emotional zurückgezogenes Verhalten gegenüber Bezugspersonen; das Kind sucht bei Kummer kaum Trost oder reagiert nicht darauf',
          citation: [{ classification: 'icd10', code: 'F94.1' }, { classification: 'icd11', code: '6B44' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /bindungsst[öo]rung|zur[üu]ckgezogen|distanziert|kein.*trost|ambivalent/i),
        },
        {
          id: 'f94_1.emotional_disturbance',
          text_de: 'Begleitende emotionale Auffälligkeiten (z. B. Furchtsamkeit, Übervorsichtigkeit, eingeschränktes positives Reagieren, Reizbarkeit oder Traurigkeit)',
          citation: [{ classification: 'icd10', code: 'F94.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /furchtsam|[äa]ngstlich|traurig|reizbar|emotional.*eingeschr[äa]nkt/i),
        },
        {
          id: 'f94_1.pathogenic_care',
          text_de: 'Anamnestisch unzureichende, vernachlässigende oder wechselnde Fürsorge (pathogene Betreuung) als plausibler Hintergrund',
          citation: [{ classification: 'icd11', code: '6B44' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f94_1.onset_early',
          text_de: 'Beginn in den ersten Lebensjahren (Größenordnung vor dem 5. Lebensjahr)',
          citation: [{ classification: 'icd10', code: 'F94.1' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f94_1.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f94_1.exclude_asd',
          text_de: 'Das Bild erfüllt nicht die Kriterien einer Autismus-Spektrum-Störung und ist nicht allein durch eine Intelligenzminderung erklärbar',
          citation: [{ classification: 'icd10', code: 'F94.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6B44 (Reaktive Bindungsstörung) — DELIBERATE icd10==icd11 mapping (no
  // distinct `icd11` set). Beide Systeme verlangen dasselbe Kernbild: durchgängig
  // gehemmtes, emotional zurückgezogenes Bindungsverhalten mit fehlendem
  // Trostsuchen, vor dem Hintergrund pathogener/vernachlässigender Fürsorge und
  // mit Beginn in den ersten Lebensjahren. Der F94.1-Baum ist operationell
  // äquivalent, sodass der ICD-11-Modus ihn wiederverwendet.
}

/**
 * F94.2 — Bindungsstörung des Kindesalters mit Enthemmung.
 * ICD-11 crosswalk: 6B45 (Disinhibited social engagement disorder).
 */
const disinhibitedAttachmentDisorder: Disorder = {
  id: 'disinhibited_attachment_disorder',
  classification: 'icd10',
  code: 'F94.2',
  name_de: 'Bindungsstörung mit Enthemmung',
  crosswalkKey: 'F94.2',
  sourceRef: 'operationalisiert nach ICD-10 F94.2 / ICD-11 6B45',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F94.2', label_de: 'Bindungsstörung des Kindesalters mit Enthemmung' },
    icd11: { code: '6B45', label_de: 'Störung mit enthemmtem Sozialkontakt' },
    dsm5tr: { code: '313.89', label_de: 'Disinhibited Social Engagement Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Hyperkinetische Störung (ADHS) mit Distanzlosigkeit',
    'Autismus-Spektrum-Störung',
    'Reaktive Bindungsstörung (gehemmter Typ, F94.1)',
    'Altersgemäße Kontaktfreude',
  ],
  groups: [
    {
      id: 'f94_2.core',
      label_de: 'Diffuses, wahllos distanzloses Bindungs-/Sozialverhalten',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f94_2.indiscriminate_friendliness',
          text_de: 'Wahllos freundliches, distanzloses Verhalten gegenüber Fremden mit fehlender altersgerechter Zurückhaltung; das Kind entfernt sich ohne Rückversicherung von Bezugspersonen',
          citation: [{ classification: 'icd10', code: 'F94.2' }, { classification: 'icd11', code: '6B45' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /distanzlos|enthemmt|wahllos.*kontakt|kein.*zur[üu]ckhalt|kritiklos.*n[äa]he/i),
        },
        {
          id: 'f94_2.lack_selectivity',
          text_de: 'Fehlende selektive Bindung: das Kind unterscheidet kaum zwischen vertrauten Bezugspersonen und Fremden und sucht bei Kummer unselektiv Trost',
          citation: [{ classification: 'icd10', code: 'F94.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f94_2.pathogenic_care',
          text_de: 'Anamnestisch unzureichende oder häufig wechselnde Fürsorge (z. B. wiederholter Bezugspersonenwechsel) als plausibler Hintergrund',
          citation: [{ classification: 'icd11', code: '6B45' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6B45 (Störung mit enthemmtem Sozialkontakt) — DELIBERATE icd10==icd11
  // mapping (no distinct `icd11` set). Beide Systeme erfassen dasselbe Kernbild:
  // wahllos distanzloses Sozialverhalten gegenüber Fremden bei fehlender
  // selektiver Bindung, vor dem Hintergrund unzureichender/wechselnder Fürsorge.
  // Der F94.2-Baum ist operationell äquivalent.
}

/**
 * F95 — Ticstörungen, einschließlich Tourette-Syndrom (F95.2).
 * ICD-11 RELOCATION: primäre Ticstörungen wurden in ICD-11 in das Kapitel 08
 * (Krankheiten des Nervensystems) verschoben; Crosswalk daher auf 8A05
 * (Tic disorders / Tourette syndrome 8A05.0) statt auf eine 6x-Kategorie.
 */
const ticDisorders: Disorder = {
  id: 'tic_disorders',
  classification: 'icd10',
  code: 'F95',
  name_de: 'Ticstörungen (inkl. Tourette-Syndrom)',
  crosswalkKey: 'F95',
  sourceRef:
    'operationalisiert nach ICD-10 F95 (inkl. Tourette F95.2) / ICD-11 8A05 — in ICD-11 ins Neurologie-Kapitel (08) verschoben',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F95.2', label_de: 'Kombinierte vokale und multiple motorische Tics (Tourette-Syndrom)' },
    icd11: { code: '8A05', label_de: 'Ticstörungen (Kap. 08 Neurologie; Tourette 8A05.0)' },
    dsm5tr: { code: '307.2x', label_de: 'Tic Disorders / Tourette’s Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Stereotypien (rhythmisch, willentlich beeinflussbar, ohne Vorgefühl)',
    'Zwangshandlungen (zielgerichtet, angstreduzierend)',
    'Myoklonien oder andere neurologische Bewegungsstörungen',
    'Medikamenten-/substanzinduzierte Bewegungsstörung',
    'Anfallsbedingte Bewegungen',
  ],
  groups: [
    {
      id: 'f95.core',
      label_de: 'Unwillkürliche, wiederkehrende Tics',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f95.motor_tics',
          text_de: 'Plötzliche, schnelle, wiederkehrende und nicht-rhythmische motorische Bewegungen (z. B. Blinzeln, Kopfrucken, Grimassieren), die unwillkürlich auftreten',
          citation: [{ classification: 'icd10', code: 'F95' }, { classification: 'icd11', code: '8A05' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /\btic|tics\b|blinzeln|zucken|grimass|kopfruck|motorische\s+tics/i),
        },
        {
          id: 'f95.vocal_tics',
          text_de: 'Plötzliche, wiederkehrende vokale Äußerungen (z. B. Räuspern, Grunzen, Laute oder Worte), die unwillkürlich auftreten',
          citation: [{ classification: 'icd10', code: 'F95' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /vokale?\s+tics|r[äa]uspern|grunzen|lautieren|koprolal/i),
        },
      ],
    },
    {
      id: 'f95.qualifiers',
      label_de: 'Verlauf und Beginn',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f95.onset_childhood',
          text_de: 'Beginn im Kindes- oder Jugendalter (Größenordnung vor dem 18. Lebensjahr)',
          citation: [{ classification: 'icd10', code: 'F95' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f95.duration',
          text_de: 'Die Tics bestehen über einen längeren Zeitraum (für ein Tourette-Syndrom: kombinierte motorische und vokale Tics über die Größenordnung von ≥ 1 Jahr)',
          citation: [{ classification: 'icd10', code: 'F95.2' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f95.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f95.exclude_secondary',
          text_de: 'Die Tics sind nicht durch eine andere neurologische Erkrankung oder durch die Wirkung einer Substanz/Medikation bedingt',
          citation: [{ classification: 'icd11', code: '8A05' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const substance = ctx.present('substance_related_features', /medikament|substanz|stimulan|neuroleptik/i)
            return substance ? met(substance.label) : UNKNOWN
          },
        },
      ],
    },
  ],
  // ICD-11 8A05 (Tic disorders) — DELIBERATE icd10==icd11 mapping (no distinct
  // icd11 set) — reclassified to ICD-11 chapter 08 (8A05, Tic disorders),
  // criteria operationally equivalent. Primäre Ticstörungen (inkl. Tourette
  // 8A05.0) verließen in ICD-11 das Kapitel 06 (psychische Störungen) und wurden
  // in das Neurologie-Kapitel 08 verschoben; daher KEIN fabrizierter 6xx-Baum,
  // sondern dokumentierter Fallback mit dem 8A05-Crosswalk.
}

/**
 * F98.0 — Nichtorganische Enuresis.
 * ICD-11 crosswalk: 6C00 (Enuresis).
 */
const nonorganicEnuresis: Disorder = {
  id: 'nonorganic_enuresis',
  classification: 'icd10',
  code: 'F98.0',
  name_de: 'Nichtorganische Enuresis',
  crosswalkKey: 'F98.0',
  sourceRef: 'operationalisiert nach ICD-10 F98.0 / ICD-11 6C00',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F98.0', label_de: 'Nichtorganische Enuresis' },
    icd11: { code: '6C00', label_de: 'Enuresis' },
    dsm5tr: { code: '307.6', label_de: 'Enuresis (Crosswalk)' },
  },
  differentials_de: [
    'Organische Ursache (Harnwegsinfekt, Diabetes, Fehlbildung der Harnwege)',
    'Neurologische Blasenfunktionsstörung',
    'Wirkung von Substanzen/Medikamenten (z. B. Diuretika)',
    'Altersgemäße, noch nicht abgeschlossene Sauberkeitsentwicklung',
  ],
  groups: [
    {
      id: 'f98_0.core',
      label_de: 'Unwillkürlicher Harnabgang jenseits des Entwicklungsalters',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f98_0.involuntary_voiding',
          text_de: 'Wiederholter unwillkürlicher Harnabgang (tagsüber und/oder nachts) bei einem Kind, dessen Entwicklungsalter eine Blasenkontrolle erwarten ließe (Größenordnung ab ca. 5 Jahren)',
          citation: [{ classification: 'icd10', code: 'F98.0' }, { classification: 'icd11', code: '6C00' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f98_0.frequency_duration',
          text_de: 'Das Einnässen tritt mit relevanter Häufigkeit über einen längeren Zeitraum (Größenordnung mehrere Monate) auf',
          citation: [{ classification: 'icd10', code: 'F98.0' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f98_0.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f98_0.exclude_organic',
          text_de: 'Das Einnässen ist nicht durch eine körperliche Erkrankung (z. B. Harnwegsinfekt, Diabetes, anatomische Anomalie) oder durch Substanzwirkung erklärbar',
          citation: [{ classification: 'icd10', code: 'F98.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6C00 (Enuresis) — DELIBERATE icd10==icd11 mapping (no distinct `icd11`
  // set). Beide Systeme definieren das wiederholte unwillkürliche Einnässen
  // jenseits des erwartbaren Entwicklungsalters (≈ ab 5 Jahren) über einen
  // relevanten Zeitraum, mit Ausschluss organischer/substanzbedingter Ursachen.
  // Operationell äquivalent.
}

/**
 * F98.1 — Nichtorganische Enkopresis.
 * ICD-11 crosswalk: 6C01 (Encopresis).
 */
const nonorganicEncopresis: Disorder = {
  id: 'nonorganic_encopresis',
  classification: 'icd10',
  code: 'F98.1',
  name_de: 'Nichtorganische Enkopresis',
  crosswalkKey: 'F98.1',
  sourceRef: 'operationalisiert nach ICD-10 F98.1 / ICD-11 6C01',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F98.1', label_de: 'Nichtorganische Enkopresis' },
    icd11: { code: '6C01', label_de: 'Enkopresis' },
    dsm5tr: { code: '307.7', label_de: 'Encopresis (Crosswalk)' },
  },
  differentials_de: [
    'Organische Ursache (chronische Obstipation mit Überlaufenkopresis, anorektale Erkrankung)',
    'Neurologische Erkrankung',
    'Wirkung von Substanzen/Medikamenten (z. B. Laxanzien)',
    'Altersgemäß noch nicht abgeschlossene Sauberkeitsentwicklung',
  ],
  groups: [
    {
      id: 'f98_1.core',
      label_de: 'Absetzen von Stuhl an unangemessenen Orten jenseits des Entwicklungsalters',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f98_1.inappropriate_defecation',
          text_de: 'Wiederholtes willkürliches oder unwillkürliches Absetzen von Stuhl an dafür nicht vorgesehenen Stellen bei einem Kind, dessen Entwicklungsalter Darmkontrolle erwarten ließe (Größenordnung ab ca. 4 Jahren)',
          citation: [{ classification: 'icd10', code: 'F98.1' }, { classification: 'icd11', code: '6C01' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f98_1.frequency_duration',
          text_de: 'Das Einkoten tritt mit relevanter Häufigkeit über einen längeren Zeitraum (Größenordnung mehrere Monate) auf',
          citation: [{ classification: 'icd10', code: 'F98.1' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f98_1.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f98_1.exclude_organic',
          text_de: 'Das Einkoten ist nicht ausreichend durch eine körperliche Erkrankung (außer einer funktionellen Obstipation) oder durch Substanzwirkung erklärbar',
          citation: [{ classification: 'icd10', code: 'F98.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6C01 (Enkopresis) — DELIBERATE icd10==icd11 mapping (no distinct
  // `icd11` set). Beide Systeme definieren das wiederholte Absetzen von Stuhl an
  // unangemessenen Orten jenseits des erwartbaren Entwicklungsalters (≈ ab 4
  // Jahren) über einen relevanten Zeitraum, mit Ausschluss organischer Ursachen
  // (außer funktioneller Obstipation). Operationell äquivalent.
}

/**
 * F98.2 — Fütterstörung im frühen Kindesalter.
 * ICD-11 crosswalk (näherungsweise): 6B83 (Avoidant-restrictive food intake
 * disorder) — die ICD-10-Fütterstörung des Kleinkindalters wird in ICD-11 nicht
 * 1:1 abgebildet, sondern überwiegend dieser Kategorie zugeordnet.
 */
const feedingDisorderChildhood: Disorder = {
  id: 'feeding_disorder_childhood',
  classification: 'icd10',
  code: 'F98.2',
  name_de: 'Fütterstörung im frühen Kindesalter',
  crosswalkKey: 'F98.2',
  sourceRef:
    'operationalisiert nach ICD-10 F98.2 / ICD-11 6B83 (näherungsweise; keine 1:1-Entsprechung)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F98.2', label_de: 'Fütterstörung im frühen Kindesalter' },
    icd11: { code: '6B83', label_de: 'Vermeidend-restriktive Essstörung (näherungsweise)' },
    dsm5tr: { code: '307.59', label_de: 'Avoidant/Restrictive Food Intake Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Organische Ursache (gastrointestinale Erkrankung, Schluckstörung, Allergie)',
    'Gedeihstörung anderer Genese',
    'Vernachlässigung / unzureichendes Nahrungsangebot',
    'Autismus-Spektrum-Störung mit selektivem Essverhalten',
  ],
  groups: [
    {
      id: 'f98_2.core',
      label_de: 'Anhaltende Fütter-/Essproblematik im Kleinkindalter',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f98_2.feeding_refusal',
          text_de: 'Anhaltende Nahrungsverweigerung oder ausgeprägt wählerisches Essverhalten bei ausreichendem Nahrungsangebot und ohne adäquate organische Erklärung',
          citation: [{ classification: 'icd10', code: 'F98.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /nahrungsverweiger|essverhalten|appetit|f[üu]tterst[öo]rung|gewicht/i),
        },
        {
          id: 'f98_2.weight_impact',
          text_de: 'Fehlende erwartbare Gewichtszunahme oder Gewichtsverlust über einen längeren Zeitraum (Größenordnung ≥ 1 Monat)',
          citation: [{ classification: 'icd10', code: 'F98.2' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f98_2.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f98_2.exclude_organic',
          text_de: 'Die Problematik ist nicht durch eine körperliche Erkrankung oder durch ein unzureichendes Nahrungsangebot ausreichend erklärbar',
          citation: [{ classification: 'icd10', code: 'F98.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6B83 (Avoidant-restrictive food intake disorder / ARFID) — DELIBERATE
  // icd10==icd11 mapping (no distinct `icd11` set). ICD-11 bildet die
  // ICD-10-Fütterstörung des Kleinkindalters (F98.2) NICHT 1:1 ab, sondern
  // überführt sie überwiegend in die vermeidend-restriktive Essstörung (ARFID,
  // 6B83) — ein breiteres, altersunabhängiges Konstrukt. Der hier
  // operationalisierte Kern (anhaltende Nahrungsverweigerung / restriktives
  // Essverhalten ohne adäquate organische Erklärung mit Gewichts-/Gedeihfolgen)
  // ist mit den ARFID-Anforderungen klinisch deckungsgleich; der ICD-11-Modus
  // verwendet ihn mit diesem ARFID-Crosswalk-Hinweis wieder.
}

/**
 * F98.4 — Stereotype Bewegungsstörung.
 * ICD-11 crosswalk: 6A06 (Stereotyped movement disorder).
 */
const stereotypedMovementDisorder: Disorder = {
  id: 'stereotyped_movement_disorder',
  classification: 'icd10',
  code: 'F98.4',
  name_de: 'Stereotype Bewegungsstörung',
  crosswalkKey: 'F98.4',
  sourceRef: 'operationalisiert nach ICD-10 F98.4 / ICD-11 6A06',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F98.4', label_de: 'Stereotype Bewegungsstörung' },
    icd11: { code: '6A06', label_de: 'Stereotype Bewegungsstörung' },
    dsm5tr: { code: '307.3', label_de: 'Stereotypic Movement Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Ticstörung (plötzlich, nicht-rhythmisch, mit Vorgefühl)',
    'Zwangshandlungen',
    'Autismus-Spektrum-Störung (Stereotypien als Teilmerkmal)',
    'Neurologische Bewegungsstörung',
    'Substanz-/medikamenteninduzierte Bewegungsstörung',
  ],
  groups: [
    {
      id: 'f98_4.core',
      label_de: 'Repetitive, rhythmische, scheinbar zwecklose Bewegungen',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f98_4.stereotypies',
          text_de: 'Willkürlich wirkende, wiederholte, rhythmische und nicht funktionale Bewegungen (z. B. Körperschaukeln, Kopfschlagen, Hand-/Fingerstereotypien)',
          citation: [{ classification: 'icd10', code: 'F98.4' }, { classification: 'icd11', code: '6A06' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /stereotyp|sch[au]ukel|kopfschlag|repetitive\s+bewegung|man[ie]rismen|selbstverletz/i),
        },
        {
          id: 'f98_4.onset_persistence',
          text_de: 'Beginn in der frühen Entwicklung; die Bewegungen bestehen über einen längeren Zeitraum (Größenordnung mehrere Monate)',
          citation: [{ classification: 'icd11', code: '6A06' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f98_4.impact',
          text_de: 'Die Stereotypien beeinträchtigen Alltag oder soziale Aktivitäten oder führen (bei selbstverletzender Form) zu körperlichem Schaden',
          citation: [{ classification: 'icd11', code: '6A06' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|selbstverletz|alltag/i),
        },
      ],
    },
    {
      id: 'f98_4.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f98_4.exclude_tic_neuro',
          text_de: 'Die Bewegungen sind keine Tics und nicht durch eine neurologische Erkrankung oder durch eine Substanz-/Medikamentenwirkung bedingt',
          citation: [{ classification: 'icd10', code: 'F98.4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A06 (Stereotype Bewegungsstörung) — DELIBERATE icd10==icd11 mapping
  // (no distinct `icd11` set). Beide Systeme definieren wiederholte, rhythmische,
  // scheinbar zwecklose und nicht funktionale Bewegungen mit frühem Beginn, die
  // Alltag/Soziales beeinträchtigen oder (selbstverletzende Form) körperlichen
  // Schaden verursachen, unter Abgrenzung von Tics und neurologischen Ursachen.
  // Operationell äquivalent.
}

export const childhoodOnsetDisorders: Disorder[] = [
  hyperkineticDisorder,
  attachGapIcd11Tree(conductDisorder),
  mixedConductEmotions,
  separationAnxietyDisorder,
  selectiveMutism,
  reactiveAttachmentDisorder,
  disinhibitedAttachmentDisorder,
  ticDisorders,
  nonorganicEnuresis,
  nonorganicEncopresis,
  feedingDisorderChildhood,
  stereotypedMovementDisorder,
]
