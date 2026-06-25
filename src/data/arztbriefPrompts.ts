import type { ArztbriefDocumentType, TherapieVerlaufLength } from '../types/arztbrief'

const BASE_RULES = [
  'Schreibe in formellem, neutralem klinischem Deutsch (Arztbrief-Stil).',
  'Synthese statt Rohdump — keine Aufzählung unverbundener Einzelbefunde ohne Kontext.',
  'Keine Erfindung: nur aus der Evidenz ableiten; fehlende Daten explizit als unklar kennzeichnen.',
  'Keine patientenidentifizierenden Daten (Name, Geburtsdatum, Adresse, Fallnummer).',
  'Keine Meta-Kommentare — nur den Abschnittstext ausgeben.',
].join(' ')

export function buildTherapieVerlaufSystemPrompt(documentType: ArztbriefDocumentType): string {
  const depth =
    documentType === 'kurzbrief'
      ? 'Kurzbrief: fokussierter Verlauf mit den wesentlichen Stationsepisoden.'
      : 'Langbrief: ausführlicher chronologischer Verlauf mit klinischer Tiefe.'
  return `Du bist ein erfahrener Psychiater und formulierst den Abschnitt „Therapie und Verlauf“ für einen ${documentType === 'kurzbrief' ? 'Kurzbrief / vorläufigen Entlassungsbericht' : 'ausführlichen Arztbrief'}. ${depth} ${BASE_RULES} Bei Psychose: Aufnahmezustand, Medikation und Verträglichkeit, Besondere Ereignisse (Fixierung, Zwangsmaßnahmen), Stabilisierung, Entlassungszustand. Chronologisch und klinisch präzise.`
}

export function buildTherapieVerlaufUserPrompt(
  evidenceSummary: string,
  length: TherapieVerlaufLength,
): string {
  const lengthHint =
    length === 'compact'
      ? 'Länge: kompakt (ca. 150–250 Wörter).'
      : length === 'detailed'
        ? 'Länge: detailliert (ca. 400–600 Wörter).'
        : 'Länge: standard (ca. 250–400 Wörter).'
  return `Erstelle den Abschnitt „Therapie und Verlauf“ aus folgender de-identifizierter Evidenz:\n\n${evidenceSummary}\n\n${lengthHint}`
}

export function buildBesondereHinweiseSystemPrompt(): string {
  return `Du formulierst „Besondere Hinweise“ für einen psychiatrischen Arztbrief. ${BASE_RULES} Nur klinisch handlungsrelevante Punkte als kurze Bullet-Points (•). Themen: Medikation/Compliance, Kontrollen, Gefährdung, Therapieempfehlungen, soziale Maßnahmen — nur wenn in der Evidenz gestützt.`
}

export function buildBesondereHinweiseUserPrompt(evidenceSummary: string): string {
  return `Formuliere „Besondere Hinweise“ als Bullet-Points aus folgender Evidenz:\n\n${evidenceSummary}`
}

export function buildGenericSectionSystemPrompt(sectionLabel: string): string {
  return `Du formulierst den Abschnitt „${sectionLabel}“ für einen psychiatrischen Arztbrief. ${BASE_RULES}`
}

export function buildGenericSectionUserPrompt(sectionLabel: string, evidenceSummary: string): string {
  return `Formuliere „${sectionLabel}“ aus folgender de-identifizierter Evidenz:\n\n${evidenceSummary}`
}
