import { afterEach, describe, expect, it, vi } from 'vitest'
import { printHtmlDocument, openHtmlPreviewWindow } from '../printDocument'

const SAMPLE = '<!doctype html><html><body><h1>Hi</h1></body></html>'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('printHtmlDocument', () => {
  it('writes into a freshly opened window and prints it', () => {
    vi.useFakeTimers()
    const print = vi.fn()
    let written = ''
    const fakeWin = {
      document: {
        open: vi.fn(),
        write: (c: string) => {
          written += c
        },
        close: vi.fn(),
      },
      focus: vi.fn(),
      print,
      setTimeout: (fn: () => void) => fn(),
    } as unknown as Window
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin)

    printHtmlDocument(SAMPLE)

    expect(openSpy).toHaveBeenCalledWith('', '_blank', expect.stringContaining('width'))
    expect(written).toContain('<h1>Hi</h1>')
    expect(print).toHaveBeenCalled()
  })

  it('does not throw and uses an iframe when the popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    expect(() => printHtmlDocument(SAMPLE, { autoPrint: false })).not.toThrow()
    expect(appendSpy).toHaveBeenCalled()
  })

  it('respects autoPrint:false (no print call on the opened window)', () => {
    const print = vi.fn()
    const fakeWin = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print,
      setTimeout: (fn: () => void) => fn(),
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(fakeWin)
    printHtmlDocument(SAMPLE, { autoPrint: false })
    expect(print).not.toHaveBeenCalled()
  })
})

describe('openHtmlPreviewWindow', () => {
  it('returns true when a window opens', () => {
    const fakeWin = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(fakeWin)
    expect(openHtmlPreviewWindow(SAMPLE)).toBe(true)
  })

  it('returns false when the popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    expect(openHtmlPreviewWindow(SAMPLE)).toBe(false)
  })
})
