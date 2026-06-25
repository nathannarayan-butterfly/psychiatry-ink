// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DocumentTemplate } from '../../../types/documentTemplate'
import { TEMPLATE_SHARE_MAGIC_LINE } from '../../../schemas/documentTemplate/shareEnvelope'
import {
  base64UrlDecode,
  base64UrlEncode,
  buildTemplateShareFilename,
  encodeTemplateShareFile,
  parseTemplateShareFile,
} from '../shareFormat'

const SAMPLE_TEMPLATE: DocumentTemplate = {
  id: 'tpl-original',
  title: 'Arztbrief Vorlage',
  description: 'Standardbrief',
  category: 'arztbrief',
  language: 'de',
  version: 2,
  status: 'active',
  availability: {
    emptyWorkspace: false,
    patientWorkspace: true,
    patientDocuments: true,
  },
  fields: [
    {
      id: 'field-1',
      type: 'heading',
      label: 'Anrede',
      order: 0,
    },
    {
      id: 'field-2',
      type: 'short_text',
      label: 'Betreff',
      required: true,
      order: 1,
    },
  ],
  pageSettings: {
    format: 'a4',
    margins: { top: 20, right: 20, bottom: 20, left: 25 },
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  createdBy: 'Dr. Test',
}

describe('documentTemplate shareFormat', () => {
  it('exports a signed .psychiatry-ink envelope with magic header', async () => {
    const file = await encodeTemplateShareFile(SAMPLE_TEMPLATE, {
      name: 'Dr. Export',
      email: 'export@example.com',
    })

    expect(file.startsWith(`${TEMPLATE_SHARE_MAGIC_LINE}\n`)).toBe(true)
    const encoded = file.split('\n')[1]
    expect(encoded).toBeTruthy()
    expect(() => base64UrlDecode(encoded!)).not.toThrow()
  })

  it('round-trips template content through import parse', async () => {
    const file = await encodeTemplateShareFile(SAMPLE_TEMPLATE, { name: 'Dr. Export' })
    const parsed = await parseTemplateShareFile(file)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.preview.title).toBe('Arztbrief Vorlage')
    expect(parsed.preview.fieldCount).toBe(2)
    expect(parsed.preview.creator?.name).toBe('Dr. Export')
    expect(parsed.payload.template.title).toBe(SAMPLE_TEMPLATE.title)
    expect(parsed.payload.template.fields).toHaveLength(2)
    expect(parsed.payload.template.fields[1]?.label).toBe('Betreff')
  })

  it('rejects invalid magic header', async () => {
    const file = await encodeTemplateShareFile(SAMPLE_TEMPLATE)
    const tampered = file.replace(TEMPLATE_SHARE_MAGIC_LINE, 'NOT-A-VORLAGE')
    const parsed = await parseTemplateShareFile(tampered)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toBe('invalid_magic')
  })

  it('rejects tampered payload signatures', async () => {
    const file = await encodeTemplateShareFile(SAMPLE_TEMPLATE)
    const [magic, encoded] = file.split('\n')
    const bundle = base64UrlDecode(encoded!)
    bundle[50] = bundle[50] === 0 ? 1 : 0
    const parsed = await parseTemplateShareFile(`${magic}\n${base64UrlEncode(bundle)}`)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toBe('tampered')
  })

  it('rejects malformed envelopes', async () => {
    const parsed = await parseTemplateShareFile('broken-content')
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toBe('malformed')
  })

  it('round-trips rich-text (TipTap) field content with typography styles', async () => {
    const richTemplate: DocumentTemplate = {
      ...SAMPLE_TEMPLATE,
      fields: [
        {
          id: 'rich-1',
          type: 'static_text',
          order: 0,
          defaultValue:
            '<p style="text-align: center"><span style="font-family: Georgia, serif; font-size: 18pt"><strong>Briefkopf</strong></span></p>',
          layout: { colSpan: 12 },
        },
        {
          id: 'rich-2',
          type: 'long_text',
          label: 'Verlauf',
          order: 1,
          layout: { colSpan: 6, minHeightMm: 30 },
        },
      ],
    }

    const file = await encodeTemplateShareFile(richTemplate)
    const parsed = await parseTemplateShareFile(file)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const fields = parsed.payload.template.fields
    expect(fields[0]?.defaultValue).toBe(richTemplate.fields[0]!.defaultValue)
    expect(fields[0]?.layout?.colSpan).toBe(12)
    expect(fields[1]?.layout?.minHeightMm).toBe(30)
  })

  it('builds stable share filenames', () => {
    expect(buildTemplateShareFilename('Arztbrief / Entlassung')).toBe('Arztbrief-Entlassung.psychiatry-ink')
  })
})
