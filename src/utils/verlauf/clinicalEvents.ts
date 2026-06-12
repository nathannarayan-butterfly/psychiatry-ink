/**
 * Derived (virtual) Verlauf feed events.
 *
 * Reads the four Therapie data sources for a case and produces a flat list of
 * read-only, chronologically-sortable feed events. These are NOT persisted into
 * the verlaufFeed storage — they are recomputed on demand and merged with the
 * manually-authored verlauf entries at render time. Editing always happens in the
 * source Therapie section, so the feed never drifts from the source of truth.
 *
 * Readable text reuses the rule-based sentence layers already present in the
 * Therapie modules (psychotherapy `generatedParagraph`, medication dose lines)
 * and composes fluent German/EN/FR/ES text for the remaining sources.
 */

import type { UiLanguage } from '../../types/settings'
import type { MedicationChangeType } from '../../types/medicationPlan'
import type { SozialtherapieTarget } from '../../types/sozialtherapie'
import { loadMedicationPlanState } from '../medication/storage'
import { getCurrentPlan } from '../medication/planOps'
import { loadPsychotherapyPlan } from '../psychotherapy/storage'
import { generateSessionParagraph } from '../psychotherapy/sessionNote'
import { loadComplementaryTherapies } from '../complementaryTherapy/storage'
import { loadSozialtherapie } from '../sozialtherapie/storage'
import {
  translateSozialtherapieArea,
  translateSozialtherapieStatus,
} from '../../data/sozialtherapieUiTranslations'

/** Top-level provenance of a derived clinical feed event (also the filter category). */
export type ClinicalEventSource =
  | 'medikation'
  | 'psychotherapie'
  | 'komplementaer'
  | 'sozialtherapie'

export interface ClinicalFeedEvent {
  /** Deterministic, stable id derived from the source record. */
  id: string
  /** ISO 8601 (or YYYY-MM-DD) — used for chronological ordering. */
  date: string
  source: ClinicalEventSource
  /** Localized category label shown as the source badge (e.g. "Medikation"). */
  sourceLabel: string
  /** Specific subject (e.g. "Sertralin", "Sporttherapie", session topic). */
  title: string
  /** Readable, fluent body text. */
  body: string
}

// ---------------------------------------------------------------------------
// Localized source category labels
// ---------------------------------------------------------------------------

type LocaleMap = Record<UiLanguage, string>

const SOURCE_LABELS: Record<ClinicalEventSource, LocaleMap> = {
  medikation: { de: 'Medikation', en: 'Medication', fr: 'Médication', es: 'Medicación' },
  psychotherapie: {
    de: 'Psychotherapie',
    en: 'Psychotherapy',
    fr: 'Psychothérapie',
    es: 'Psicoterapia',
  },
  komplementaer: {
    de: 'Komplementär',
    en: 'Complementary',
    fr: 'Complémentaire',
    es: 'Complementaria',
  },
  sozialtherapie: {
    de: 'Sozialtherapie',
    en: 'Social therapy',
    fr: 'Thérapie sociale',
    es: 'Terapia social',
  },
}

export function translateClinicalEventSource(
  language: UiLanguage,
  source: ClinicalEventSource,
): string {
  return SOURCE_LABELS[source][language] ?? SOURCE_LABELS[source].de
}

// ---------------------------------------------------------------------------
// Medication
// ---------------------------------------------------------------------------

type MedicationPhrase = (doseLine: string) => string

const MEDICATION_PHRASES: Record<UiLanguage, Record<MedicationChangeType, MedicationPhrase>> = {
  de: {
    start: (d) => `${d} begonnen.`,
    increase: (d) => `Dosis erhöht: ${d}.`,
    decrease: (d) => `Dosis reduziert: ${d}.`,
    timing: (d) => `Einnahmezeitpunkt angepasst: ${d}.`,
    formulation: (d) => `Darreichungsform geändert: ${d}.`,
    pause: (d) => `${d} pausiert.`,
    discontinue: (d) => `${d} abgesetzt.`,
    restart: (d) => `${d} wieder angesetzt.`,
    prn: (d) => `${d} als Bedarfsmedikation.`,
    other: (d) => `${d} angepasst.`,
  },
  en: {
    start: (d) => `${d} started.`,
    increase: (d) => `Dose increased: ${d}.`,
    decrease: (d) => `Dose reduced: ${d}.`,
    timing: (d) => `Dosing schedule adjusted: ${d}.`,
    formulation: (d) => `Formulation changed: ${d}.`,
    pause: (d) => `${d} paused.`,
    discontinue: (d) => `${d} discontinued.`,
    restart: (d) => `${d} restarted.`,
    prn: (d) => `${d} as needed (PRN).`,
    other: (d) => `${d} adjusted.`,
  },
  fr: {
    start: (d) => `${d} instauré.`,
    increase: (d) => `Dose augmentée : ${d}.`,
    decrease: (d) => `Dose réduite : ${d}.`,
    timing: (d) => `Horaire de prise ajusté : ${d}.`,
    formulation: (d) => `Forme galénique modifiée : ${d}.`,
    pause: (d) => `${d} suspendu.`,
    discontinue: (d) => `${d} arrêté.`,
    restart: (d) => `${d} réintroduit.`,
    prn: (d) => `${d} si besoin.`,
    other: (d) => `${d} ajusté.`,
  },
  es: {
    start: (d) => `${d} iniciado.`,
    increase: (d) => `Dosis aumentada: ${d}.`,
    decrease: (d) => `Dosis reducida: ${d}.`,
    timing: (d) => `Pauta de administración ajustada: ${d}.`,
    formulation: (d) => `Forma farmacéutica modificada: ${d}.`,
    pause: (d) => `${d} pausado.`,
    discontinue: (d) => `${d} suspendido.`,
    restart: (d) => `${d} reiniciado.`,
    prn: (d) => `${d} a demanda.`,
    other: (d) => `${d} ajustado.`,
  },
}

const REASON_PREFIX: LocaleMap = {
  de: 'Grund',
  en: 'Reason',
  fr: 'Motif',
  es: 'Motivo',
}

function isValidDate(value: string): boolean {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}

function collectMedicationEvents(caseId: string, language: UiLanguage): ClinicalFeedEvent[] {
  const state = loadMedicationPlanState(caseId)
  if (!state) return []
  const plan = getCurrentPlan(state)
  if (!plan) return []

  const phrases = MEDICATION_PHRASES[language] ?? MEDICATION_PHRASES.de
  const reasonLabel = REASON_PREFIX[language] ?? REASON_PREFIX.de
  const sourceLabel = translateClinicalEventSource(language, 'medikation')
  const events: ClinicalFeedEvent[] = []

  for (const entry of plan.medications) {
    const history = entry.history ?? []
    history.forEach((event, index) => {
      const snapshot = event.snapshot
      const doseLine = (snapshot.doseLineGerman || snapshot.substance || entry.substance).trim()
      if (!doseLine) return

      const phrase = (phrases[event.changeType] ?? phrases.other)(doseLine)
      const reason = (event.note ?? snapshot.reasonForChange ?? '').trim()
      const body = reason ? `${phrase} ${reasonLabel}: ${reason}.` : phrase

      // The first ('start') change is most meaningfully dated by the clinical
      // start date; later changes use the timestamp they were documented at.
      const isStart = index === 0 || event.changeType === 'start'
      const date =
        isStart && isValidDate(entry.startDate) ? entry.startDate : event.changedAt

      events.push({
        id: `med:${entry.id}:${event.id}`,
        date,
        source: 'medikation',
        sourceLabel,
        title: (snapshot.substance || entry.substance || sourceLabel).trim(),
        body,
      })
    })
  }

  return events
}

// ---------------------------------------------------------------------------
// Psychotherapy
// ---------------------------------------------------------------------------

function collectPsychotherapyEvents(caseId: string, language: UiLanguage): ClinicalFeedEvent[] {
  const plan = loadPsychotherapyPlan(caseId)
  if (!plan) return []

  const sourceLabel = translateClinicalEventSource(language, 'psychotherapie')

  return plan.sessions
    .map((session): ClinicalFeedEvent | null => {
      const body = (session.generatedParagraph || generateSessionParagraph(session, language)).trim()
      if (!body) return null
      return {
        id: `pt:${session.id}`,
        date: session.date,
        source: 'psychotherapie',
        sourceLabel,
        title: session.topic.trim() || sourceLabel,
        body,
      }
    })
    .filter((e): e is ClinicalFeedEvent => e !== null)
}

// ---------------------------------------------------------------------------
// Complementary therapies
// ---------------------------------------------------------------------------

const COMPLEMENTARY_STARTED: LocaleMap = {
  de: 'Therapie begonnen',
  en: 'Therapy started',
  fr: 'Thérapie débutée',
  es: 'Terapia iniciada',
}

const GOAL_LABEL: LocaleMap = {
  de: 'Ziel',
  en: 'goal',
  fr: 'objectif',
  es: 'objetivo',
}

function collectComplementaryEvents(caseId: string, language: UiLanguage): ClinicalFeedEvent[] {
  const therapies = loadComplementaryTherapies(caseId)
  const sourceLabel = translateClinicalEventSource(language, 'komplementaer')
  const events: ClinicalFeedEvent[] = []

  for (const therapy of therapies) {
    const name = therapy.name.trim() || sourceLabel

    if (isValidDate(therapy.startDate ?? '')) {
      const goal = (therapy.mainGoal ?? '').trim()
      const started = COMPLEMENTARY_STARTED[language] ?? COMPLEMENTARY_STARTED.de
      const body = goal ? `${started} — ${GOAL_LABEL[language] ?? GOAL_LABEL.de}: ${goal}.` : `${started}.`
      events.push({
        id: `ct-start:${therapy.id}`,
        date: therapy.startDate as string,
        source: 'komplementaer',
        sourceLabel,
        title: name,
        body,
      })
    }

    for (const session of therapy.sessions ?? []) {
      const note = session.note.trim()
      if (!note) continue
      events.push({
        id: `ct:${therapy.id}:${session.id}`,
        date: session.date,
        source: 'komplementaer',
        sourceLabel,
        title: name,
        body: note,
      })
    }
  }

  return events
}

// ---------------------------------------------------------------------------
// Sozialtherapie
// ---------------------------------------------------------------------------

interface SozialtherapiePhrases {
  status: (v: string) => string
  goal: (v: string) => string
  measure: (v: string) => string
  nextSteps: (v: string) => string
  dates: (v: string) => string
}

const SOZIALTHERAPIE_PHRASES: Record<UiLanguage, SozialtherapiePhrases> = {
  de: {
    status: (v) => `Status: ${v}.`,
    goal: (v) => `Ziel: ${v}.`,
    measure: (v) => `Aktuelle Maßnahme: ${v}.`,
    nextSteps: (v) => `Nächste Schritte: ${v}.`,
    dates: (v) => `Termine: ${v}.`,
  },
  en: {
    status: (v) => `Status: ${v}.`,
    goal: (v) => `Goal: ${v}.`,
    measure: (v) => `Current measure: ${v}.`,
    nextSteps: (v) => `Next steps: ${v}.`,
    dates: (v) => `Dates: ${v}.`,
  },
  fr: {
    status: (v) => `Statut : ${v}.`,
    goal: (v) => `Objectif : ${v}.`,
    measure: (v) => `Mesure actuelle : ${v}.`,
    nextSteps: (v) => `Prochaines étapes : ${v}.`,
    dates: (v) => `Dates : ${v}.`,
  },
  es: {
    status: (v) => `Estado: ${v}.`,
    goal: (v) => `Objetivo: ${v}.`,
    measure: (v) => `Medida actual: ${v}.`,
    nextSteps: (v) => `Próximos pasos: ${v}.`,
    dates: (v) => `Fechas: ${v}.`,
  },
}

function composeSozialtherapieBody(target: SozialtherapieTarget, language: UiLanguage): string {
  const p = SOZIALTHERAPIE_PHRASES[language] ?? SOZIALTHERAPIE_PHRASES.de
  const parts: string[] = [p.status(translateSozialtherapieStatus(language, target.status))]
  const goal = (target.goal ?? '').trim()
  const measure = (target.currentMeasure ?? '').trim()
  const nextSteps = (target.nextSteps ?? '').trim()
  const dates = (target.dates ?? '').trim()
  const notes = (target.notes ?? '').trim()
  if (goal) parts.push(p.goal(goal))
  if (measure) parts.push(p.measure(measure))
  if (nextSteps) parts.push(p.nextSteps(nextSteps))
  if (dates) parts.push(p.dates(dates))
  if (notes) parts.push(notes)
  return parts.join(' ')
}

function collectSozialtherapieEvents(caseId: string, language: UiLanguage): ClinicalFeedEvent[] {
  const targets = loadSozialtherapie(caseId)
  const sourceLabel = translateClinicalEventSource(language, 'sozialtherapie')

  return targets
    .filter(
      (target) =>
        (target.goal ?? '').trim() ||
        (target.currentMeasure ?? '').trim() ||
        (target.nextSteps ?? '').trim() ||
        (target.dates ?? '').trim() ||
        (target.notes ?? '').trim(),
    )
    .map((target): ClinicalFeedEvent => ({
      id: `sz:${target.id}`,
      // No per-update clinical date is recorded for psychosocial targets, so the
      // last-update timestamp is the most meaningful chronological anchor.
      date: target.updatedAt || target.createdAt,
      source: 'sozialtherapie',
      sourceLabel,
      title: translateSozialtherapieArea(language, target.area),
      body: composeSozialtherapieBody(target, language),
    }))
}

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------

/** Reads all Therapie sources for a case and returns derived feed events (newest first). */
export function collectClinicalFeedEvents(
  caseId: string,
  language: UiLanguage,
): ClinicalFeedEvent[] {
  if (!caseId) return []
  const events = [
    ...collectMedicationEvents(caseId, language),
    ...collectPsychotherapyEvents(caseId, language),
    ...collectComplementaryEvents(caseId, language),
    ...collectSozialtherapieEvents(caseId, language),
  ]

  return events.sort((a, b) => clinicalEventTime(b.date) - clinicalEventTime(a.date))
}

export function clinicalEventTime(date: string): number {
  const t = new Date(date).getTime()
  return Number.isNaN(t) ? 0 : t
}
