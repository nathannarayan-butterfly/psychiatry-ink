import type { UiLanguage } from '../../types/settings'
import type {
  PsychotherapyPlan,
  SessionClinicalImprintMeta,
  SessionNote,
} from '../../types/psychotherapy'
import {
  translatePsychotherapyStatus,
  translateSessionSetting,
  translateTherapyMethod,
  translateTherapyStage,
} from '../../data/psychotherapyUiTranslations'

function formatDate(iso: string, language: UiLanguage): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    if (language === 'en') return `${dd}/${mm}/${yyyy}`
    return `${dd}.${mm}.${yyyy}`
  } catch {
    return iso
  }
}

interface ParagraphPhrases {
  sessionOn: (date: string, setting: string, duration: string) => string
  topic: (v: string) => string
  intervention: (v: string) => string
  reaction: (v: string) => string
  progress: (v: string) => string
  risk: (v: string) => string
  nextFocus: (v: string) => string
}

const PHRASES: Record<UiLanguage, ParagraphPhrases> = {
  de: {
    sessionOn: (date, setting, duration) =>
      `Am ${date} ${setting}-Sitzung${duration ? ` (${duration})` : ''}.`,
    topic: (v) => `Thema: ${v}.`,
    intervention: (v) => `Intervention: ${v}.`,
    reaction: (v) => `Patient zeigte ${v}.`,
    progress: (v) => `Fortschritt: ${v}.`,
    risk: (v) => `Risikoaspekte: ${v}.`,
    nextFocus: (v) => `Nächster Fokus: ${v}.`,
  },
  en: {
    sessionOn: (date, setting, duration) =>
      `On ${date}, ${setting} session${duration ? ` (${duration})` : ''}.`,
    topic: (v) => `Topic: ${v}.`,
    intervention: (v) => `Intervention: ${v}.`,
    reaction: (v) => `The patient showed ${v}.`,
    progress: (v) => `Progress: ${v}.`,
    risk: (v) => `Risk aspects: ${v}.`,
    nextFocus: (v) => `Next focus: ${v}.`,
  },
  fr: {
    sessionOn: (date, setting, duration) =>
      `Le ${date}, séance ${setting}${duration ? ` (${duration})` : ''}.`,
    topic: (v) => `Thème : ${v}.`,
    intervention: (v) => `Intervention : ${v}.`,
    reaction: (v) => `Le patient a montré ${v}.`,
    progress: (v) => `Progrès : ${v}.`,
    risk: (v) => `Aspects de risque : ${v}.`,
    nextFocus: (v) => `Prochain axe : ${v}.`,
  },
  es: {
    sessionOn: (date, setting, duration) =>
      `El ${date}, sesión ${setting}${duration ? ` (${duration})` : ''}.`,
    topic: (v) => `Tema: ${v}.`,
    intervention: (v) => `Intervención: ${v}.`,
    reaction: (v) => `El paciente mostró ${v}.`,
    progress: (v) => `Progreso: ${v}.`,
    risk: (v) => `Aspectos de riesgo: ${v}.`,
    nextFocus: (v) => `Próximo enfoque: ${v}.`,
  },
}

/** Rule-based composition of a readable clinical paragraph from structured session fields. */
export function generateSessionParagraph(
  note: Pick<
    SessionNote,
    'date' | 'setting' | 'duration' | 'topic' | 'intervention' | 'patientReaction' | 'progress' | 'riskAspects' | 'nextFocus'
  >,
  language: UiLanguage,
): string {
  const p = PHRASES[language] ?? PHRASES.de
  const setting = translateSessionSetting(language, note.setting).toLowerCase()
  const date = formatDate(note.date, language)

  const parts: string[] = [p.sessionOn(date, setting, note.duration.trim())]
  if (note.topic.trim()) parts.push(p.topic(note.topic.trim()))
  if (note.intervention.trim()) parts.push(p.intervention(note.intervention.trim()))
  if (note.patientReaction.trim()) parts.push(p.reaction(note.patientReaction.trim()))
  if (note.progress.trim()) parts.push(p.progress(note.progress.trim()))
  if (note.riskAspects.trim()) parts.push(p.risk(note.riskAspects.trim()))
  if (note.nextFocus.trim()) parts.push(p.nextFocus(note.nextFocus.trim()))

  return parts.join(' ')
}

/** Builds structured metadata for the Clinical Imprint layer from a session note. */
export function buildSessionImprintMeta(
  note: Pick<SessionNote, 'topic' | 'intervention' | 'progress' | 'riskAspects' | 'nextFocus'>,
  generatedParagraph: string,
): SessionClinicalImprintMeta {
  return {
    readableClinicalSentence: generatedParagraph,
    topic: note.topic.trim(),
    intervention: note.intervention.trim(),
    progress: note.progress.trim(),
    riskAspects: note.riskAspects.trim(),
    nextFocus: note.nextFocus.trim(),
  }
}

interface SummaryPhrases {
  intro: (status: string) => string
  stage: (v: string) => string
  goals: (v: string) => string
  methods: (v: string) => string
  sessions: (count: number, lastDate: string) => string
  nextFocus: (v: string) => string
  review: (v: string) => string
  noData: string
}

const SUMMARY_PHRASES: Record<UiLanguage, SummaryPhrases> = {
  de: {
    intro: (status) => `Psychotherapie (Status: ${status}).`,
    stage: (v) => `Aktuelle Phase: ${v}.`,
    goals: (v) => `Therapieziele: ${v}.`,
    methods: (v) => `Eingesetzte Methoden: ${v}.`,
    sessions: (count, lastDate) =>
      `Bisher ${count} dokumentierte Sitzung(en)${lastDate ? `, zuletzt am ${lastDate}` : ''}.`,
    nextFocus: (v) => `Nächster Fokus: ${v}.`,
    review: (v) => `Verlauf/Review: ${v}.`,
    noData: 'Noch keine Psychotherapie-Daten erfasst.',
  },
  en: {
    intro: (status) => `Psychotherapy (status: ${status}).`,
    stage: (v) => `Current stage: ${v}.`,
    goals: (v) => `Therapy goals: ${v}.`,
    methods: (v) => `Methods used: ${v}.`,
    sessions: (count, lastDate) =>
      `${count} documented session(s) so far${lastDate ? `, most recently on ${lastDate}` : ''}.`,
    nextFocus: (v) => `Next focus: ${v}.`,
    review: (v) => `Course/review: ${v}.`,
    noData: 'No psychotherapy data recorded yet.',
  },
  fr: {
    intro: (status) => `Psychothérapie (statut : ${status}).`,
    stage: (v) => `Phase actuelle : ${v}.`,
    goals: (v) => `Objectifs : ${v}.`,
    methods: (v) => `Méthodes employées : ${v}.`,
    sessions: (count, lastDate) =>
      `${count} séance(s) documentée(s) à ce jour${lastDate ? `, la dernière le ${lastDate}` : ''}.`,
    nextFocus: (v) => `Prochain axe : ${v}.`,
    review: (v) => `Évolution/révision : ${v}.`,
    noData: 'Aucune donnée de psychothérapie enregistrée.',
  },
  es: {
    intro: (status) => `Psicoterapia (estado: ${status}).`,
    stage: (v) => `Fase actual: ${v}.`,
    goals: (v) => `Objetivos: ${v}.`,
    methods: (v) => `Métodos empleados: ${v}.`,
    sessions: (count, lastDate) =>
      `${count} sesión(es) documentada(s) hasta ahora${lastDate ? `, la última el ${lastDate}` : ''}.`,
    nextFocus: (v) => `Próximo enfoque: ${v}.`,
    review: (v) => `Evolución/revisión: ${v}.`,
    noData: 'Sin datos de psicoterapia registrados.',
  },
}

/**
 * Rule-based composition of a readable summary paragraph from the plan + sessions.
 * NOT an AI diagnostic call — it only composes text from the structured fields,
 * for copy into Verlauf/Arztbrief.
 */
export function generatePsychotherapySummaryText(
  plan: PsychotherapyPlan,
  language: UiLanguage,
): string {
  const sp = SUMMARY_PHRASES[language] ?? SUMMARY_PHRASES.de

  const orderedStages = [...plan.stages].sort((a, b) => a.order - b.order)
  const activeStage = orderedStages.find((s) => s.status === 'active') ?? orderedStages.find((s) => s.status === 'planned')

  const goals = [
    ...plan.goals.shortTerm,
    ...plan.goals.mediumTerm,
    ...plan.goals.longTerm,
  ]
    .map((g) => g.text.trim())
    .filter(Boolean)
    .slice(0, 4)

  const methods = plan.methods
    .filter((m) => m.selected)
    .map((m) => translateTherapyMethod(language, m.methodId))

  const sortedSessions = [...plan.sessions].sort((a, b) => (a.date < b.date ? 1 : -1))
  const lastSession = sortedSessions[0]

  const hasAnything =
    plan.overview.status !== 'not-started' ||
    activeStage ||
    goals.length ||
    methods.length ||
    plan.sessions.length

  if (!hasAnything) return sp.noData

  const parts: string[] = [sp.intro(translatePsychotherapyStatus(language, plan.overview.status))]
  if (activeStage) parts.push(sp.stage(translateTherapyStage(language, activeStage.stageId)))
  if (goals.length) parts.push(sp.goals(goals.join('; ')))
  if (methods.length) parts.push(sp.methods(methods.join(', ')))
  if (plan.sessions.length) {
    parts.push(sp.sessions(plan.sessions.length, lastSession?.date ? formatDate(lastSession.date, language) : ''))
  }
  if (lastSession?.nextFocus?.trim()) parts.push(sp.nextFocus(lastSession.nextFocus.trim()))
  if (plan.review.progress?.trim()) parts.push(sp.review(plan.review.progress.trim()))

  return parts.join(' ')
}
