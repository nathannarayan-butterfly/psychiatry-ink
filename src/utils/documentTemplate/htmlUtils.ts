const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p', 'div', 'span'])

export function stripHtml(html: string): string {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent?.replace(/\u00a0/g, ' ').trim() ?? ''
}

export function htmlToPlainLines(html: string): string {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const tag = (node as HTMLElement).tagName.toLowerCase()
    if (tag === 'br') return '\n'
    if (tag === 'li') {
      const parent = node.parentElement?.tagName.toLowerCase()
      const prefix = parent === 'ol' ? '• ' : '• '
      return `${prefix}${Array.from(node.childNodes).map(walk).join('')}\n`
    }
    if (tag === 'p' || tag === 'div') {
      const inner = Array.from(node.childNodes).map(walk).join('')
      return inner.endsWith('\n') ? inner : `${inner}\n`
    }
    return Array.from(node.childNodes).map(walk).join('')
  }
  return Array.from(el.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim()
}

export function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  const clean = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(true)
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const src = node as HTMLElement
    const tag = src.tagName.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) {
      const frag = document.createDocumentFragment()
      for (const child of Array.from(src.childNodes)) {
        const c = clean(child)
        if (c) frag.appendChild(c)
      }
      return frag
    }
    const out = document.createElement(tag)
    for (const child of Array.from(src.childNodes)) {
      const c = clean(child)
      if (c) out.appendChild(c)
    }
    return out
  }
  const result = document.createElement('div')
  for (const child of Array.from(el.childNodes)) {
    const c = clean(child)
    if (c) result.appendChild(c)
  }
  return result.innerHTML
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
