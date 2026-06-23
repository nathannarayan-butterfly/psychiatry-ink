/**
 * Paginated export / print for clinical Vorlage templates.
 *
 * The builder body is rendered to static HTML (non-interactive, flow layout)
 * and wrapped in a standalone A4 document. Header/footer bands honor the
 * template's page settings (first-page-only display, distinct first page),
 * fixed band heights, logo images and live `{{page}}` / `{{pages}}` numbers.
 *
 *  - PDF / print: an embedded paginator splits the body into A4 pages in the
 *    print window, places the correct header/footer per page, and substitutes
 *    real page numbers before calling `window.print()` (browser "Save as PDF").
 *  - Word (.doc): an HTML-in-Word document using native Word section headers /
 *    footers (`mso-element`), `mso-title-page` for a distinct first page, and
 *    `PAGE` / `NUMPAGES` field codes for live page numbers.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { TranslationProvider } from '../../context/TranslationContext'
import type { ClinicalTemplate, TemplateFieldValues } from '../../types/clinicalTemplate'
import { escapeHtml } from '../documentTemplate/htmlUtils'
import type { ResolvedClinicalData } from './clinicalData'
import {
  PAGE_SENTINEL,
  PAGES_SENTINEL,
  resolvePageSettings,
  resolvePrintBands,
  usesDistinctFirstPage,
} from './documentBand'
import { ClinicalDocumentRenderer } from '../../components/templates/clinical/ClinicalDocumentRenderer'

type Lang = 'de' | 'en'

interface ExportArgs {
  template: ClinicalTemplate
  data: ResolvedClinicalData
  values: TemplateFieldValues
  lang: Lang
  /** Translated, filesystem-safe document title (without extension). */
  filename: string
}

/** Render the document body to a static HTML string (one element per top-level block). */
function renderBodyHtml(template: ClinicalTemplate, data: ResolvedClinicalData, values: TemplateFieldValues, lang: Lang): string {
  return renderToStaticMarkup(
    <TranslationProvider language={lang}>
      <ClinicalDocumentRenderer blocks={template.blocks} data={data} values={values} flow />
    </TranslationProvider>,
  )
}

/** Core document styling embedded in the standalone print/export document. */
const PRINT_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f1efea; }
body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1a17; font-size: 11pt; line-height: 1.5; }
.ct-page { position: relative; width: 210mm; min-height: 297mm; height: 297mm; margin: 0 auto 8mm; padding: 16mm; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }
.ct-page__hdr { flex: 0 0 auto; }
.ct-page__bdy { flex: 1 1 auto; overflow: hidden; }
.ct-page__ftr { flex: 0 0 auto; }
.ct-doc__band { font-size: 0.82rem; color: #3a352f; line-height: 1.45; }
.ct-page__hdr .ct-doc__band--divider { border-bottom: 1px solid #c9c1b5; padding-bottom: 0.5rem; margin-bottom: 0.6rem; }
.ct-page__ftr .ct-doc__band--divider { border-top: 1px solid #c9c1b5; padding-top: 0.5rem; margin-top: 0.6rem; }
.ct-doc__band-image { display: flex; margin-bottom: 4px; }
.ct-doc__band-image--center { justify-content: center; }
.ct-doc__band-image--right { justify-content: flex-end; }
.ct-doc__band-image img { width: auto; max-width: 100%; object-fit: contain; }
.ct-doc__band-content p { margin: 0 0 0.25rem; }
.ct-doc__band-content ul, .ct-doc__band-content ol { margin: 0; padding-left: 1.2rem; }
.ct-doc__heading { margin: 0.6rem 0 0.4rem; font-weight: 700; }
.ct-doc__heading--1 { font-size: 1.4rem; }
.ct-doc__heading--2 { font-size: 1.15rem; }
.ct-doc__heading--3 { font-size: 1rem; }
.ct-doc__block { margin-bottom: 0.55rem; }
.ct-doc__block--half { width: 48%; display: inline-block; vertical-align: top; }
.ct-doc__block--align-right { float: right; }
.ct-doc__section { margin-bottom: 0.6rem; }
.ct-doc__section-title { font-size: 0.95rem; font-weight: 700; margin: 0 0 0.3rem; }
.ct-doc__meta { color: #6b6357; font-size: 0.85em; }
.ct-doc__text p { margin: 0 0 0.4rem; }
.ct-doc__table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.ct-doc__table th, .ct-doc__table td { border: 1px solid #d8d2c7; padding: 0.25rem 0.4rem; text-align: left; vertical-align: top; }
.ct-doc__list, .ct-doc__diagnoses, .ct-doc__verlauf { margin: 0; padding-left: 1.2rem; }
.ct-doc__field { margin-bottom: 0.35rem; }
.ct-doc__field--inline { display: flex; gap: 0.4rem; align-items: baseline; }
.ct-doc__label { font-weight: 600; }
.ct-doc__value { flex: 1; }
.ct-doc__signature { margin-top: 1.2rem; }
.ct-doc__signature-line { margin-top: 1.5rem; border-top: 1px solid #1c1a17; width: 60%; }
.ct-doc__code { font-weight: 700; margin-right: 0.3rem; }
.ct-doc__empty, .ct-doc__blankline { color: #8a8276; }
.ct-doc__ai-badge, .ct-doc__conditional-hidden { display: none; }
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff; }
  .ct-page { margin: 0; box-shadow: none; page-break-after: always; }
  .ct-page:last-child { page-break-after: auto; }
}
`

/** Embedded paginator: splits body blocks into A4 pages + fills per-page bands. */
const PAGINATOR_JS = `
(function(){
  var cfg = JSON.parse(document.getElementById('ct-config').textContent || '{}');
  var root = document.getElementById('ct-pages');
  var source = document.getElementById('ct-source');
  if(!root || !source) return;
  // The renderer wraps every top-level block in a single .ct-doc container;
  // page over the container's children, not the container itself.
  var container = source.firstElementChild || source;
  var blocks = [];
  while(container.firstElementChild){ blocks.push(container.firstElementChild); container.removeChild(container.firstElementChild); }
  if(source.parentNode) source.parentNode.removeChild(source);
  var records = [];
  function makePage(headerHtml, footerHtml){
    var page = document.createElement('div'); page.className = 'ct-page';
    var hdr = document.createElement('div'); hdr.className = 'ct-page__hdr';
    var bdy = document.createElement('div'); bdy.className = 'ct-page__bdy ct-doc ct-doc--flow';
    var ftr = document.createElement('div'); ftr.className = 'ct-page__ftr';
    hdr.innerHTML = headerHtml || ''; ftr.innerHTML = footerHtml || '';
    if(!headerHtml) hdr.style.display = 'none';
    if(!footerHtml) ftr.style.display = 'none';
    page.appendChild(hdr); page.appendChild(bdy); page.appendChild(ftr);
    root.appendChild(page);
    var rec = { hdr: hdr, bdy: bdy, ftr: ftr, headerHtml: headerHtml || '', footerHtml: footerHtml || '' };
    records.push(rec);
    return rec;
  }
  function bandsFor(pageNo){
    return pageNo === 1 ? { h: cfg.firstHeader, f: cfg.firstFooter } : { h: cfg.restHeader, f: cfg.restFooter };
  }
  var pageNo = 0, rec = null;
  function nextPage(){ pageNo++; var b = bandsFor(pageNo); rec = makePage(b.h, b.f); }
  nextPage();
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    rec.bdy.appendChild(block);
    if(rec.bdy.scrollHeight > rec.bdy.clientHeight && rec.bdy.children.length > 1){
      rec.bdy.removeChild(block);
      nextPage();
      rec.bdy.appendChild(block);
    }
  }
  var total = records.length;
  for(var k=0;k<total;k++){
    var r = records[k], num = String(k+1), tot = String(total);
    if(r.headerHtml) r.hdr.innerHTML = r.headerHtml.split('${PAGE_SENTINEL}').join(num).split('${PAGES_SENTINEL}').join(tot);
    if(r.footerHtml) r.ftr.innerHTML = r.footerHtml.split('${PAGE_SENTINEL}').join(num).split('${PAGES_SENTINEL}').join(tot);
  }
  if(cfg.autoPrint){ setTimeout(function(){ try { window.focus(); window.print(); } catch(e){} }, 350); }
})();
`

function buildPrintDocument(args: ExportArgs): string {
  const { template, data, lang } = args
  const bodyHtml = renderBodyHtml(template, data, args.values, lang)
  const bands = resolvePrintBands(template, data)
  const config = {
    firstHeader: bands.firstHeader,
    firstFooter: bands.firstFooter,
    restHeader: bands.restHeader,
    restFooter: bands.restFooter,
    autoPrint: true,
  }
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.filename)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<div id="ct-pages"></div>
<div id="ct-source" style="position:absolute;visibility:hidden;left:-9999px;top:0;width:178mm;">${bodyHtml}</div>
<script type="application/json" id="ct-config">${JSON.stringify(config).replace(/</g, '\\u003c')}</script>
<script>${PAGINATOR_JS}</script>
</body>
</html>`
}

/** A live Word field (e.g. PAGE / NUMPAGES) using the mso field-element syntax. */
function wordField(code: string): string {
  return (
    `<span style='mso-element:field-begin'></span>${code}` +
    `<span style='mso-element:field-separator'></span>1` +
    `<span style='mso-element:field-end'></span>`
  )
}

/** Replace page-number sentinels with live Word PAGE / NUMPAGES fields. */
function sentinelsToWordFields(html: string): string {
  return html
    .split(PAGE_SENTINEL)
    .join(wordField('PAGE'))
    .split(PAGES_SENTINEL)
    .join(wordField('NUMPAGES'))
}

function buildWordDocument(args: ExportArgs): string {
  const { template, data, lang } = args
  const bodyHtml = renderBodyHtml(template, data, args.values, lang)
  const bands = resolvePrintBands(template, data)
  const settings = resolvePageSettings(template)
  const titlePage = settings.display === 'first-page-only' || usesDistinctFirstPage(settings)

  const headerFirst = sentinelsToWordFields(bands.firstHeader)
  const footerFirst = sentinelsToWordFields(bands.firstFooter)
  const headerRest = sentinelsToWordFields(bands.restHeader)
  const footerRest = sentinelsToWordFields(bands.restFooter)

  // Word associates header/footer divs by mso-element type. `*-first` overrides
  // page 1 when mso-title-page is enabled.
  const headerDivs = [
    headerRest ? `<div style='mso-element:header' id='ct_h1'>${headerRest}</div>` : '',
    footerRest ? `<div style='mso-element:footer' id='ct_f1'>${footerRest}</div>` : '',
    titlePage && headerFirst ? `<div style='mso-element:header-first' id='ct_fh1'>${headerFirst}</div>` : '',
    titlePage && footerFirst ? `<div style='mso-element:footer-first' id='ct_ff1'>${footerFirst}</div>` : '',
  ].join('')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.filename)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
@page Section1 {
  size: 21.0cm 29.7cm;
  margin: 1.6cm 1.6cm 1.6cm 1.6cm;
  mso-header-margin: 1.0cm;
  mso-footer-margin: 1.0cm;
  mso-paper-source: 0;
  ${titlePage ? 'mso-title-page: yes;' : ''}
}
div.Section1 { page: Section1; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1c1a17; }
${PRINT_CSS}
</style>
</head>
<body>
<div class="Section1">
${bodyHtml}
${headerDivs}
</div>
</body>
</html>`
}

function openPrintWindow(html: string): void {
  if (typeof window === 'undefined') return
  const win = window.open('', '_blank', 'noopener,width=900,height=1100')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    return
  }
  // Fallback: hidden iframe.
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
  setTimeout(() => document.body.removeChild(iframe), 60000)
}

function downloadFile(content: BlobPart, filename: string, type: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Open the paginated print document (browser "Save as PDF"). */
export function exportTemplatePdf(args: ExportArgs): void {
  openPrintWindow(buildPrintDocument(args))
}

/** Download an HTML-in-Word (.doc) document with native headers/footers. */
export function exportTemplateWord(args: ExportArgs): void {
  const html = buildWordDocument(args)
  downloadFile('\ufeff' + html, `${args.filename}.doc`, 'application/msword;charset=utf-8')
}

export { buildPrintDocument, buildWordDocument }
