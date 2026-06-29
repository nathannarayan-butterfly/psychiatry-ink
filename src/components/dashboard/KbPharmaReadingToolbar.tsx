import { Bookmark, FileDown, FileText, Flag, Printer } from 'lucide-react'
import type { RefObject } from 'react'
import type { KnowledgeBaseDrug } from '../../types/knowledgeBase'
import type { UiLanguage } from '../../types/settings'
import {
  exportMedicationAsPlainText,
  exportMedicationFromDom,
  type MedicationExportLabels,
} from '../../utils/medication/exportMedication'
import { kbT } from '../medication/kb/kbStrings'

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
    receptorProfile: "Profil d'affinité réceptorielle",
    receptorTarget: 'Cible',
    receptorAffinity: 'Affinité (%)',
    receptorAction: 'Action',
    receptorEvidence: 'Preuve',
    receptorEstimated: 'estimé',
    legacyNote: "Converti à partir d'un profil de score 1–5 hérité (estimation d'affichage uniquement).",
    statusActive: 'Actif',
    statusInactive: 'Inactif',
    classLabel: 'Classe',
    categoryLabel: 'Catégorie',
    atcLabel: 'ATC',
    authorLabel: 'Auteur/éditeur',
    updatedLabel: 'Dernière modification',
    generatedLabel: 'Généré',
    noReceptorData: "Aucune donnée d'affinité réceptorielle enregistrée.",
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

interface KbPharmaReadingToolbarProps {
  drug: KnowledgeBaseDrug
  language: string
  contentRootRef: RefObject<HTMLElement | null>
  onContribute: () => void
  onReportIssue: () => void
}

/**
 * Reading-mode header toolbar: community actions (Beitrag, Problem melden) plus
 * explicit print/export icon buttons. Matches the icon affordances used elsewhere
 * in the app; chart snapshots are captured from `contentRootRef` at export time.
 */
export function KbPharmaReadingToolbar({
  drug,
  language,
  contentRootRef,
  onContribute,
  onReportIssue,
}: KbPharmaReadingToolbarProps) {
  const lang = resolveLanguage(language)
  const labels = EXPORT_LABELS[lang]

  const runWithCharts = (format: 'pdf' | 'print' | 'word') => {
    exportMedicationFromDom(drug, contentRootRef.current, format, labels)
  }

  return (
    <div className="kbp-reading-toolbar" role="toolbar" aria-label={kbT(language, 'readingToolbarLabel')}>
      <div className="kbp-reading-toolbar__community">
        <button
          type="button"
          className="kbp-reading-toolbar__text-btn"
          onClick={onContribute}
          title={kbT(language, 'contributionBookmarkTitle')}
          aria-label={kbT(language, 'contributionBookmarkTitle')}
        >
          <Bookmark className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {kbT(language, 'contributionBookmark')}
        </button>
        <button
          type="button"
          className="kbp-reading-toolbar__text-btn"
          onClick={onReportIssue}
          title={kbT(language, 'reportIssueButtonTitle')}
          aria-label={kbT(language, 'reportIssueButtonTitle')}
        >
          <Flag className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {kbT(language, 'reportIssueButton')}
        </button>
      </div>
      <div className="kbp-reading-toolbar__exports">
        <button
          type="button"
          className="kbp-icon-btn"
          onClick={() => runWithCharts('print')}
          title={kbT(language, 'exportPrint')}
          aria-label={kbT(language, 'exportPrint')}
        >
          <Printer className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="kbp-icon-btn"
          onClick={() => exportMedicationAsPlainText(drug, labels)}
          title={kbT(language, 'exportTxt')}
          aria-label={kbT(language, 'exportTxt')}
        >
          <FileText className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="kbp-icon-btn"
          onClick={() => runWithCharts('word')}
          title={kbT(language, 'exportWord')}
          aria-label={kbT(language, 'exportWord')}
        >
          <span className="kbp-reading-toolbar__word-mark" aria-hidden>W</span>
        </button>
        <button
          type="button"
          className="kbp-icon-btn"
          onClick={() => runWithCharts('pdf')}
          title={kbT(language, 'exportPdf')}
          aria-label={kbT(language, 'exportPdf')}
        >
          <FileDown className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
