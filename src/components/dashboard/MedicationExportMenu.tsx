import { ChevronDown, Download, FileDown, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { UiLanguage } from '../../types/settings'
import type { KnowledgeBaseDrug } from '../../types/knowledgeBase'
import {
  exportMedicationAsHtml,
  exportMedicationAsJson,
  exportMedicationAsMarkdown,
  exportMedicationAsPdf,
  printMedication,
  type MedicationExportLabels,
} from '../../utils/medication/exportMedication'

/**
 * Self-contained Export / Print controls for a single medication knowledge
 * entry. Carries its own localized strings so it can be dropped into the
 * medication detail toolbar without touching the (concurrently edited)
 * `uiTranslations.ts`. If those keys later land centrally, swap `STRINGS` for
 * the shared `t()` helper.
 *
 * Active export action: PDF (reuses the clean print HTML/CSS pipeline via the
 * browser's native "Save as PDF"). The JSON / Markdown / HTML export builders
 * and the Print action remain in the codebase but are intentionally hidden
 * from the UI for now — flip {@link EXPORT_EXTRAS_ENABLED} to re-expose them.
 */

// TODO re-enable: JSON / Markdown / HTML / Print exports are kept in code but
// hidden from the active UI. Set this to `true` to surface them again.
const EXPORT_EXTRAS_ENABLED = false

interface MedicationExportMenuProps {
  drug: KnowledgeBaseDrug
  language: string
}

type Strings = {
  export: string
  exportPdf: string
  print: string
  exportJson: string
  exportMarkdown: string
  exportHtml: string
}

const UI_STRINGS: Record<UiLanguage, Strings> = {
  de: {
    export: 'Exportieren',
    exportPdf: 'Als PDF exportieren',
    print: 'Drucken',
    exportJson: 'Als JSON',
    exportMarkdown: 'Als Markdown',
    exportHtml: 'Als HTML',
  },
  en: {
    export: 'Export',
    exportPdf: 'Export as PDF',
    print: 'Print',
    exportJson: 'As JSON',
    exportMarkdown: 'As Markdown',
    exportHtml: 'As HTML',
  },
  fr: {
    export: 'Exporter',
    exportPdf: 'Exporter en PDF',
    print: 'Imprimer',
    exportJson: 'En JSON',
    exportMarkdown: 'En Markdown',
    exportHtml: 'En HTML',
  },
  es: {
    export: 'Exportar',
    exportPdf: 'Exportar como PDF',
    print: 'Imprimir',
    exportJson: 'Como JSON',
    exportMarkdown: 'Como Markdown',
    exportHtml: 'Como HTML',
  },
}

const EXPORT_LABELS: Record<UiLanguage, MedicationExportLabels> = {
  de: {
    receptorProfile: 'Rezeptor-Affinitätsprofil',
    receptorTarget: 'Zielstruktur',
    receptorAffinity: 'Affinität (%)',
    receptorAction: 'Wirkung',
    receptorEvidence: 'Evidenz',
    receptorEstimated: 'geschätzt',
    legacyNote: 'Umgerechnet aus einem Legacy-1–5-Score-Profil (nur Anzeige-Schätzung).',
    statusActive: 'Aktiv',
    statusInactive: 'Inaktiv',
    classLabel: 'Wirkstoffklasse',
    categoryLabel: 'Kategorie',
    atcLabel: 'ATC',
    authorLabel: 'Autor/Bearbeiter',
    updatedLabel: 'Zuletzt bearbeitet',
    generatedLabel: 'Erstellt',
    noReceptorData: 'Keine Rezeptor-Affinitätsdaten hinterlegt.',
  },
  en: {
    receptorProfile: 'Receptor affinity profile',
    receptorTarget: 'Target',
    receptorAffinity: 'Affinity (%)',
    receptorAction: 'Action',
    receptorEvidence: 'Evidence',
    receptorEstimated: 'estimated',
    legacyNote: 'Converted from a legacy 1–5 score profile (display estimate only).',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    classLabel: 'Class',
    categoryLabel: 'Category',
    atcLabel: 'ATC',
    authorLabel: 'Author/editor',
    updatedLabel: 'Last updated',
    generatedLabel: 'Generated',
    noReceptorData: 'No receptor affinity data recorded.',
  },
  fr: {
    receptorProfile: 'Profil d\'affinité réceptorielle',
    receptorTarget: 'Cible',
    receptorAffinity: 'Affinité (%)',
    receptorAction: 'Action',
    receptorEvidence: 'Preuve',
    receptorEstimated: 'estimé',
    legacyNote: 'Converti à partir d\'un profil de score 1–5 hérité (estimation d\'affichage uniquement).',
    statusActive: 'Actif',
    statusInactive: 'Inactif',
    classLabel: 'Classe',
    categoryLabel: 'Catégorie',
    atcLabel: 'ATC',
    authorLabel: 'Auteur/éditeur',
    updatedLabel: 'Dernière modification',
    generatedLabel: 'Généré',
    noReceptorData: 'Aucune donnée d\'affinité réceptorielle enregistrée.',
  },
  es: {
    receptorProfile: 'Perfil de afinidad receptora',
    receptorTarget: 'Diana',
    receptorAffinity: 'Afinidad (%)',
    receptorAction: 'Acción',
    receptorEvidence: 'Evidencia',
    receptorEstimated: 'estimado',
    legacyNote: 'Convertido de un perfil heredado de puntuación 1–5 (solo estimación de visualización).',
    statusActive: 'Activo',
    statusInactive: 'Inactivo',
    classLabel: 'Clase',
    categoryLabel: 'Categoría',
    atcLabel: 'ATC',
    authorLabel: 'Autor/editor',
    updatedLabel: 'Última actualización',
    generatedLabel: 'Generado',
    noReceptorData: 'No se registraron datos de afinidad receptora.',
  },
}

function resolveLanguage(language: string): UiLanguage {
  return language === 'en' || language === 'fr' || language === 'es' ? language : 'de'
}

export function MedicationExportMenu({ drug, language }: MedicationExportMenuProps) {
  const lang = resolveLanguage(language)
  const strings = UI_STRINGS[lang]
  const labels = EXPORT_LABELS[lang]
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const runExport = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  // PDF is the only active export action for now. When EXPORT_EXTRAS_ENABLED is
  // false we render a single primary "Export as PDF" button; the JSON / Markdown
  // / HTML dropdown and the Print button remain wired below but hidden.
  if (!EXPORT_EXTRAS_ENABLED) {
    return (
      <button
        type="button"
        className="kbp-btn"
        onClick={() => exportMedicationAsPdf(drug, labels)}
        title={strings.exportPdf}
      >
        <FileDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        {strings.exportPdf}
      </button>
    )
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex', gap: 4 }}>
      <button
        type="button"
        className="kbp-btn"
        onClick={() => exportMedicationAsPdf(drug, labels)}
        title={strings.exportPdf}
      >
        <FileDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        {strings.exportPdf}
      </button>
      <button
        type="button"
        className="kbp-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={strings.export}
      >
        <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        {strings.export}
        <ChevronDown className="h-3 w-3" strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 50,
            minWidth: 168,
            background: 'var(--notion-bg, #ffffff)',
            border: '1px solid var(--notion-border, #e5e7eb)',
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="kbp-btn"
            style={{ justifyContent: 'flex-start', width: '100%', border: 'none' }}
            onClick={() => runExport(() => exportMedicationAsJson(drug))}
          >
            {strings.exportJson}
          </button>
          <button
            type="button"
            role="menuitem"
            className="kbp-btn"
            style={{ justifyContent: 'flex-start', width: '100%', border: 'none' }}
            onClick={() => runExport(() => exportMedicationAsMarkdown(drug, labels))}
          >
            {strings.exportMarkdown}
          </button>
          <button
            type="button"
            role="menuitem"
            className="kbp-btn"
            style={{ justifyContent: 'flex-start', width: '100%', border: 'none' }}
            onClick={() => runExport(() => exportMedicationAsHtml(drug, labels))}
          >
            {strings.exportHtml}
          </button>
        </div>
      )}
      <button
        type="button"
        className="kbp-icon-btn"
        onClick={() => printMedication(drug, labels)}
        title={strings.print}
        aria-label={strings.print}
      >
        <Printer className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
