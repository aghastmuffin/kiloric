export function canonicalizeStaticPath(pathname, basePath = '/app') {
  const base = `/${basePath.split('/').filter(Boolean).join('/')}`
  if (base !== '/' && pathname !== base && !pathname.startsWith(`${base}/`)) return null
  if (pathname.endsWith('/index.html')) return pathname.slice(0, -'index.html'.length)
  if (pathname.endsWith('.html')) return `${pathname.slice(0, -'.html'.length)}/`
  return null
}

export function staticRouteNormalizationScript(basePath = '/app') {
  return `(function(){var canonicalize=${canonicalizeStaticPath.toString()};var next=canonicalize(window.location.pathname,${JSON.stringify(basePath)});if(next){window.history.replaceState(window.history.state,'',next+window.location.search+window.location.hash)}})();`
}

export function injectStaticRouteNormalization(html, basePath = '/app') {
  const script = `<script>${staticRouteNormalizationScript(basePath)}</script>`
  return html.replace(/<head\b[^>]*>/, (head) => `${head}${script}`)
}
