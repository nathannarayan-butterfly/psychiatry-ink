import { useEffect } from 'react'
import { resolveDomainConfig } from '../config/domainConfig'
import type { DomainSeoConfig } from '../config/domainConfig'
import { getEffectiveHostname } from '../utils/resolveHostname'

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.content = content
}

function applyMarketingSeo(seo: DomainSeoConfig) {
  document.title = seo.title
  upsertMeta('description', seo.description)
  upsertMeta('og:title', seo.ogTitle, 'property')
  upsertMeta('og:description', seo.ogDescription, 'property')
  upsertMeta('og:site_name', seo.ogSiteName, 'property')
}

/** Sets document title and Open Graph meta tags from the active marketing domain. */
export function useMarketingSeo() {
  const seo = resolveDomainConfig(getEffectiveHostname()).seo

  useEffect(() => {
    applyMarketingSeo(seo)
  }, [seo.description, seo.ogDescription, seo.ogSiteName, seo.ogTitle, seo.title])
}
