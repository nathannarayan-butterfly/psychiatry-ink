import type { UiLanguage } from '../types/settings'

type LocalizedHint = Record<UiLanguage, string>

export const therapieVerlaufHintTranslations: Record<
  string,
  { description: LocalizedHint; exampleHint: LocalizedHint }
> = {
  'aufnahmeanlass-verlegungsgrund': {
    description: {
      de: 'Klinische Notwendigkeit der Aufnahme oder Verlegung — nicht mit Medikation oder Stationsverhalten beginnen.',
      en: 'Clinical necessity of admission or transfer — do not start with medication or ward behaviour.',
      fr: "Nécessité clinique de l'admission ou du transfert — ne pas commencer par la médication ou le comportement sur l'unité.",
      es: 'Necesidad clínica del ingreso o traslado — no empezar con medicación ni comportamiento en la unidad.',
    },
    exampleHint: {
      de: 'Die stationär-psychiatrische Aufnahme erfolgte aufgrund einer zunehmenden psychischen Dekompensation …',
      en: 'Psychiatric inpatient admission was indicated due to increasing psychotic decompensation …',
      fr: "L'admission psychiatrique a été indiquée en raison d'une décompensation psychique croissante …",
      es: 'El ingreso psiquiátrico se indicó por descompensación psíquica creciente …',
    },
  },
  'psychopathologischer-ausgangsbefund': {
    description: {
      de: 'Initialer psychopathologischer Zustand als Ausgangsbasis — klinisch präzise, nicht überladen.',
      en: 'Initial psychopathological state as baseline — clinically precise, not overloaded.',
      fr: 'État psychopathologique initial comme base — précis cliniquement, sans surcharge.',
      es: 'Estado psicopatológico inicial como base — clínicamente preciso, sin sobrecarga.',
    },
    exampleHint: {
      de: 'Bei Aufnahme zeigte sich der Patient bewusstseinsklar und allseits orientiert …',
      en: 'On admission the patient was alert and fully oriented …',
      fr: "À l'admission, le patient était vigilant et orienté …",
      es: 'En el ingreso el paciente estaba alerta y orientado …',
    },
  },
  'initiales-stationsverhalten': {
    description: {
      de: 'Verhalten in den ersten Tagen/Wochen: Kooperation, Hygiene, Rückzug, Konflikte, Regelakzeptanz, Reizbarkeit, bgH/Fixierung.',
      en: 'Behaviour in the first days/weeks: cooperation, hygiene, withdrawal, conflicts, rule acceptance, irritability, restraint.',
      fr: 'Comportement dans les premiers jours/semaines : coopération, hygiène, retrait, conflits, acceptation des règles, irritabilité, contention.',
      es: 'Comportamiento en los primeros días/semanas: cooperación, higiene, retraimiento, conflictos, aceptación de normas, irritabilidad, contención.',
    },
    exampleHint: {
      de: 'Im initialen Stationsverlauf zeigte sich der Patient wechselhaft führbar …',
      en: 'In the initial ward course the patient was variably manageable …',
      fr: "Au début du séjour, le patient était variablement coopératif …",
      es: 'Al inicio del ingreso el paciente fue variablemente manejable …',
    },
  },
  'diagnostische-einordnung': {
    description: {
      de: 'Verbindung des klinischen Bildes mit Arbeitsdiagnose und therapeutischem Vorgehen.',
      en: 'Link clinical picture with working diagnosis and therapeutic approach.',
      fr: 'Relier le tableau clinique au diagnostic de travail et à la prise en charge.',
      es: 'Vincular el cuadro clínico con diagnóstico de trabajo y abordaje terapéutico.',
    },
    exampleHint: {
      de: 'Diagnostisch wurde der Verlauf als psychotische Dekompensation eingeordnet …',
      en: 'The course was classified as psychotic decompensation …',
      fr: 'Le cours a été interprété comme une décompensation psychotique …',
      es: 'La evolución se clasificó como descompensación psicótica …',
    },
  },
  'psychopharmakologische-behandlung': {
    description: {
      de: 'Medikation chronologisch mit Begründung für Änderungen, Verträglichkeit, Compliance und Depot.',
      en: 'Medication chronologically with rationale for changes, tolerability, compliance and depot.',
      fr: 'Médication chronologique avec justification des changements, tolérance, observance et dépôt.',
      es: 'Medicación cronológica con justificación de cambios, tolerabilidad, adherencia y depósito.',
    },
    exampleHint: {
      de: 'Die psychopharmakologische Behandlung wurde im Verlauf mehrfach angepasst …',
      en: 'Psychopharmacological treatment was adjusted several times during the course …',
      fr: 'Le traitement psychopharmacologique a été ajusté plusieurs fois …',
      es: 'El tratamiento psicofarmacológico se ajustó varias veces …',
    },
  },
  'therapeutische-massnahmen': {
    description: {
      de: 'Multimodale Behandlung: Gespräche, Psychoedukation, Ergo-, Bewegungs- und Milieutherapie, ADL/Hygiene.',
      en: 'Multimodal treatment: interviews, psychoeducation, occupational and movement therapy, milieu therapy, ADL/hygiene.',
      fr: 'Traitement multimodal : entretiens, psychoéducation, ergo-, mouvement et thérapie de milieu, AVQ/hygiène.',
      es: 'Tratamiento multimodal: entrevistas, psicoeducación, terapia ocupacional, movimiento, terapia de medio, AVD/higiene.',
    },
    exampleHint: {
      de: 'Neben der medikamentösen Behandlung erfolgten regelmäßige ärztliche und pflegerische Gespräche …',
      en: 'Besides medication, regular medical and nursing interviews were conducted …',
      fr: 'Outre la médication, des entretiens médicaux et infirmiers réguliers ont eu lieu …',
      es: 'Además de la medicación, se realizaron entrevistas médicas y de enfermería …',
    },
  },
  'besondere-ereignisse': {
    description: {
      de: 'Fixierung, bgH, Zwangsmedikation, Ess-/Trinkverweigerung, Konsile, Aggression, Suizidalität — sachlich und datiert.',
      en: 'Restraint, involuntary treatment, forced medication, refusal to eat/drink, consultations, aggression, suicidality — factual and dated.',
      fr: 'Contention, traitement sous contrainte, médication forcée, refus alimentaire, consultations, agression, suicidalité — factuel et daté.',
      es: 'Contención, tratamiento involuntario, medicación forzada, rechazo de comida, consultas, agresión, suicidalidad — factual y fechado.',
    },
    exampleHint: {
      de: 'Im Verlauf kam es zu einzelnen besonderen Ereignissen mit vorübergehend erhöhter Anspannung …',
      en: 'During the course there were isolated special incidents with temporarily increased tension …',
      fr: 'Au cours du séjour, des événements particuliers avec tension accrue temporaire sont survenus …',
      es: 'Durante la evolución hubo eventos especiales con tensión aumentada temporalmente …',
    },
  },
  'stabilisierung-besserung': {
    description: {
      de: 'Kontrast zum Aufnahmezustand: Besserung, Kooperation, Restsymptomatik — ohne übertriebene Remissionsdarstellung.',
      en: 'Contrast to admission state: improvement, cooperation, residual symptoms — without overstating remission.',
      fr: "Contraste avec l'état à l'admission : amélioration, coopération, symptômes résiduels — sans surestimer la rémission.",
      es: 'Contraste con el ingreso: mejoría, cooperación, síntomas residuales — sin exagerar la remisión.',
    },
    exampleHint: {
      de: 'Im weiteren Verlauf zeigte sich unter der etablierten Behandlung eine zunehmende psychische Stabilisierung …',
      en: 'Later in the course, increasing psychiatric stabilization was observed under established treatment …',
      fr: 'Par la suite, une stabilisation psychique croissante a été observée …',
      es: 'Más adelante se observó una estabilización psíquica creciente …',
    },
  },
  'entlassungs-rueckverlegungszustand': {
    description: {
      de: 'Zustand bei Entlassung oder Rückverlegung — psychisch, somatisch und bezüglich Gefährdung.',
      en: 'State at discharge or transfer back — psychiatric, somatic and regarding risk.',
      fr: "État au moment de la sortie ou du transfert — psychique, somatique et risque.",
      es: 'Estado al alta o traslado — psíquico, somático y riesgo.',
    },
    exampleHint: {
      de: 'Die Rückverlegung erfolgte in ausreichend stabilem psychischen und somatischen Zustand …',
      en: 'Transfer back occurred in a sufficiently stable psychiatric and somatic state …',
      fr: 'Le transfert a eu lieu dans un état psychique et somatique suffisamment stable …',
      es: 'El traslado se realizó en un estado psíquico y somático suficientemente estable …',
    },
  },
  'empfehlungen-hinweise': {
    description: {
      de: 'Fortführungsplan: Medikation, Kontrollen, überwachte Einnahme — zurückhaltend formuliert.',
      en: 'Continuation plan: medication, follow-up, supervised intake — cautiously worded.',
      fr: 'Plan de poursuite : médication, contrôles, prise surveillée — formulation prudente.',
      es: 'Plan de continuidad: medicación, controles, toma supervisada — redacción prudente.',
    },
    exampleHint: {
      de: 'Es wird empfohlen, die etablierte Medikation fortzuführen und eine ambulante Kontrolle zu vereinbaren …',
      en: 'It is recommended to continue established medication and arrange outpatient follow-up …',
      fr: 'Il est recommandé de poursuivre la médication établie et d’organiser un suivi ambulatoire …',
      es: 'Se recomienda continuar la medicación establecida y organizar seguimiento ambulatorio …',
    },
  },
}

/** Frequently reused AMDP checklist hints (German source → localized). */
export const checklistHintTranslations: Record<string, LocalizedHint> = {
  'Beobachtung: wirkt klar / benommen / somnolent / soporös': {
    de: 'Beobachtung: wirkt klar / benommen / somnolent / soporös',
    en: 'Observation: appears alert / drowsy / somnolent / stuporous',
    fr: 'Observation : paraît vigilant / confus / somnolent / stuporeux',
    es: 'Observación: parece alerta / somnoliento / estuporoso',
  },
  'Zeit, Ort, Person, Situation erfragen': {
    de: 'Zeit, Ort, Person, Situation erfragen',
    en: 'Assess orientation to time, place, person and situation',
    fr: 'Évaluer orientation temps, lieu, personne, situation',
    es: 'Evaluar orientación en tiempo, lugar, persona y situación',
  },
  '„Welches Datum haben wir heute?“': {
    de: '„Welches Datum haben wir heute?“',
    en: '"What date is it today?"',
    fr: '« Quelle date sommes-nous aujourd’hui ? »',
    es: '«¿Qué fecha es hoy?»',
  },
  '„Wo sind wir gerade?“': {
    de: '„Wo sind wir gerade?“',
    en: '"Where are we right now?"',
    fr: '« Où sommes-nous en ce moment ? »',
    es: '«¿Dónde estamos ahora?»',
  },
  '„Wie heißen Sie?“': {
    de: '„Wie heißen Sie?“',
    en: '"What is your name?"',
    fr: '« Comment vous appelez-vous ? »',
    es: '«¿Cómo se llama?»',
  },
  '„Warum sind Sie hier?“': {
    de: '„Warum sind Sie hier?“',
    en: '"Why are you here?"',
    fr: '« Pourquoi êtes-vous ici ? »',
    es: '«¿Por qué está aquí?»',
  },
  'Haben Sie daran gedacht, sich etwas anzutun?': {
    de: 'Haben Sie daran gedacht, sich etwas anzutun?',
    en: 'Have you thought about harming yourself?',
    fr: 'Avez-vous pensé à vous faire du mal ?',
    es: '¿Ha pensado en hacerse daño?',
  },
}

export function getTherapieVerlaufHint(
  sectionId: string,
  field: 'description' | 'exampleHint',
  language: UiLanguage,
): string | undefined {
  return therapieVerlaufHintTranslations[sectionId]?.[field]?.[language]
}

export function getChecklistHintTranslation(
  germanHint: string,
  language: UiLanguage,
): string {
  return checklistHintTranslations[germanHint]?.[language] ?? germanHint
}
