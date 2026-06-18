import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KbStructureImage } from './KbStructureImage'
import { useTranslation } from '../../context/TranslationContext'
import { useKbBulkContributors } from '../../hooks/useKbBulkContributors'
import type { KnowledgeBaseDrug } from '../../types/knowledgeBase'
import { extractKbSubstanceId } from '../../utils/kbSubstanceId'
import {
  localizePsychClassSection,
  PSYCH_CLASS_SECTION_ORDER,
  psychClassToSectionId,
  resolveDrugPsychClass,
  type PsychClassSectionId,
} from '../../utils/kb/psychClassSections'
import {
  getStructureImageAttribution,
  listKnownStructureImageAttributions,
  type StructureImageAttribution,
} from '../../utils/kb/wikimediaStructureImages'

type ClassifiedDrugCard = {
  drug: KnowledgeBaseDrug
  structureImageAttribution: StructureImageAttribution | null
  contributor: string
}

type ClassifiedSection = {
  id: PsychClassSectionId
  title: string
  subtitle: string
  drugs: ClassifiedDrugCard[]
}

function resolveFallbackContributor(drug: KnowledgeBaseDrug): string {
  return drug.createdByDisplayName ?? drug.authorEditor ?? 'Seed'
}

export interface KbPharmaClassifiedBrowseProps {
  drugs: KnowledgeBaseDrug[]
  onSelect: (id: string) => void
  onAdd: () => void
  language: string
}

export function KbPharmaClassifiedBrowse({
  drugs,
  onSelect,
  onAdd,
  language,
}: KbPharmaClassifiedBrowseProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const substanceIds = useMemo(
    () => drugs.map((drug) => extractKbSubstanceId(drug)).filter((id): id is string => Boolean(id)),
    [drugs],
  )
  const { primaryBySubstanceId } = useKbBulkContributors(substanceIds)

  const classifiedSections = useMemo(() => {
    const bySection = new Map<PsychClassSectionId, ClassifiedDrugCard[]>()

    for (const drug of drugs) {
      const psychClass = resolveDrugPsychClass(drug)
      const sectionId = psychClassToSectionId(psychClass)
      const substanceId = extractKbSubstanceId(drug)
      const contributor =
        (substanceId ? primaryBySubstanceId.get(substanceId) : undefined) ??
        resolveFallbackContributor(drug)

      const card: ClassifiedDrugCard = {
        drug,
        structureImageAttribution: getStructureImageAttribution(drug.genericName),
        contributor,
      }

      const list = bySection.get(sectionId) ?? []
      list.push(card)
      bySection.set(sectionId, list)
    }

    return PSYCH_CLASS_SECTION_ORDER.flatMap((sectionId) => {
      const sectionDrugs = bySection.get(sectionId)
      if (!sectionDrugs?.length) return []
      sectionDrugs.sort((a, b) => a.drug.genericName.localeCompare(b.drug.genericName, language))
      const { title, subtitle } = localizePsychClassSection(sectionId, language)
      return [{ id: sectionId, title, subtitle, drugs: sectionDrugs } satisfies ClassifiedSection]
    })
  }, [drugs, language, primaryBySubstanceId])

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return classifiedSections

    return classifiedSections
      .map((section) => ({
        ...section,
        drugs: section.drugs.filter((card) => {
          const { drug } = card
          return [
            drug.genericName,
            ...drug.brandNames,
            drug.drugClass,
            section.title,
            section.subtitle,
            card.contributor,
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        }),
      }))
      .filter((section) => section.drugs.length > 0)
  }, [classifiedSections, search])

  const knownStructureImages = useMemo(() => listKnownStructureImageAttributions(), [])

  return (
    <div className="kb-classified-browse">
      <div className="kbp-list-toolbar">
        <label className="kb-search">
          <Search className="kb-search__icon h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          <input
            type="search"
            className="kb-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('kbPharmaSearch')}
            aria-label={t('kbPharmaSearch')}
          />
        </label>
        <div className="kbp-list-toolbar__right">
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('kbPharmaNewDrug')}
          </button>
        </div>
      </div>

      {drugs.length === 0 ? (
        <div className="kbp-empty">
          <p className="kbp-empty__text">{t('kbPharmaEmpty')}</p>
          <button type="button" className="kbp-btn kbp-btn--primary" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('kbPharmaNewDrug')}
          </button>
        </div>
      ) : filteredSections.length === 0 ? (
        <p className="kbp-list-view__no-results">{t('kbPharmaNoResults')}</p>
      ) : (
        filteredSections.map((section) => (
          <section
            key={section.id}
            className="kb-classified-section"
            aria-labelledby={`kb-section-${section.id}`}
          >
            <header className="kb-classified-section__header">
              <h2 id={`kb-section-${section.id}`} className="kb-classified-section__title">
                {section.title}
              </h2>
              <p className="kb-classified-section__subtitle">{section.subtitle}</p>
            </header>

            <ul className="kb-classified-grid">
              {section.drugs.map((card) => (
                <li key={card.drug.id}>
                  <button
                    type="button"
                    className="kb-classified-drug kb-classified-drug--interactive"
                    onClick={() => onSelect(card.drug.id)}
                  >
                    <div className="kb-classified-drug__top">
                      <KbStructureImage
                        attribution={card.structureImageAttribution}
                        variant="thumb"
                        className="kb-classified-drug__structure"
                      />
                      <div className="kb-classified-drug__body">
                        <h3 className="kb-classified-drug__name">{card.drug.genericName}</h3>
                        {card.drug.brandNames.length > 0 ? (
                          <p className="kb-classified-drug__brands">{card.drug.brandNames.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                    <footer className="kb-classified-drug__footer">
                      {t('kbPharmaContributorLine').replace('{name}', card.contributor)}
                    </footer>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <footer className="kb-classified-browse__attribution" aria-label={t('kbPharmaStructureImagesLabel')}>
        <p className="kb-classified-browse__attribution-lead">
          {t('kbPharmaStructureImagesLabel')}:{' '}
          <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">
            Wikimedia Commons
          </a>
        </p>
        {knownStructureImages.length > 0 ? (
          <p className="kb-classified-browse__attribution-files">
            {knownStructureImages.map((entry, index) => (
              <span key={entry.commonsFileUrl}>
                {index > 0 ? ', ' : null}
                <a href={entry.commonsFileUrl} target="_blank" rel="noopener noreferrer">
                  {entry.fileName.replace(/\.svg$/i, '')}
                </a>
                {entry.license ? ` (${entry.license})` : null}
              </span>
            ))}
          </p>
        ) : null}
        <p className="kb-classified-browse__attribution-disclaimer">{t('kbPharmaStructureImagesFooter')}</p>
      </footer>
    </div>
  )
}
