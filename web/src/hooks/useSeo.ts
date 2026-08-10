import { useEffect } from 'react'

interface SeoOptions {
  title?: string
  description?: string
  url?: string
  image?: string
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (!content) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useSeo(opts: SeoOptions) {
  useEffect(() => {
    const defaultTitle = 'Luna Blog · 后端开发工程师的技术笔记'
    document.title = opts.title ? `${opts.title} - ${defaultTitle}` : defaultTitle
    setMeta('description', opts.description || '后端开发工程师的技术博客，分享 Linux、K8s、Go、Java 等技术实践与学习笔记。')
    setMeta('og:title', opts.title || defaultTitle, 'property')
    setMeta('og:description', opts.description || '', 'property')
    if (opts.url) setMeta('og:url', location.origin + opts.url, 'property')
    if (opts.image) setMeta('og:image', opts.image, 'property')
  }, [opts.title, opts.description, opts.url, opts.image])
}
