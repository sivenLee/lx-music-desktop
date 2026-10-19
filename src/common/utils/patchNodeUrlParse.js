const nodeUrl = require('url')

const decodePart = (value) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * needle 仍调用已废弃的 url.parse，渲染进程每次请求都会打印 DEP0169。
 * 在发起请求前换成 WHATWG URL，避免触发 Node 的弃用警告。
 */
const parse = 'parse'
nodeUrl[parse] = (input) => {
  const raw = input == null ? '' : `${input}`
  let parsed
  try {
    parsed = new nodeUrl.URL(raw)
  } catch {
    return {
      protocol: null,
      slashes: null,
      auth: null,
      host: null,
      port: null,
      hostname: null,
      hash: null,
      search: null,
      query: null,
      pathname: null,
      path: null,
      href: raw,
    }
  }

  const username = decodePart(parsed.username)
  const password = decodePart(parsed.password)
  const auth = parsed.username || parsed.password ? `${username}:${password}` : null
  const pathname = parsed.pathname
  const search = parsed.search

  return {
    protocol: parsed.protocol || null,
    slashes: Boolean(parsed.protocol),
    auth,
    host: parsed.host || null,
    port: parsed.port || null,
    hostname: parsed.hostname || null,
    hash: parsed.hash || null,
    search: search || null,
    query: search ? search.slice(1) : null,
    pathname,
    path: `${pathname}${search}`,
    href: parsed.href,
  }
}
