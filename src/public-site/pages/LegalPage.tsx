import { Fragment } from 'react'
import type { LegalBlock, LegalDoc } from '../legalContent'

interface LegalPageProps {
  doc: LegalDoc
}

function renderMultiline(text: string) {
  const lines = text.split('\n')
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ))
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === 'h3') {
    return <h3 className="ps-legal__subheading">{block.text}</h3>
  }
  if (block.type === 'ul') {
    return (
      <ul className="ps-legal__list">
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }
  return <p className="ps-legal__paragraph">{renderMultiline(block.text)}</p>
}

export function LegalPage({ doc }: LegalPageProps) {
  return (
    <section className="hp-section ps-legal" aria-labelledby="ps-legal-title">
      <div className="ps-legal__container">
        <header className="ps-legal__header">
          <h1 id="ps-legal-title" className="ps-legal__title">
            {doc.title}
          </h1>
          <p className="ps-legal__updated">{doc.lastUpdatedLabel}</p>
          <p className="ps-legal__lead">{doc.lead}</p>
        </header>

        {doc.sections.map((sectionItem) => (
          <section key={sectionItem.id} className="ps-legal__section" aria-label={sectionItem.heading}>
            <h2 className="ps-legal__heading">{sectionItem.heading}</h2>
            {sectionItem.blocks.map((block, index) => (
              <LegalBlockView key={index} block={block} />
            ))}
          </section>
        ))}
      </div>
    </section>
  )
}
