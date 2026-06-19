import type { OverviewWidgetRenderContext } from '../../components/notion/overview/OverviewWidgetContent'
import type { OverviewLayoutItem } from './overviewLayout'
import { OVERVIEW_WIDGET_REGISTRY } from '../../components/notion/overview/overviewWidgetRegistry'
import { isOverviewWidgetVisible } from './overviewLayout'
import type { OverviewWidgetVisibilityContext } from './overviewLayout'
import { buildClinicalHeroMeta } from './clinicalHeroMeta'
import type { UiTranslationKey } from '../../data/uiTranslations'

export interface OverviewPrintLabels {
  generated: string
  patientOverview: string
  notDocumented: string
}

const DEFAULT_PRINT_LABELS: OverviewPrintLabels = {
  generated: 'Erstellt',
  patientOverview: 'Übersicht',
  notDocumented: 'Nicht dokumentiert',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function section(title: string, body: string): string {
  if (!body.trim()) return ''
  return `<section class="ov-print__section"><h2>${escapeHtml(title)}</h2><div class="ov-print__body">${body}</div></section>`
}

function paragraph(text: string | null | undefined): string {
  if (!text?.trim()) return `<p class="ov-print__empty">${escapeHtml(DEFAULT_PRINT_LABELS.notDocumented)}</p>`
  return `<p>${escapeHtml(text)}</p>`
}

function listItems(items: string[]): string {
  if (items.length === 0) return ''
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function widgetBody(
  widgetId: OverviewLayoutItem['widgetId'],
  ctx: OverviewWidgetRenderContext,
  titleKey: UiTranslationKey,
  t: (key: UiTranslationKey) => string,
): string {
  switch (widgetId) {
    case 'diagnoses':
      return paragraph(ctx.heroData.primaryDiagnosis ? `${ctx.heroData.primaryDiagnosis.code} · ${ctx.heroData.primaryDiagnosis.label}` : null)
    case 'medication': {
      const meds = ctx.medicationData.meds.map((m) => `${m.substance} ${m.dose}${m.statusLabel ? ` (${m.statusLabel})` : ''}`)
      return listItems(meds)
    }
    case 'psychopathology': {
      const signals = (ctx.safetyData.risk?.signals ?? []).map((s) => `${s.label}${s.value ? `: ${s.value}` : ''}`)
      const cues = ctx.symptomData.structured
        .filter((c) => c.value)
        .map((c) => `${c.label}: ${c.value}`)
      return [signals.length ? `<p><strong>Eigengefährdung / Fremdgefährdung</strong></p>${listItems(signals)}` : '', listItems(cues), paragraph(ctx.symptomData.snapshotText)].join('')
    }
    case 'labs-due': {
      const abnormal = ctx.laborData.abnormal.map((a) => `${a.name}: ${a.valueLabel ?? '—'}`)
      const monitoring = ctx.laborData.medicationMonitoring.map(
        (row) =>
          `${row.label} (${row.medications.join(', ')}): ${row.valueLabel ?? '—'}`,
      )
      return [abnormal.length ? `<p><strong>Auffällig</strong></p>${listItems(abnormal)}` : '', monitoring.length ? `<p><strong>Überwachen</strong></p>${listItems(monitoring)}` : ''].join('')
    }
    case 'verlaufstendenz':
      return [paragraph(ctx.verlaufstendenz.stubMessage), paragraph(ctx.verlaufstendenz.courseLabel ? `Letzte Richtung: ${ctx.verlaufstendenz.courseLabel}` : null)].join('')
    case 'zwangsmassnahme':
      return paragraph(ctx.zwangsmassnahme.statusLabel ? `Status: ${ctx.zwangsmassnahme.statusLabel} (Workflow folgt)` : null)
    case 'ekg-summary':
      return paragraph(`${ctx.ekgSummary.statusLabel}${ctx.ekgSummary.briefFinding ? ` — ${ctx.ekgSummary.briefFinding}` : ''}`)
    case 'eeg-summary':
      return paragraph(`${ctx.eegSummary.statusLabel}${ctx.eegSummary.briefFinding ? ` — ${ctx.eegSummary.briefFinding}` : ''}`)
    case 'ct-summary':
      return paragraph(ctx.ctSummary.briefFinding ?? ctx.ctSummary.statusLabel)
    case 'angemeldete-therapien':
      return listItems(ctx.registeredTherapies.lines.map((l) => `${l.kind}: ${l.label}${l.goalSummary ? ` — ${l.goalSummary}` : ''}`))
    case 'compliance': {
      const fmt = (percent: number | null) => (percent == null ? 'k. A.' : `${percent}%`)
      const medLines = ctx.compliance.medicationItems.map(
        (item) => `${item.label}: ${fmt(item.timeline.percent)}`,
      )
      const therapyLines = ctx.compliance.therapyItems.map(
        (item) => `${item.label}: ${fmt(item.timeline.percent)}`,
      )
      return [
        paragraph('Medikation'),
        medLines.length > 0 ? listItems(medLines) : paragraph('Keine aktive Medikation.'),
        paragraph('Therapien'),
        therapyLines.length > 0 ? listItems(therapyLines) : paragraph('Keine aktiven Therapien.'),
      ].join('')
    }
    case 'prior-therapies':
      return paragraph('Vortherapien — siehe Medikationsarchiv.')
    default:
      return paragraph(t(titleKey))
  }
}

export function buildOverviewPrintHtml(
  widgets: OverviewLayoutItem[],
  ctx: OverviewWidgetRenderContext,
  visibilityContext: OverviewWidgetVisibilityContext,
  t: (key: UiTranslationKey) => string,
  labels: OverviewPrintLabels = DEFAULT_PRINT_LABELS,
  options?: { autoPrint?: boolean },
): string {
  const { name, metaLine } = buildClinicalHeroMeta(ctx.caseId, t)
  const visible = widgets.filter((item) => {
    const def = OVERVIEW_WIDGET_REGISTRY[item.widgetId]
    return isOverviewWidgetVisible(item.widgetId, def.visibility, visibilityContext)
  })

  const sections = visible
    .map((item) => {
      const def = OVERVIEW_WIDGET_REGISTRY[item.widgetId]
      const title = t(def.titleKey)
      const body = widgetBody(item.widgetId, ctx, def.titleKey, t)
      return section(title, body)
    })
    .filter(Boolean)
    .join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(name)} — ${escapeHtml(labels.patientOverview)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 1.2cm; font-size: 11pt; line-height: 1.45; }
  h1 { font-size: 16pt; font-weight: 600; margin: 0 0 0.25rem; }
  .ov-print__meta { font-size: 9pt; color: #555; margin-bottom: 1rem; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.06em; color: #444; border-bottom: 1px solid #ccc; padding-bottom: 0.2rem; margin: 1rem 0 0.4rem; }
  .ov-print__body p { margin: 0.2rem 0; }
  .ov-print__empty { color: #777; font-style: italic; }
  ul { margin: 0.2rem 0 0.4rem 1rem; padding: 0; }
  li { margin: 0.15rem 0; }
  footer { margin-top: 1.5rem; font-size: 8pt; color: #777; }
  @media print { body { margin: 0.8cm; } }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(name)}</h1>
  <p class="ov-print__meta">${escapeHtml(metaLine ?? '')}</p>
</header>
${sections}
<footer>${escapeHtml(labels.generated)}: ${escapeHtml(new Date().toLocaleString('de-DE'))}</footer>
${options?.autoPrint ? '<script>window.addEventListener(\'load\', function() { window.print(); });</script>' : ''}
</body>
</html>`
}

function openPrintDocument(html: string): void {
  if (typeof window === 'undefined') return
  const printWindow = window.open('', '_blank', 'noopener,width=900,height=1000')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 250)
}

function downloadBlob(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function printOverviewDashboard(
  widgets: OverviewLayoutItem[],
  ctx: OverviewWidgetRenderContext,
  visibilityContext: OverviewWidgetVisibilityContext,
  t: (key: UiTranslationKey) => string,
): void {
  const html = buildOverviewPrintHtml(widgets, ctx, visibilityContext, t, DEFAULT_PRINT_LABELS, {
    autoPrint: false,
  })
  if (typeof window === 'undefined') return
  const printWindow = window.open('', '_blank', 'noopener,width=900,height=1000')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
    return
  }
  openPrintDocument(html)
}

export function exportOverviewDashboardHtml(
  widgets: OverviewLayoutItem[],
  ctx: OverviewWidgetRenderContext,
  visibilityContext: OverviewWidgetVisibilityContext,
  t: (key: UiTranslationKey) => string,
  caseId: string,
): void {
  const html = buildOverviewPrintHtml(widgets, ctx, visibilityContext, t, DEFAULT_PRINT_LABELS, {
    autoPrint: false,
  })
  downloadBlob(html, `${caseId}-uebersicht.html`)
}
