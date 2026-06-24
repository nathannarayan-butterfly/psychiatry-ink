import type {
  AufnahmeBefundInputMode,
  AufnahmeSectionMetadata,
} from '../../types/anamneseBefund'
import type { GuidedEntryFieldValues } from '../../types/guidedEntry'
import type { NotionDocumentSnapshot } from '../notionDocumentActions'

export function getSectionMetadata(
  snapshot: NotionDocumentSnapshot | null | undefined,
  sectionId: string,
): AufnahmeSectionMetadata | undefined {
  return snapshot?.sectionMetadata?.[sectionId]
}

export function buildSectionMetadataUpdate(
  current: AufnahmeSectionMetadata | undefined,
  patch: Partial<AufnahmeSectionMetadata> & { inputMode: AufnahmeBefundInputMode },
): AufnahmeSectionMetadata {
  return {
    inputMode: patch.inputMode,
    structuredAnswers: patch.structuredAnswers ?? current?.structuredAnswers,
    generatedAt: patch.generatedAt ?? current?.generatedAt,
    manuallyEdited: patch.manuallyEdited ?? current?.manuallyEdited,
  }
}

export function metadataForGeneratedContent(
  inputMode: AufnahmeBefundInputMode,
  structuredAnswers: GuidedEntryFieldValues | undefined,
): AufnahmeSectionMetadata {
  return {
    inputMode,
    structuredAnswers,
    generatedAt: new Date().toISOString(),
    manuallyEdited: false,
  }
}

export function metadataForManualEdit(
  previous: AufnahmeSectionMetadata | undefined,
  inputMode: AufnahmeBefundInputMode,
): AufnahmeSectionMetadata {
  return {
    inputMode: previous?.inputMode ?? inputMode,
    structuredAnswers: previous?.structuredAnswers,
    generatedAt: previous?.generatedAt,
    manuallyEdited: true,
  }
}

export function metadataForClear(): undefined {
  return undefined
}
