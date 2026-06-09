import type { EnglishVariant, UiLanguage } from '../types/settings'
import type { WorkspaceChecklistItem } from '../types/workspaceSettings'
import { getPsychopathNormalBefundHeading as resolvePsychopathNormalBefundHeading } from './psychopathTitles'

type Localized = Record<UiLanguage, string>

/** @deprecated Use getPsychopathNormalBefundHeading(language, englishVariant) */
export const psychopathNormalBefundHeading: Localized = {
  de: 'Psychopathologischer Befund, AMDP-orientiert',
  en: 'Mental State Examination',
  fr: 'Examen psychiatrique',
  es: 'Exploración psicopatológica',
}

export const psychopathSectionDescriptions: Record<string, Localized> = {
  bewusstsein: {
    de: 'Vigilanz und Orientierung',
    en: 'Vigilance and orientation',
    fr: 'Vigilance et orientation',
    es: 'Vigilancia y orientación',
  },
}

export const psychopathChecklistGroupTranslations: Record<string, Localized> = {
  "Vigilanz": { de: "Vigilanz", en: "Vigilance", fr: "Vigilance", es: "Vigilancia" },
  "Orientierung": { de: "Orientierung", en: "Orientation", fr: "Orientation", es: "Orientación" },
  "Aufmerksamkeit / Konzentration": { de: "Aufmerksamkeit / Konzentration", en: "Attention / Concentration", fr: "Attention / Concentration", es: "Atención / Concentración" },
  "Gedächtnis": { de: "Gedächtnis", en: "Memory", fr: "Mémoire", es: "Memoria" },
  "Sprechtempo / Gedankenfluss": { de: "Sprechtempo / Gedankenfluss", en: "Speech rate / Thought flow", fr: "Débit de parole / Flux de pensée", es: "Ritmo del habla / Flujo de pensamiento" },
  "Kohärenz": { de: "Kohärenz", en: "Coherence", fr: "Cohérence", es: "Coherencia" },
  "Wahn": { de: "Wahn", en: "Delusions", fr: "Délire", es: "Delirio" },
  "Zwangsgedanken": { de: "Zwangsgedanken", en: "Obsessive thoughts", fr: "Pensées obsessionnelles", es: "Pensamientos obsesivos" },
  "Halluzinationen": { de: "Halluzinationen", en: "Hallucinations", fr: "Hallucinations", es: "Alucinaciones" },
  "Illusionen": { de: "Illusionen", en: "Illusions", fr: "Illusions", es: "Ilusiones" },
  "Gedankeneingebung / -entzug / -ausbreitung": { de: "Gedankeneingebung / -entzug / -ausbreitung", en: "Thought insertion / withdrawal / broadcasting", fr: "Insertion / retrait / diffusion de pensées", es: "Inserción / retiro / difusión de pensamientos" },
  "Depersonalisation / Derealisation": { de: "Depersonalisation / Derealisation", en: "Depersonalization / Derealization", fr: "Dépersonnalisation / Déréalisation", es: "Despersonalización / Desrealización" },
  "Stimmung": { de: "Stimmung", en: "Mood", fr: "Humeur", es: "Estado de ánimo" },
  "Affekt": { de: "Affekt", en: "Affect", fr: "Affect", es: "Afecto" },
  "Angst": { de: "Angst", en: "Anxiety", fr: "Anxiété", es: "Ansiedad" },
  "Anhedonie": { de: "Anhedonie", en: "Anhedonia", fr: "Anhédonie", es: "Anhedonia" },
  "Antrieb": { de: "Antrieb", en: "Drive", fr: "Pulsion", es: "Impulso" },
  "Psychomotorik": { de: "Psychomotorik", en: "Psychomotor activity", fr: "Psychomotricité", es: "Psicomotricidad" },
  "Suizidalität": { de: "Suizidalität", en: "Suicidality", fr: "Suicidalité", es: "Suicidalidad" },
  "Fremdgefährdung": { de: "Fremdgefährdung", en: "Risk to others", fr: "Danger pour autrui", es: "Riesgo para terceros" },
  "Allgemein": { de: "Allgemein", en: "General", fr: "Général", es: "General" },
  "Schlaf": { de: "Schlaf", en: "Sleep", fr: "Sommeil", es: "Sueño" },
  "Appetit / Gewicht": { de: "Appetit / Gewicht", en: "Appetite / Weight", fr: "Appétit / Poids", es: "Apetito / Peso" },
  "Sexualität": { de: "Sexualität", en: "Sexuality", fr: "Sexualité", es: "Sexualidad" },
  "Beobachtung": { de: "Beobachtung", en: "Observation", fr: "Observation", es: "Observación" },
}

export const psychopathChecklistItemTranslations: Record<string, { label: Localized; text: Localized }> = {
  "vigilanz-klar": {
    label: { de: "Klar", en: "Alert", fr: "Vigilant", es: "Alerta" },
    text: { de: "klar", en: "alert", fr: "vigilant", es: "alerta" },
  },
  "vigilanz-benommen": {
    label: { de: "Benommen", en: "Drowsy", fr: "Confus", es: "Aturdido" },
    text: { de: "benommen", en: "drowsy", fr: "confus", es: "aturdido" },
  },
  "vigilanz-somnolent": {
    label: { de: "Somnolent", en: "Somnolent", fr: "Somnolent", es: "Somnoliento" },
    text: { de: "somnolent", en: "somnolent", fr: "somnolent", es: "somnoliento" },
  },
  "vigilanz-soporoes": {
    label: { de: "Soporös", en: "Stuporous", fr: "Stuporeux", es: "Estuporoso" },
    text: { de: "soporös", en: "stuporous", fr: "stuporeux", es: "estuporoso" },
  },
  "orientierung-voll": {
    label: { de: "Voll orientiert (Zeit, Ort, Person, Situation)", en: "Fully oriented (time, place, person, situation)", fr: "Orienté (temps, lieu, personne, situation)", es: "Orientado (tiempo, lugar, persona, situación)" },
    text: { de: "voll orientiert zu Zeit, Ort, Person, Situation", en: "fully oriented to time, place, person and situation", fr: "orienté en temps, lieu, personne et situation", es: "orientado en tiempo, lugar, persona y situación" },
  },
  "orientierung-zeit": {
    label: { de: "Desorientiert: Zeit", en: "Disoriented: time", fr: "Désorienté : temps", es: "Desorientado: tiempo" },
    text: { de: "desorientiert zur Zeit", en: "disoriented to time", fr: "désorienté dans le temps", es: "desorientado en el tiempo" },
  },
  "orientierung-ort": {
    label: { de: "Desorientiert: Ort", en: "Disoriented: place", fr: "Désorienté : lieu", es: "Desorientado: lugar" },
    text: { de: "desorientiert zum Ort", en: "disoriented to place", fr: "désorienté dans le lieu", es: "desorientado en el lugar" },
  },
  "orientierung-person": {
    label: { de: "Desorientiert: Person", en: "Disoriented: person", fr: "Désorienté : personne", es: "Desorientado: persona" },
    text: { de: "desorientiert zur Person", en: "disoriented to person", fr: "désorienté à la personne", es: "desorientado a la persona" },
  },
  "orientierung-situation": {
    label: { de: "Desorientiert: Situation", en: "Disoriented: situation", fr: "Désorienté : situation", es: "Desorientado: situación" },
    text: { de: "desorientiert zur Situation", en: "disoriented to situation", fr: "désorienté à la situation", es: "desorientado a la situación" },
  },
  "aufmerksamkeit-unaufffaellig": {
    label: { de: "Unauffällig", en: "Unremarkable", fr: "Sans particularité", es: "Sin alteraciones" },
    text: { de: "unauffällig", en: "unremarkable", fr: "sans particularité", es: "sin alteraciones" },
  },
  "aufmerksamkeit-vermindert": {
    label: { de: "Vermindert", en: "Reduced", fr: "Diminuée", es: "Disminuida" },
    text: { de: "vermindert", en: "reduced", fr: "diminuée", es: "disminuida" },
  },
  "aufmerksamkeit-gestoert": {
    label: { de: "Gestört", en: "Impaired", fr: "Altérée", es: "Alterada" },
    text: { de: "gestört", en: "impaired", fr: "altérée", es: "alterada" },
  },
  "gedaechtnis-kurzzeit-unaufffaellig": {
    label: { de: "Kurzzeitgedächtnis ungestört", en: "Short-term memory intact", fr: "Mémoire à court terme intacte", es: "Memoria a corto plazo intacta" },
    text: { de: "Kurzzeitgedächtnis ungestört", en: "short-term memory intact", fr: "mémoire à court terme intacte", es: "memoria a corto plazo intacta" },
  },
  "gedaechtnis-kurzzeit-gestoert": {
    label: { de: "Kurzzeitgedächtnis gestört", en: "Short-term memory impaired", fr: "Mémoire à court terme altérée", es: "Memoria a corto plazo alterada" },
    text: { de: "Kurzzeitgedächtnis gestört", en: "short-term memory impaired", fr: "mémoire à court terme altérée", es: "memoria a corto plazo alterada" },
  },
  "gedaechtnis-langzeit-unaufffaellig": {
    label: { de: "Langzeitgedächtnis ungestört", en: "Long-term memory intact", fr: "Mémoire à long terme intacte", es: "Memoria a largo plazo intacta" },
    text: { de: "Langzeitgedächtnis ungestört", en: "long-term memory intact", fr: "mémoire à long terme intacte", es: "memoria a largo plazo intacta" },
  },
  "gedaechtnis-langzeit-gestoert": {
    label: { de: "Langzeitgedächtnis gestört", en: "Long-term memory impaired", fr: "Mémoire à long terme altérée", es: "Memoria a largo plazo alterada" },
    text: { de: "Langzeitgedächtnis gestört", en: "long-term memory impaired", fr: "mémoire à long terme altérée", es: "memoria a largo plazo alterada" },
  },
  "formal-geordnet": {
    label: { de: "Geordnet", en: "Organized", fr: "Organisé", es: "Organizado" },
    text: { de: "geordnet", en: "organized", fr: "organisé", es: "organizado" },
  },
  "formal-verlangsamt": {
    label: { de: "Verlangsamt", en: "Slowed", fr: "Ralenti", es: "Ralentizado" },
    text: { de: "verlangsamt", en: "slowed", fr: "ralenti", es: "ralentizado" },
  },
  "formal-beschleunigt": {
    label: { de: "Beschleunigt", en: "Accelerated", fr: "Accéléré", es: "Acelerado" },
    text: { de: "beschleunigt", en: "accelerated", fr: "accéléré", es: "acelerado" },
  },
  "formal-umstaendlich": {
    label: { de: "Umständlich", en: "Circumstantial", fr: "Circulaire", es: "Circunstancial" },
    text: { de: "umständlich", en: "circumstantial", fr: "circulaire", es: "circunstancial" },
  },
  "formal-kohaerent": {
    label: { de: "Kohärent", en: "Coherent", fr: "Cohérent", es: "Coherente" },
    text: { de: "kohärent", en: "coherent", fr: "cohérent", es: "coherente" },
  },
  "formal-inkohaerent": {
    label: { de: "Inkohärent", en: "Incoherent", fr: "Incohérent", es: "Incoherente" },
    text: { de: "inkohärent", en: "incoherent", fr: "incohérent", es: "incoherente" },
  },
  "formal-ideenflucht": {
    label: { de: "Ideenflucht", en: "Flight of ideas", fr: "Fuite des idées", es: "Fuga de ideas" },
    text: { de: "Ideenflucht", en: "flight of ideas", fr: "fuite des idées", es: "fuga de ideas" },
  },
  "formal-perseveration": {
    label: { de: "Perseverationen", en: "Perseverations", fr: "Persévérations", es: "Perseveraciones" },
    text: { de: "Perseverationen", en: "perseverations", fr: "persévérations", es: "perseveraciones" },
  },
  "inhalt-keine-stoerungen": {
    label: { de: "Keine Denkstörungen", en: "No thought disorder", fr: "Pas de trouble de pensée", es: "Sin trastorno del pensamiento" },
    text: { de: "keine Denkstörungen", en: "no thought disorder", fr: "pas de trouble de pensée", es: "sin trastorno del pensamiento" },
  },
  "inhalt-verfolgungswahn": {
    label: { de: "Verfolgungswahn", en: "Persecutory delusion", fr: "Délire de persécution", es: "Delirio persecutorio" },
    text: { de: "Verfolgungswahn", en: "persecutory delusion", fr: "délire de persécution", es: "delirio persecutorio" },
  },
  "inhalt-grossenwahn": {
    label: { de: "Größenwahn", en: "Grandiose delusion", fr: "Délire de grandeur", es: "Delirio de grandeza" },
    text: { de: "Größenwahn", en: "grandiose delusion", fr: "délire de grandeur", es: "delirio de grandeza" },
  },
  "inhalt-beziehungswahn": {
    label: { de: "Beziehungswahn", en: "Delusion of reference", fr: "Délire de référence", es: "Delirio de referencia" },
    text: { de: "Beziehungswahn", en: "delusion of reference", fr: "délire de référence", es: "delirio de referencia" },
  },
  "inhalt-zwangsgedanken-nein": {
    label: { de: "Keine Zwangsgedanken", en: "No obsessive thoughts", fr: "Pas de pensées obsessionnelles", es: "Sin pensamientos obsesivos" },
    text: { de: "keine Zwangsgedanken", en: "no obsessive thoughts", fr: "pas de pensées obsessionnelles", es: "sin pensamientos obsesivos" },
  },
  "inhalt-zwangsgedanken-ja": {
    label: { de: "Zwangsgedanken", en: "Obsessive thoughts", fr: "Pensées obsessionnelles", es: "Pensamientos obsesivos" },
    text: { de: "Zwangsgedanken", en: "obsessive thoughts", fr: "pensées obsessionnelles", es: "pensamientos obsesivos" },
  },
  "wahrnehmung-keine-halluzinationen": {
    label: { de: "Keine Halluzinationen", en: "No hallucinations", fr: "Pas d'hallucinations", es: "Sin alucinaciones" },
    text: { de: "keine Halluzinationen", en: "no hallucinations", fr: "pas d'hallucinations", es: "sin alucinaciones" },
  },
  "wahrnehmung-akustisch": {
    label: { de: "Akustische Halluzinationen", en: "Auditory hallucinations", fr: "Hallucinations auditives", es: "Alucinaciones auditivas" },
    text: { de: "akustische Halluzinationen", en: "auditory hallucinations", fr: "hallucinations auditives", es: "alucinaciones auditivas" },
  },
  "wahrnehmung-optisch": {
    label: { de: "Optische Halluzinationen", en: "Visual hallucinations", fr: "Hallucinations visuelles", es: "Alucinaciones visuales" },
    text: { de: "optische Halluzinationen", en: "visual hallucinations", fr: "hallucinations visuelles", es: "alucinaciones visuales" },
  },
  "wahrnehmung-koerperlich": {
    label: { de: "Körperliche Halluzinationen", en: "Somatic hallucinations", fr: "Hallucinations somatiques", es: "Alucinaciones somáticas" },
    text: { de: "körperliche Halluzinationen", en: "somatic hallucinations", fr: "hallucinations somatiques", es: "alucinaciones somáticas" },
  },
  "wahrnehmung-keine-illusionen": {
    label: { de: "Keine Illusionen", en: "No illusions", fr: "Pas d'illusions", es: "Sin ilusiones" },
    text: { de: "keine Illusionen", en: "no illusions", fr: "pas d'illusions", es: "sin ilusiones" },
  },
  "wahrnehmung-illusionen": {
    label: { de: "Illusionen", en: "Illusions", fr: "Illusions", es: "Ilusiones" },
    text: { de: "Illusionen", en: "illusions", fr: "illusions", es: "ilusiones" },
  },
  "ich-keine": {
    label: { de: "Keine Ich-Störungen", en: "None", fr: "Aucune", es: "Ninguna" },
    text: { de: "keine", en: "none", fr: "aucune", es: "ninguna" },
  },
  "ich-eingebung": {
    label: { de: "Gedankeneingebung", en: "Thought insertion", fr: "Insertion de pensées", es: "Inserción de pensamientos" },
    text: { de: "Gedankeneingebung", en: "thought insertion", fr: "insertion de pensées", es: "inserción de pensamientos" },
  },
  "ich-entzug": {
    label: { de: "Gedankenentzug", en: "Thought withdrawal", fr: "Retrait de pensées", es: "Retiro de pensamientos" },
    text: { de: "Gedankenentzug", en: "thought withdrawal", fr: "retrait de pensées", es: "retiro de pensamientos" },
  },
  "ich-ausbreitung": {
    label: { de: "Gedankenausbreitung", en: "Thought broadcasting", fr: "Diffusion de pensées", es: "Difusión de pensamientos" },
    text: { de: "Gedankenausbreitung", en: "thought broadcasting", fr: "diffusion de pensées", es: "difusión de pensamientos" },
  },
  "ich-depersonalisation": {
    label: { de: "Depersonalisation", en: "Depersonalization", fr: "Dépersonnalisation", es: "Despersonalización" },
    text: { de: "Depersonalisation", en: "depersonalization", fr: "dépersonnalisation", es: "despersonalización" },
  },
  "ich-derealisation": {
    label: { de: "Derealisation", en: "Derealization", fr: "Déréalisation", es: "Desrealización" },
    text: { de: "Derealisation", en: "derealization", fr: "déréalisation", es: "desrealización" },
  },
  "affekt-euthym": {
    label: { de: "Euthym", en: "Euthymic", fr: "Euthymique", es: "Eutímico" },
    text: { de: "euthym", en: "euthymic", fr: "euthymique", es: "eutímico" },
  },
  "affekt-gedrueckt": {
    label: { de: "Gedrückt", en: "Depressed", fr: "Déprimé", es: "Deprimido" },
    text: { de: "gedrückt", en: "depressed", fr: "déprimé", es: "deprimido" },
  },
  "affekt-gehoben": {
    label: { de: "Gehoben", en: "Elevated", fr: "Exalté", es: "Elevado" },
    text: { de: "gehoben", en: "elevated", fr: "exalté", es: "elevado" },
  },
  "affekt-adäquat": {
    label: { de: "Adäquat moduliert", en: "Adequately modulated", fr: "Modulé de façon adéquate", es: "Modulado adecuadamente" },
    text: { de: "adäquat moduliert", en: "adequately modulated", fr: "modulé de façon adéquate", es: "modulado adecuadamente" },
  },
  "affekt-affektarm": {
    label: { de: "Affektarm", en: "Blunted affect", fr: "Affect pauvre", es: "Afecto empobrecido" },
    text: { de: "affektarm", en: "blunted affect", fr: "affect pauvre", es: "afecto empobrecido" },
  },
  "affekt-labil": {
    label: { de: "Labil", en: "Labile", fr: "Labile", es: "Lábil" },
    text: { de: "labil", en: "labile", fr: "labile", es: "lábil" },
  },
  "affekt-inadaequat": {
    label: { de: "Inadäquat", en: "Inappropriate", fr: "Inadéquat", es: "Inadecuado" },
    text: { de: "inadäquat", en: "inappropriate", fr: "inadéquat", es: "inadecuado" },
  },
  "affekt-keine-angst": {
    label: { de: "Keine Angst", en: "No anxiety", fr: "Pas d'anxiété", es: "Sin ansiedad" },
    text: { de: "keine Angst", en: "no anxiety", fr: "pas d'anxiété", es: "sin ansiedad" },
  },
  "affekt-angst": {
    label: { de: "Angst", en: "Anxiety", fr: "Anxiété", es: "Ansiedad" },
    text: { de: "Angst", en: "anxiety", fr: "anxiété", es: "ansiedad" },
  },
  "affekt-anhedonie-nein": {
    label: { de: "Keine Anhedonie", en: "No anhedonia", fr: "Pas d'anhédonie", es: "Sin anhedonia" },
    text: { de: "keine Anhedonie", en: "no anhedonia", fr: "pas d'anhédonie", es: "sin anhedonia" },
  },
  "affekt-anhedonie-ja": {
    label: { de: "Anhedonie", en: "Anhedonia", fr: "Anhédonie", es: "Anhedonia" },
    text: { de: "Anhedonie", en: "anhedonia", fr: "anhédonie", es: "anhedonia" },
  },
  "antrieb-unaufffaellig": {
    label: { de: "Unauffällig", en: "Unremarkable", fr: "Sans particularité", es: "Sin alteraciones" },
    text: { de: "unauffällig", en: "unremarkable", fr: "sans particularité", es: "sin alteraciones" },
  },
  "antrieb-vermindert": {
    label: { de: "Vermindert", en: "Reduced", fr: "Diminué", es: "Disminuido" },
    text: { de: "vermindert", en: "reduced", fr: "diminué", es: "disminuido" },
  },
  "antrieb-gesteigert": {
    label: { de: "Gesteigert", en: "Increased", fr: "Augmenté", es: "Aumentado" },
    text: { de: "gesteigert", en: "increased", fr: "augmenté", es: "aumentado" },
  },
  "antrieb-gehemmt": {
    label: { de: "Gehemmt", en: "Inhibited", fr: "Inhibé", es: "Inhibido" },
    text: { de: "gehemmt", en: "inhibited", fr: "inhibé", es: "inhibido" },
  },
  "psycho-unaufffaellig": {
    label: { de: "Unauffällig", en: "Unremarkable", fr: "Sans particularité", es: "Sin alteraciones" },
    text: { de: "unauffällig", en: "unremarkable", fr: "sans particularité", es: "sin alteraciones" },
  },
  "psycho-verlangsamt": {
    label: { de: "Verlangsamt", en: "Slowed", fr: "Ralenti", es: "Ralentizado" },
    text: { de: "verlangsamt", en: "slowed", fr: "ralenti", es: "ralentizado" },
  },
  "psycho-unruhig": {
    label: { de: "Unruhig", en: "Restless", fr: "Agité", es: "Inquieto" },
    text: { de: "unruhig", en: "restless", fr: "agité", es: "inquieto" },
  },
  "psycho-erstarrt": {
    label: { de: "Erstarrt", en: "Stuporous / frozen", fr: "Stuporeux / figé", es: "Estuporoso / rígido" },
    text: { de: "erstarrt", en: "stuporous", fr: "stuporeux", es: "estuporoso" },
  },
  "psycho-stereotyp": {
    label: { de: "Stereotypes Verhalten", en: "Stereotyped behaviour", fr: "Comportement stéréotypé", es: "Comportamiento estereotipado" },
    text: { de: "stereotypes Verhalten", en: "stereotyped behaviour", fr: "comportement stéréotypé", es: "comportamiento estereotipado" },
  },
  "suizid-verneint": {
    label: { de: "Verneint", en: "Denied", fr: "Nie", es: "Negado" },
    text: { de: "verneint", en: "denied", fr: "nié", es: "negado" },
  },
  "suizid-gedanken": {
    label: { de: "Suizidgedanken", en: "Suicidal thoughts", fr: "Idées suicidaires", es: "Ideas suicidas" },
    text: { de: "Suizidgedanken", en: "suicidal thoughts", fr: "idées suicidaires", es: "ideas suicidas" },
  },
  "suizid-plaene": {
    label: { de: "Konkrete Pläne", en: "Concrete plans", fr: "Projets concrets", es: "Planes concretos" },
    text: { de: "konkrete Suizidpläne", en: "concrete suicidal plans", fr: "projets suicidaires concrets", es: "planes suicidas concretos" },
  },
  "fremd-verneint": {
    label: { de: "Keine Fremdgefährdung", en: "No risk to others", fr: "Pas de danger pour autrui", es: "Sin riesgo para terceros" },
    text: { de: "keine Fremdgefährdung", en: "no risk to others", fr: "pas de danger pour autrui", es: "sin riesgo para terceros" },
  },
  "fremd-ja": {
    label: { de: "Fremdgefährdung", en: "Risk to others", fr: "Danger pour autrui", es: "Riesgo para terceros" },
    text: { de: "Fremdgefährdung", en: "risk to others", fr: "danger pour autrui", es: "riesgo para terceros" },
  },
  "vegetativ-unaufffaellig": {
    label: { de: "Unauffällig", en: "Unremarkable", fr: "Sans particularité", es: "Sin alteraciones" },
    text: { de: "unauffällig", en: "unremarkable", fr: "sans particularité", es: "sin alteraciones" },
  },
  "vegetativ-schlaf-reduziert": {
    label: { de: "Schlaf reduziert", en: "Reduced sleep", fr: "Sommeil réduit", es: "Sueño reducido" },
    text: { de: "Schlaf reduziert", en: "reduced sleep", fr: "sommeil réduit", es: "sueño reducido" },
  },
  "vegetativ-schlaf-gestoert": {
    label: { de: "Schlaf gestört", en: "Disturbed sleep", fr: "Sommeil perturbé", es: "Sueño alterado" },
    text: { de: "Schlaf gestört", en: "disturbed sleep", fr: "sommeil perturbé", es: "sueño alterado" },
  },
  "vegetativ-appetit-vermindert": {
    label: { de: "Appetit vermindert", en: "Reduced appetite", fr: "Appétit diminué", es: "Apetito disminuido" },
    text: { de: "Appetit vermindert", en: "reduced appetite", fr: "appétit diminué", es: "apetito disminuido" },
  },
  "vegetativ-appetit-gesteigert": {
    label: { de: "Appetit gesteigert", en: "Increased appetite", fr: "Appétit augmenté", es: "Apetito aumentado" },
    text: { de: "Appetit gesteigert", en: "increased appetite", fr: "appétit augmenté", es: "apetito aumentado" },
  },
  "vegetativ-sexualitaet-vermindert": {
    label: { de: "Sexualität vermindert", en: "Reduced libido", fr: "Libido diminuée", es: "Libido disminuida" },
    text: { de: "Sexualität vermindert", en: "reduced libido", fr: "libido diminuée", es: "libido disminuida" },
  },
  "sozial-unaufffaellig": {
    label: { de: "Unauffällig", en: "Unremarkable", fr: "Sans particularité", es: "Sin alteraciones" },
    text: { de: "unauffällig", en: "unremarkable", fr: "sans particularité", es: "sin alteraciones" },
  },
  "sozial-zurueckhaltend": {
    label: { de: "Zurückhaltend", en: "Reserved", fr: "Réservé", es: "Reservado" },
    text: { de: "zurückhaltend", en: "reserved", fr: "réservé", es: "reservado" },
  },
  "sozial-kooperativ": {
    label: { de: "Kooperativ", en: "Cooperative", fr: "Coopératif", es: "Cooperativo" },
    text: { de: "kooperativ", en: "cooperative", fr: "coopératif", es: "cooperativo" },
  },
  "sozial-distanziert": {
    label: { de: "Distanziert", en: "Distant", fr: "Distant", es: "Distante" },
    text: { de: "distanziert", en: "distant", fr: "distant", es: "distante" },
  },
  "sozial-aggressiv": {
    label: { de: "Aggressiv / feindselig", en: "Aggressive / hostile", fr: "Agressif / hostile", es: "Agresivo / hostil" },
    text: { de: "aggressiv / feindselig", en: "aggressive / hostile", fr: "agressif / hostile", es: "agresivo / hostil" },
  },
}

export const psychopathChecklistHintTranslations: Record<string, Localized> = {
  "Beobachtung: wirkt klar / benommen / somnolent / soporös": { de: "Beobachtung: wirkt klar / benommen / somnolent / soporös", en: "Observation: appears alert / drowsy / somnolent / stuporous", fr: "Observation : paraît vigilant / confus / somnolent / stuporeux", es: "Observación: parece alerta / somnoliento / estuporoso" },
  "Zeit, Ort, Person, Situation erfragen": { de: "Zeit, Ort, Person, Situation erfragen", en: "Assess orientation to time, place, person and situation", fr: "Évaluer orientation temps, lieu, personne, situation", es: "Evaluar orientación en tiempo, lugar, persona y situación" },
  "„Welches Datum haben wir heute?“": { de: "„Welches Datum haben wir heute?“", en: "\"What date is it today?\"", fr: "« Quelle date sommes-nous aujourd'hui ? »", es: "«¿Qué fecha es hoy?»" },
  "„Wo sind wir gerade?“": { de: "„Wo sind wir gerade?“", en: "\"Where are we right now?\"", fr: "« Où sommes-nous en ce moment ? »", es: "«¿Dónde estamos ahora?»" },
  "„Wie heißen Sie?“": { de: "„Wie heißen Sie?“", en: "\"What is your name?\"", fr: "« Comment vous appelez-vous ? »", es: "«¿Cómo se llama?»" },
  "„Wissen Sie, warum Sie hier sind?“": { de: "„Wissen Sie, warum Sie hier sind?“", en: "\"Do you know why you are here?\"", fr: "« Savez-vous pourquoi vous êtes ici ? »", es: "«¿Sabe por qué está aquí?»" },
  "„Bitte zählen Sie von 100 in 7er-Schritten rückwärts.“": { de: "„Bitte zählen Sie von 100 in 7er-Schritten rückwärts.“", en: "\"Please count backwards from 100 in steps of 7.\"", fr: "« Comptez à rebours de 100 par 7. »", es: "«Cuente hacia atrás desde 100 de 7 en 7.»" },
  "„Bitte wiederholen Sie diese drei Wörter … (nach 5 Minuten nochmals erfragen).“": { de: "„Bitte wiederholen Sie diese drei Wörter … (nach 5 Minuten nochmals erfragen).“", en: "\"Please repeat these three words … (re-ask after 5 minutes).\"", fr: "« Répétez ces trois mots … (redemander après 5 minutes). »", es: "«Repita estas tres palabras … (volver a preguntar tras 5 minutos).»" },
  "Kurzzeitgedächtnis: 3-Wort-Merkspanne": { de: "Kurzzeitgedächtnis: 3-Wort-Merkspanne", en: "Short-term memory: 3-word span", fr: "Mémoire à court terme : span de 3 mots", es: "Memoria a corto plazo: span de 3 palabras" },
  "„Was haben Sie gestern zu Mittag gegessen?“": { de: "„Was haben Sie gestern zu Mittag gegessen?“", en: "\"What did you have for lunch yesterday?\"", fr: "« Qu'avez-vous mangé hier à midi ? »", es: "«¿Qué comió ayer al mediodía?»" },
  "Beobachtung: geordnet, verlangsamt, beschleunigt, umständlich": { de: "Beobachtung: geordnet, verlangsamt, beschleunigt, umständlich", en: "Observation: organized, slowed, accelerated, circumstantial", fr: "Observation : organisé, ralenti, accéléré, circulaire", es: "Observación: organizado, ralentizado, acelerado, circunstancial" },
  "„Können Sie mir bitte erzählen, was in den letzten Tagen passiert ist?“": { de: "„Können Sie mir bitte erzählen, was in den letzten Tagen passiert ist?“", en: "\"Can you tell me what happened in the last few days?\"", fr: "« Pouvez-vous me raconter ce qui s'est passé ces derniers jours ? »", es: "«¿Puede contarme qué ha pasado en los últimos días?»" },
  "Achten auf: Abschweifen, Ideenflucht, Inkohärenz, Perseverationen": { de: "Achten auf: Abschweifen, Ideenflucht, Inkohärenz, Perseverationen", en: "Watch for: tangentiality, flight of ideas, incoherence, perseverations", fr: "Surveiller : digressions, fuite des idées, incohérence, persévérations", es: "Observar: divagaciones, fuga de ideas, incoherencia, perseveraciones" },
  "„Haben Sie Überzeugungen, von denen andere sagen, dass sie nicht stimmen?“": { de: "„Haben Sie Überzeugungen, von denen andere sagen, dass sie nicht stimmen?“", en: "\"Do you hold beliefs that others say are untrue?\"", fr: "« Avez-vous des convictions que d'autres jugent fausses ? »", es: "«¿Tiene creencias que otros dicen que no son ciertas?»" },
  "„Gibt es Menschen, die Ihnen schaden wollen?“": { de: "„Gibt es Menschen, die Ihnen schaden wollen?“", en: "\"Are there people who want to harm you?\"", fr: "« Y a-t-il des personnes qui veulent vous nuire ? »", es: "«¿Hay personas que quieren hacerle daño?»" },
  "Erfragen: Art, Systematisierung, bizarrer Inhalt": { de: "Erfragen: Art, Systematisierung, bizarrer Inhalt", en: "Ask about: type, systematization, bizarre content", fr: "Demander : type, systématisation, contenu bizarre", es: "Preguntar: tipo, sistematización, contenido bizarro" },
  "„Haben Sie Gedanken, die immer wiederkehren, obwohl Sie das nicht möchten?“": { de: "„Haben Sie Gedanken, die immer wiederkehren, obwohl Sie das nicht möchten?“", en: "\"Do you have thoughts that keep returning even though you do not want them?\"", fr: "« Avez-vous des pensées qui reviennent malgré vous ? »", es: "«¿Tiene pensamientos que vuelven aunque no los desee?»" },
  "Akustisch, optisch, körperlich erfragen": { de: "Akustisch, optisch, körperlich erfragen", en: "Ask about auditory, visual and somatic symptoms", fr: "Demander : auditif, visuel, somatique", es: "Preguntar: auditivo, visual, somático" },
  "„Hören Sie Stimmen, die andere nicht hören?“": { de: "„Hören Sie Stimmen, die andere nicht hören?“", en: "\"Do you hear voices that others do not hear?\"", fr: "« Entendez-vous des voix que les autres n'entendent pas ? »", es: "«¿Oye voces que otros no oyen?»" },
  "„Sehen Sie Dinge, die andere nicht sehen?“": { de: "„Sehen Sie Dinge, die andere nicht sehen?“", en: "\"Do you see things that others do not see?\"", fr: "« Voyez-vous des choses que les autres ne voient pas ? »", es: "«¿Ve cosas que otros no ven?»" },
  "„Fühlen Sie ungewöhnliche Berührungen oder Bewegungen im Körper?“": { de: "„Fühlen Sie ungewöhnliche Berührungen oder Bewegungen im Körper?“", en: "\"Do you feel unusual touches or movements in your body?\"", fr: "« Ressentez-vous des touchers ou mouvements inhabituels dans le corps ? »", es: "«¿Siente contactos o movimientos inusuales en el cuerpo?»" },
  "„Kommt es vor, dass sich Geräusche oder Bilder verändern?“": { de: "„Kommt es vor, dass sich Geräusche oder Bilder verändern?“", en: "\"Do sounds or images sometimes change?\"", fr: "« Les sons ou images changent-ils parfois ? »", es: "«¿Cambian a veces los sonidos o las imágenes?»" },
  "„Haben Sie das Gefühl, dass Gedanken von außen kommen oder weggenommen werden?“": { de: "„Haben Sie das Gefühl, dass Gedanken von außen kommen oder weggenommen werden?“", en: "\"Do you feel thoughts come from outside or are taken away?\"", fr: "« Avez-vous l'impression que des pensées viennent de l'extérieur ou sont retirées ? »", es: "«¿Siente que los pensamientos vienen de fuera o le son quitados?»" },
  "„Kommt es Ihnen manchmal so vor, als seien Sie nicht Sie selbst oder Ihre Umgebung nicht wirklich?“": { de: "„Kommt es Ihnen manchmal so vor, als seien Sie nicht Sie selbst oder Ihre Umgebung nicht wirklich?“", en: "\"Do you sometimes feel as if you are not yourself or your surroundings are not real?\"", fr: "« Avez-vous parfois l'impression de ne pas être vous-même ou que l'environnement n'est pas réel ? »", es: "«¿A veces siente que no es usted mismo o que el entorno no es real?»" },
  "„Wie fühlen Sie sich im Moment?“": { de: "„Wie fühlen Sie sich im Moment?“", en: "\"How do you feel right now?\"", fr: "« Comment vous sentez-vous en ce moment ? »", es: "«¿Cómo se siente en este momento?»" },
  "Beobachtung: verflacht, affektarm, labil, inadäquat": { de: "Beobachtung: verflacht, affektarm, labil, inadäquat", en: "Observation: flattened, blunted, labile, inappropriate", fr: "Observation : émoussement, pauvreté, labilité, inadéquation", es: "Observación: aplanado, empobrecido, lábil, inadecuado" },
  "Generalisiert, situativ, Panikattacken": { de: "Generalisiert, situativ, Panikattacken", en: "Generalized, situational, panic attacks", fr: "Généralisée, situationnelle, crises de panique", es: "Generalizada, situacional, ataques de pánico" },
  "„Macht Ihnen noch etwas Freude?“": { de: "„Macht Ihnen noch etwas Freude?“", en: "\"Does anything still give you pleasure?\"", fr: "« Quelque chose vous fait-il encore plaisir ? »", es: "«¿Algo todavía le da placer?»" },
  "Beobachtung: vermindert, gesteigert, gehemmt": { de: "Beobachtung: vermindert, gesteigert, gehemmt", en: "Observation: reduced, increased, inhibited", fr: "Observation : diminué, augmenté, inhibé", es: "Observación: disminuido, aumentado, inhibido" },
  "Bewegungsmuster: unruhig, erstarrt, bizarr, stereotypes Verhalten": { de: "Bewegungsmuster: unruhig, erstarrt, bizarr, stereotypes Verhalten", en: "Movement pattern: restless, frozen, bizarre, stereotyped behaviour", fr: "Motricité : agité, figé, bizarre, stéréotypé", es: "Patrón motor: inquieto, rígido, bizarro, estereotipado" },
  "„Haben Sie daran gedacht, sich etwas anzutun?“": { de: "„Haben Sie daran gedacht, sich etwas anzutun?“", en: "\"Have you thought about harming yourself?\"", fr: "« Avez-vous pensé à vous faire du mal ? »", es: "«¿Ha pensado en hacerse daño?»" },
  "„Haben Sie konkrete Pläne oder Vorbereitungen getroffen?“": { de: "„Haben Sie konkrete Pläne oder Vorbereitungen getroffen?“", en: "\"Have you made concrete plans or preparations?\"", fr: "« Avez-vous des projets ou préparatifs concrets ? »", es: "«¿Ha hecho planes o preparativos concretos?»" },
  "„Gab es den Gedanken, jemand anderem etwas anzutun?“": { de: "„Gab es den Gedanken, jemand anderem etwas anzutun?“", en: "\"Have you had thoughts of harming someone else?\"", fr: "« Avez-vous eu l'idée de nuire à quelqu'un d'autre ? »", es: "«¿Ha tenido ideas de hacer daño a otra persona?»" },
  "Schlaf, Appetit, Sexualität erfragen": { de: "Schlaf, Appetit, Sexualität erfragen", en: "Ask about sleep, appetite and sexuality", fr: "Demander : sommeil, appétit, sexualité", es: "Preguntar: sueño, apetito, sexualidad" },
  "„Wie schlafen Sie in letzter Zeit?“": { de: "„Wie schlafen Sie in letzter Zeit?“", en: "\"How have you been sleeping lately?\"", fr: "« Comment dormez-vous ces derniers temps ? »", es: "«¿Cómo ha dormido últimamente?»" },
  "„Hat sich Ihr Appetit verändert?“": { de: "„Hat sich Ihr Appetit verändert?“", en: "\"Has your appetite changed?\"", fr: "« Votre appétit a-t-il changé ? »", es: "«¿Ha cambiado su apetito?»" },
  "„Gab es Veränderungen bei Ihrer sexuellen Lust?“": { de: "„Gab es Veränderungen bei Ihrer sexuellen Lust?“", en: "\"Have there been changes in your libido?\"", fr: "« Y a-t-il eu des changements de libido ? »", es: "«¿Ha habido cambios en su libido?»" },
  "Blickkontakt, Gesprächsbereitschaft, Kooperation, Distanzverhalten": { de: "Blickkontakt, Gesprächsbereitschaft, Kooperation, Distanzverhalten", en: "Eye contact, willingness to talk, cooperation, distancing behaviour", fr: "Contact visuel, disponibilité au dialogue, coopération, distance", es: "Contacto visual, disposición al diálogo, cooperación, distanciamiento" },
}

export function translatePsychopathGroup(group: string | undefined, language: UiLanguage): string | undefined {
  if (!group) return group
  if (language === 'de') return group
  return psychopathChecklistGroupTranslations[group]?.[language] ?? group
}

export function translatePsychopathChecklistHint(hint: string | undefined, language: UiLanguage): string | undefined {
  if (!hint) return hint
  if (language === 'de') return hint
  return psychopathChecklistHintTranslations[hint]?.[language] ?? hint
}

export function translatePsychopathSectionDescription(
  sectionId: string,
  german: string | undefined,
  language: UiLanguage,
): string | undefined {
  if (!german) return german
  if (language === 'de') return german
  const localized = psychopathSectionDescriptions[sectionId]
  if (localized && german === localized.de) return localized[language]
  return german
}

export function localizePsychopathChecklistItem(
  item: WorkspaceChecklistItem,
  language: UiLanguage,
): WorkspaceChecklistItem {
  if (language === 'de') return item

  const translation = psychopathChecklistItemTranslations[item.id]
  return {
    ...item,
    label: translation?.label[language] ?? item.label,
    text: translation?.text[language] ?? item.text,
    group: translatePsychopathGroup(item.group, language),
    hint: translatePsychopathChecklistHint(item.hint, language),
  }
}

export function getPsychopathNormalBefundHeading(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  return resolvePsychopathNormalBefundHeading(language, englishVariant)
}
