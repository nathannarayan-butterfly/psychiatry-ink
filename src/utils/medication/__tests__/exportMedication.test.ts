// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buildKbChartImagesHtml, captureKbChartImages } from '../captureKbChartImages'
import { buildMedicationHtml } from '../exportMedication'
import { DEFAULT_EXPORT_LABELS } from '../exportMedication'
import type { KnowledgeBaseDrug } from '../../../types/knowledgeBase'

describe('captureKbChartImages', () => {
  it('captures SVG from marked chart containers', () => {
    const root = document.createElement('div')
    const chart = document.createElement('div')
    chart.setAttribute('data-kb-export-chart', 'pharmakokinetik')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '200')
    svg.setAttribute('height', '100')
    chart.appendChild(svg)
    root.appendChild(chart)

    const images = captureKbChartImages(root)
    expect(images.pharmakokinetik).toBeTruthy()
    expect(images.pharmakokinetik.startsWith('data:image/svg+xml')).toBe(true)
  })

  it('builds print HTML img tags for chart snapshots', () => {
    const html = buildKbChartImagesHtml({ pk: 'data:image/svg+xml;charset=utf-8,%3Csvg/%3E' }, (v) => v)
    expect(html).toContain('data-chart-key="pk"')
    expect(html).toContain('<img src="data:image/svg+xml')
  })
})

describe('buildMedicationHtml chart placeholders', () => {
  const drug: KnowledgeBaseDrug = {
    id: 'd1',
    genericName: 'TestDrug',
    brandNames: [],
    drugClass: '',
    category: 'Auto',
    psychClass: 'unspecified',
    tags: [],
    status: 'active',
    sections: [
      {
        id: 's1',
        key: 'pharmakokinetik',
        label: 'PK',
        content: 'Half-life 24h',
        isDefault: true,
        isCollapsedByDefault: false,
        order: 0,
        hidden: false,
        kind: 'pk',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('embeds section chart images when provided', () => {
    const html = buildMedicationHtml(drug, DEFAULT_EXPORT_LABELS, {
      pharmakokinetik: 'data:image/svg+xml;charset=utf-8,%3Csvg/%3E',
      receptor: 'data:image/svg+xml;charset=utf-8,%3Csvg%20id=%22r%22/%3E',
    })
    expect(html).toContain('data:image/svg+xml')
    expect(html).toContain('med-print__chart')
    expect(html).toContain('PK')
  })
})
