import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { PhoneGate } from '../PhoneGate'

function setViewport(width: number, height: number) {
  ;(window as unknown as { innerWidth: number }).innerWidth = width
  ;(window as unknown as { innerHeight: number }).innerHeight = height
  window.dispatchEvent(new Event('resize'))
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  try {
    window.sessionStorage.clear()
  } catch {
    /* ignore */
  }
})

afterEach(() => {
  act(() => root.unmount())
  document.body.removeChild(container)
})

async function render() {
  await act(async () => {
    root.render(createElement(PhoneGate, { language: 'de' }))
    // Allow the rAF-coalesced viewport sync in useViewport to flush.
    await new Promise((r) => setTimeout(r, 30))
  })
}

describe('PhoneGate', () => {
  it('shows below the phone breakpoint (phone portrait)', async () => {
    setViewport(390, 844)
    await render()
    expect(container.querySelector('.phone-gate')).not.toBeNull()
  })

  it('shows for a phone in landscape (shortest edge < 768)', async () => {
    setViewport(844, 390)
    await render()
    expect(container.querySelector('.phone-gate')).not.toBeNull()
  })

  it('is hidden at tablet size (iPad portrait, NOT gated)', async () => {
    setViewport(768, 1024)
    await render()
    expect(container.querySelector('.phone-gate')).toBeNull()
  })

  it('is hidden on desktop', async () => {
    setViewport(1440, 900)
    await render()
    expect(container.querySelector('.phone-gate')).toBeNull()
  })

  it('"continue anyway" dismisses the gate', async () => {
    setViewport(390, 844)
    await render()
    const btn = container.querySelector<HTMLButtonElement>('.phone-gate__continue')
    expect(btn).not.toBeNull()
    await act(async () => {
      btn!.click()
    })
    expect(container.querySelector('.phone-gate')).toBeNull()
  })

  it('reacts to a resize from tablet → phone', async () => {
    setViewport(1024, 768)
    await render()
    expect(container.querySelector('.phone-gate')).toBeNull()
    await act(async () => {
      setViewport(375, 812)
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(container.querySelector('.phone-gate')).not.toBeNull()
  })
})
