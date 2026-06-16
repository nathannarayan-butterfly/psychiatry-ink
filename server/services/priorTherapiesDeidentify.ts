import type { DiscussPackageContent } from '../../src/types/discussCase'
import { deidentifyPackageContent } from './discussCaseDeidentify'

/**
 * De-identify the free-text Aufnahme + Verlauf sources for the prior-therapies
 * extraction BEFORE they are sent to the LLM.
 *
 * This intentionally REUSES the shared {@link deidentifyPackageContent} redactor
 * (patient-name + identifier scrubbing) rather than duplicating its rules: we
 * wrap our two plain-text blocks into a throwaway discussion-package shape, run
 * the existing redactor, and read the scrubbed text back out. The shared
 * de-identify module is treated as read-only here — we do not modify it.
 */
export interface PriorTherapySources {
  caseId: string
  aufnahmeText: string
  verlaufText: string
  patientName?: string
}

export interface DeidentifiedPriorTherapySources {
  aufnahmeText: string
  verlaufText: string
}

export function deidentifyPriorTherapySources(
  input: PriorTherapySources,
): DeidentifiedPriorTherapySources {
  const pkg: DiscussPackageContent = {
    version: 1,
    builtAt: new Date().toISOString(),
    caseId: input.caseId,
    patientLabel: 'Patient',
    isDeidentified: false,
    sections: [
      { key: 'anamnesis', id: 'aufnahme', label: 'Aufnahme', content: input.aufnahmeText ?? '' },
      { key: 'therapie-verlauf', id: 'verlauf', label: 'Verlauf', content: input.verlaufText ?? '' },
    ],
  }

  const deidentified = deidentifyPackageContent(pkg, input.patientName)
  const sectionContent = (id: string): string =>
    deidentified.sections.find((section) => section.id === id)?.content ?? ''

  return {
    aufnahmeText: sectionContent('aufnahme'),
    verlaufText: sectionContent('verlauf'),
  }
}
