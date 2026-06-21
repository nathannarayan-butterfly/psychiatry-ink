/**
 * Rich-text sanitisation for template content produced by the TipTap editor.
 *
 * TipTap emits semantic HTML with inline styles for typography
 * (font-family / font-size via the TextStyle mark, text-align via TextAlign).
 * The sanitiser keeps a curated allowlist of tags + style properties so that
 * fonts, sizes, lists and alignment survive into the preview / print / share
 * pipeline, while stripping anything that could be unsafe.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'div',
  'span',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'mark',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
])

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
])

/** Style properties that may be preserved on rendered content. */
const ALLOWED_STYLE_PROPS = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-decoration-line',
  'text-align',
  'line-height',
])

const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|[<>{}]/i

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
    if (BLOCK_TAGS.has(tag)) {
      const inner = Array.from(node.childNodes).map(walk).join('')
      return inner.endsWith('\n') ? inner : `${inner}\n`
    }
    return Array.from(node.childNodes).map(walk).join('')
  }
  return Array.from(el.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim()
}

/** Keep only allowlisted style declarations with safe values. */
function sanitizeStyleAttr(style: string): string {
  const out: string[] = []
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const value = decl.slice(idx + 1).trim()
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue
    if (!value || UNSAFE_STYLE_VALUE.test(value)) continue
    out.push(`${prop}: ${value}`)
  }
  return out.join('; ')
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
    const style = src.getAttribute('style')
    if (style) {
      const safe = sanitizeStyleAttr(style)
      if (safe) out.setAttribute('style', safe)
    }
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
