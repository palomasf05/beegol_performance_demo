const crypto = require('crypto')
const demoConfig = require('../lib/demo-config')
const {
  createSession,
  readSession,
  sessionCookie,
  expiredSessionCookie,
  safeEqual
} = require('../lib/session')

function getUsers() {
  try {
    const users = JSON.parse(process.env.PORTAL_USERS || '{}')
    if (users && typeof users === 'object' && Object.keys(users).length) {
      return Object.fromEntries(
        Object.entries(users).map(([user, password]) => [user.toLowerCase(), String(password)])
      )
    }

    return {}
  } catch {
    throw new Error('PORTAL_USERS deve ser um objeto JSON vÃ¡lido')
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const session = readSession(req)
    return session
      ? res.status(200).json({ authenticated: true, user: session.user })
      : res.status(401).json({ authenticated: false })
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', expiredSessionCookie())
    return res.status(200).json({ authenticated: false })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'MÃ©todo nÃ£o permitido' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const user = String(body.user || '').trim().toLowerCase()
    const password = String(body.password || '')
    const users = user === 'demo' ? {} : getUsers()
    const expectedPassword = users[user]

    const validPassword = user === 'demo'
      ? safeEqual(crypto.createHash('sha256').update(password).digest('hex'), demoConfig.demoPasswordHash)
      : Boolean(expectedPassword && safeEqual(password, expectedPassword))

    if (!validPassword) {
      return res.status(401).json({ error: 'UsuÃ¡rio ou senha incorretos' })
    }

    const token = createSession(user)
    res.setHeader('Set-Cookie', sessionCookie(token))
    return res.status(200).json({ authenticated: true, user })
  } catch (error) {
    console.error('Session error:', error)
    return res.status(500).json({ error: error.message })
  }
}
