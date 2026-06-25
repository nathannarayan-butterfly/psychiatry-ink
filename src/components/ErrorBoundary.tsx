import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
}

/**
 * App-level safety net. Any uncaught render/runtime error in the tree is
 * caught here and shown as a recoverable fallback instead of white-screening
 * the entire app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : undefined,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] uncaught error:', error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#24211E',
          background: '#FFFFFF',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          Something went wrong · Es ist ein Fehler aufgetreten
        </h1>
        <p style={{ maxWidth: '32rem', color: '#6D655C', margin: 0 }}>
          The application could not display this view. Your locally stored data is
          safe — please reload the page.
        </p>
        <p style={{ maxWidth: '32rem', color: '#6D655C', margin: 0 }}>
          Die Anwendung konnte diesen Bereich nicht anzeigen. Ihre lokal
          gespeicherten Daten bleiben erhalten. Bitte laden Sie die Seite neu.
        </p>
        {this.state.message ? (
          <code
            style={{
              fontSize: '0.75rem',
              color: '#91887E',
              maxWidth: '32rem',
              wordBreak: 'break-word',
            }}
          >
            {this.state.message}
          </code>
        ) : null}
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            border: '2px solid #24211E',
            background: '#24211E',
            color: '#FFFFFF',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reload page · Seite neu laden
        </button>
      </div>
    )
  }
}
