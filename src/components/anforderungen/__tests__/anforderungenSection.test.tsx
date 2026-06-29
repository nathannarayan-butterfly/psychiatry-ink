/**
 * The Anforderungen review section (mounted as a dedicated Diagnostik section)
 * must surface a case's catalog Anforderungen in one place.
 *
 * Verified here:
 *  - it renders the case's created Anforderungen,
 *  - it is registered as a navigable Diagnostik section,
 *  - it is case-scoped: orders from another case do NOT leak in, and a case
 *    with no orders shows the empty state (so it has nothing to show outside a
 *    patient/case context).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Anforderung } from '../../../types/anforderung'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('../../../hooks/permissions/useCurrentOrganisation', () => ({
  useCurrentOrganisation: () => ({ organisation: { tier: 'free', name: 'Org' } }),
}))
vi.mock('../../../hooks/permissions/useCurrentMember', () => ({
  useCurrentMember: () => ({ role: 'owner' }),
}))
vi.mock('../../../hooks/useAccountDisplayName', () => ({ useAccountDisplayName: () => 'Dr Test' }))
vi.mock('../../notion/NotionToast', () => ({ showNotionToast: vi.fn() }))
// Provide patient identity for case-A only (case-B stays patient-less).
vi.mock('../../../hooks/useCaseRegistry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useCaseRegistry')>()),
  getCaseMeta: (id: string) =>
    id.startsWith('pat-') ? { localName: 'Max Mustermann', localGeburtsdatum: '1990-01-01' } : undefined,
}))

import { AnforderungenSidebarSection } from '../AnforderungenSidebarSection'
import { upsertAnforderung, loadAnforderungen } from '../../../utils/anforderungen/storage'
import { DIAGNOSTICS_SECTIONS, isDiagnosticsSectionId } from '../../../data/diagnosticsSections'

function makeOrder(caseId: string, label: string): Anforderung {
  const now = new Date().toISOString()
  return {
    id: `ord-${label}-${Math.random().toString(36).slice(2)}`,
    caseId,
    catalogId: 'labor-blutbild',
    category: 'labor',
    label,
    urgency: 'routine',
    requestedDate: '2026-06-29',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(caseId: string): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      createElement(AnforderungenSidebarSection, {
        caseId,
        onAddClick: () => {},
        onNavigateToLabor: () => {},
      }),
    )
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(async () => {
  if (root) {
    const current = root
    await act(async () => current.unmount())
    root = null
  }
  container?.remove()
  container = null
})

describe('AnforderungenSidebarSection — review list', () => {
  it('is registered as a navigable Diagnostik section', () => {
    expect(isDiagnosticsSectionId('anforderungen')).toBe(true)
    expect(DIAGNOSTICS_SECTIONS.some((s) => s.id === 'anforderungen' && s.enabled)).toBe(true)
  })

  it('renders the created Anforderungen for the case', async () => {
    upsertAnforderung(makeOrder('case-A', 'Blutbild'), 'case-A')
    upsertAnforderung(makeOrder('case-A', 'CRP'), 'case-A')
    await mount('case-A')
    const text = container!.textContent ?? ''
    expect(text).toContain('Blutbild')
    expect(text).toContain('CRP')
    expect(container!.querySelectorAll('.anforderung-row').length).toBe(2)
  })

  it('is case-scoped — another case\'s orders do not leak in', async () => {
    upsertAnforderung(makeOrder('case-A', 'Blutbild'), 'case-A')
    await mount('case-B')
    expect(container!.querySelectorAll('.anforderung-row').length).toBe(0)
    expect(container!.querySelector('.anforderungen-sidebar__empty')).toBeTruthy()
  })

  it('renders patient identity + requisition metadata on screen', async () => {
    upsertAnforderung(makeOrder('pat-1', 'Blutbild'), 'pat-1')
    await mount('pat-1')
    const text = container!.textContent ?? ''
    expect(container!.querySelector('.anforderungen-sidebar__patient')).toBeTruthy()
    expect(text).toContain('Max Mustermann')
    expect(text).toContain('1990-01-01')
    // urgency surfaced per-row
    expect(container!.querySelector('.anforderung-row__urgency')).toBeTruthy()
    // export toolbar present when there are orders
    expect(container!.querySelectorAll('.anforderungen-sidebar__export-btn').length).toBeGreaterThan(0)
  })

  it('delete is guarded by a confirm and removes the record + updates the list', async () => {
    const caseId = 'del-ui-1'
    upsertAnforderung(makeOrder(caseId, 'Blutbild'), caseId)
    await mount(caseId)
    const delBtn = () =>
      container!.querySelector<HTMLButtonElement>('button[aria-label="anforderungDelete"]')
    expect(delBtn()).toBeTruthy()

    // Cancelled confirm → no removal
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await act(async () => {
      delBtn()!.click()
      await Promise.resolve()
    })
    expect(loadAnforderungen(caseId)).toHaveLength(1)
    expect(container!.querySelectorAll('.anforderung-row').length).toBe(1)

    // Confirmed → record permanently removed and list live-updates
    confirmSpy.mockReturnValue(true)
    await act(async () => {
      delBtn()!.click()
      await Promise.resolve()
    })
    expect(loadAnforderungen(caseId)).toHaveLength(0)
    expect(container!.querySelectorAll('.anforderung-row').length).toBe(0)
    confirmSpy.mockRestore()
  })
})
