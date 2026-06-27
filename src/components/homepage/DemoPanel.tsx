import { Maximize2 } from 'lucide-react'
import { useState } from 'react'
import type { HomepageContent, HomepageDemoPanel } from '../../data/homepage'
import { formatHomepageTemplate } from '../../data/homepage'
import { DemoScreenshotModal } from './DemoScreenshotModal'

export interface DemoPanelProps {
  panel: HomepageDemoPanel
  ui: HomepageContent['ui']
}

export function DemoPanel({ panel, ui }: DemoPanelProps) {
  const [enlarged, setEnlarged] = useState(false)
  const enlargeLabel = formatHomepageTemplate(ui.enlargeScreenshotTemplate, { title: panel.title })

  return (
    <article className="hp-demo-panel">
      <span className="hp-demo-panel__label">{panel.label}</span>
      <div className="hp-appframe hp-demo-panel__frame">
        <div className="hp-appframe__bar" aria-hidden="true">
          <span className="hp-appframe__dots">
            <span />
            <span />
            <span />
          </span>
          <span className="hp-appframe__label">{panel.title}</span>
        </div>
        <div className="hp-demo-panel__screenshot-wrap">
          <button
            type="button"
            className="hp-demo-panel__screenshot-trigger"
            onClick={() => setEnlarged(true)}
            aria-label={enlargeLabel}
          >
            <img
              className="hp-demo-panel__screenshot"
              src={panel.imageSrc}
              alt={panel.imageAlt}
              loading="lazy"
              decoding="async"
            />
          </button>
          <button
            type="button"
            className="hp-demo-panel__enlarge-btn"
            onClick={() => setEnlarged(true)}
            aria-label={enlargeLabel}
            title={enlargeLabel}
          >
            <Maximize2 className="hp-demo-panel__enlarge-icon" aria-hidden="true" />
          </button>
          <span className="hp-demo-panel__screenshot-badge">{ui.syntheticDemoBadge}</span>
        </div>
      </div>
      {enlarged ? (
        <DemoScreenshotModal
          imageSrc={panel.imageSrc}
          alt={panel.imageAlt}
          title={panel.title}
          closeAriaLabel={ui.closeScreenshotAriaLabel}
          onClose={() => setEnlarged(false)}
        />
      ) : null}
      <h3 className="hp-demo-panel__title">{panel.title}</h3>
      <p className="hp-demo-panel__description">{panel.description}</p>
    </article>
  )
}
