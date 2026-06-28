import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TranslationProvider } from '../../../context/TranslationContext'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const resendMock = vi.fn()

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ resendConfirmation: resendMock, isConfigured: true }),
}))

// Imported after the mock is registered so the component picks up the stub.
import { ResendConfirmation } from '../ResendConfirmation'

async function mount(props: { email?: string; lockEmail?: boolean }) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      createElement(TranslationProvider, null, createElement(ResendConfirmation, props)),
    )
  })
  return { container, root }
}

function getButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('.auth-resend__button') as HTMLButtonElement | null
  if (!button) throw new Error('resend button not found')
  return button
}

describe('ResendConfirmation', () => {
  let cleanup: (() => void) | null = null

  beforeEach(() => {
    resendMock.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup?.()
    cleanup = null
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('calls resendConfirmation with the locked email and disables (cooldown) after success', async () => {
    resendMock.mockResolvedValue({ error: null, rateLimited: false })
    const { container, root } = await mount({ email: 'doc@example.com', lockEmail: true })
    cleanup = () => act(() => root.unmount())

    const button = getButton(container)
    expect(button.disabled).toBe(false)

    await act(async () => {
      button.click()
    })

    expect(resendMock).toHaveBeenCalledTimes(1)
    expect(resendMock).toHaveBeenCalledWith('doc@example.com')

    // Cooldown started → button disabled and shows a countdown label.
    expect(button.disabled).toBe(true)
    expect(button.textContent).toMatch(/45/)

    // After the cooldown elapses the button re-enables.
    await act(async () => {
      vi.advanceTimersByTime(45_000)
    })
    expect(button.disabled).toBe(false)
  })

  it('does not call resend and shows an error when no email is provided', async () => {
    resendMock.mockResolvedValue({ error: null, rateLimited: false })
    const { container, root } = await mount({ lockEmail: false })
    cleanup = () => act(() => root.unmount())

    await act(async () => {
      getButton(container).click()
    })

    expect(resendMock).not.toHaveBeenCalled()
    expect(container.querySelector('.auth-form__error')).not.toBeNull()
  })

  it('surfaces a rate-limit message and still starts the cooldown', async () => {
    resendMock.mockResolvedValue({ error: 'slow down', rateLimited: true })
    const { container, root } = await mount({ email: 'doc@example.com', lockEmail: true })
    cleanup = () => act(() => root.unmount())

    await act(async () => {
      getButton(container).click()
    })

    expect(resendMock).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.auth-form__error')).not.toBeNull()
    expect(getButton(container).disabled).toBe(true)
  })
})
