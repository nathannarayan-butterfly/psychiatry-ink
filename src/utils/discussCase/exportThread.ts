import { FONT_SANS } from '../../styles/typographyTokens'

/** A single message flattened for export (author/timestamps already resolved). */
export interface DiscussThreadExportMessage {
  authorName: string
  roleTag?: string | null
  createdAt: string
  pinned: boolean
  edited: boolean
  kind: 'text' | 'voice'
  body: string
  /** De-identified transcript text for voice messages, when present. */
  transcript?: string | null
}

export interface DiscussThreadExportLabels {
  voiceMessage: string
  transcriptLabel: string
  pinned: string
  edited: string
  generatedAt: string
  resolution: string
}

export interface DiscussThreadExportInput {
  title: string
  generatedAt: string
  resolutionSummary?: string | null
  messages: DiscussThreadExportMessage[]
  labels: DiscussThreadExportLabels
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } catch {
    return iso
  }
}

function messageBodyText(message: DiscussThreadExportMessage, labels: DiscussThreadExportLabels): string {
  const lines: string[] = []
  if (message.kind === 'voice') {
    lines.push(`[${labels.voiceMessage}]`)
    if (message.transcript?.trim()) {
      lines.push(`${labels.transcriptLabel}: ${message.transcript.trim()}`)
    }
  } else if (message.body.trim()) {
    lines.push(message.body.trim())
  }
  return lines.join('\n')
}

export function buildDiscussThreadPlainText(input: DiscussThreadExportInput): string {
  const header = `${input.title.trim()}\n${input.labels.generatedAt}: ${formatTimestamp(input.generatedAt)}`

  const resolution = input.resolutionSummary?.trim()
    ? `\n\n${input.labels.resolution}:\n${input.resolutionSummary.trim()}`
    : ''

  const entries = input.messages.map((message) => {
    const flags = [
      message.pinned ? `★ ${input.labels.pinned}` : '',
      message.edited ? `(${input.labels.edited})` : '',
    ]
      .filter(Boolean)
      .join(' ')
    const author = [message.authorName, message.roleTag ? `(${message.roleTag})` : '']
      .filter(Boolean)
      .join(' ')
    const metaLine = [formatTimestamp(message.createdAt), author, flags].filter(Boolean).join(' · ')
    return `${metaLine}\n${messageBodyText(message, input.labels)}`.trim()
  })

  return [`${header}${resolution}`, ...entries].filter(Boolean).join('\n\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildDiscussThreadPrintHtml(input: DiscussThreadExportInput): string {
  const resolution = input.resolutionSummary?.trim()
    ? `<section class="resolution"><h2>${escapeHtml(input.labels.resolution)}</h2><pre>${escapeHtml(
        input.resolutionSummary.trim(),
      )}</pre></section>`
    : ''

  const bodyEntries = input.messages
    .map((message) => {
      const author = [message.authorName, message.roleTag ? `(${message.roleTag})` : '']
        .filter(Boolean)
        .join(' ')
      const flags = [
        message.pinned ? `<span class="flag flag--pin">★ ${escapeHtml(input.labels.pinned)}</span>` : '',
        message.edited ? `<span class="flag">(${escapeHtml(input.labels.edited)})</span>` : '',
      ]
        .filter(Boolean)
        .join(' ')
      return `<article class="msg${message.pinned ? ' msg--pinned' : ''}">
  <div class="meta">${escapeHtml(formatTimestamp(message.createdAt))} · ${escapeHtml(author)} ${flags}</div>
  <pre>${escapeHtml(messageBodyText(message, input.labels))}</pre>
</article>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    body { font-family: ${FONT_SANS}; font-size: 12pt; line-height: 1.6; margin: 2cm; color: #111; }
    h1 { font-size: 18pt; font-weight: 600; margin: 0 0 0.25rem; }
    .exported { font-size: 10pt; color: #666; margin: 0 0 1.5rem; }
    .resolution { margin: 0 0 1.5rem; padding: 0.8rem 1rem; background: #f5f5f0; border-radius: 8px; }
    .resolution h2 { font-size: 12pt; font-weight: 600; margin: 0 0 0.4rem; }
    .msg { margin: 0 0 1.1rem; padding-bottom: 0.9rem; border-bottom: 1px solid #e8e8e4; }
    .msg:last-child { border-bottom: none; }
    .msg--pinned { background: #fffdf3; }
    .meta { font-size: 10pt; font-weight: 600; color: #555; margin: 0 0 0.3rem; }
    .flag { font-weight: 500; color: #8a6d00; }
    .flag--pin { color: #8a6d00; }
    pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.title)}</h1>
  <p class="exported">${escapeHtml(input.labels.generatedAt)}: ${escapeHtml(formatTimestamp(input.generatedAt))}</p>
  ${resolution}
  ${bodyEntries}
</body>
</html>`
}

export function printDiscussThread(input: DiscussThreadExportInput): void {
  const html = buildDiscussThreadPrintHtml(input)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export async function copyDiscussThreadText(input: DiscussThreadExportInput): Promise<void> {
  const text = buildDiscussThreadPlainText(input)
  await navigator.clipboard.writeText(text)
}
