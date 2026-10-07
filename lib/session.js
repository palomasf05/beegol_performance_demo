const crypto = require('crypto')

const COOKIE_NAME = 'beegol_session'
const SESSION_SECONDS = 8 * 60 * 60

function encode(value) {
  return Buffer.from(value).toString('base64url')
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, item) => {
    const separator = item.indexOf('=')
    if (separator < 0) return cookies
    try { cookies[item.slice(0, separator).trim()] = decodeURIComponent(item.slice(separator + 1).trim()) } catch { /* Cookie inválido não cria sessão. */ }
    return cookies
  }, {})
}

function createSession(user) {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET não configurado')

  const payload = encode(JSON.stringify({
    user,
    expiresAt: Date.now() + SESSION_SECONDS * 1000
  }))

  return `${payload}.${sign(payload, secret)}`
}

function readSession(req) {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null

  const token = parseCookies(req.headers.cookie)[COOKIE_NAME]
  if (!token) return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!session.user || session.expiresAt <= Date.now()) return null
    return session
  } catch {
    return null
  }
}

function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'development' ? '' : 'Secure; '}SameSite=Lax; Max-Age=${SESSION_SECONDS}`
}

function expiredSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; ${process.env.NODE_ENV === 'development' ? '' : 'Secure; '}SameSite=Lax; Max-Age=0`
}

module.exports = {
  createSession,
  readSession,
  sessionCookie,
  expiredSessionCookie,
  safeEqual
}
