import { Hono } from 'hono'
import { endSession, getSessionUserId, startSession } from '../auth'
import { newId } from '../db'
import type { Bindings, Variables } from '../types'
import { emailSchema } from '../validation'

export const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Email-only sign-in: look up (or create) the user, then start a session.
// No password / magic link — see README walkthrough for the justification.
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = emailSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Enter a valid email' }, 400)

  const { email } = parsed.data
  const existing = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string }>()

  let user = existing
  if (!user) {
    const id = newId()
    await c.env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)')
      .bind(id, email, Date.now())
      .run()
    user = { id, email }
  }

  await startSession(c, user.id)
  return c.json({ id: user.id, email: user.email })
})

auth.get('/me', async (c) => {
  const userId = await getSessionUserId(c)
  if (!userId) return c.json({ error: 'Not authenticated' }, 401)

  const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; email: string }>()
  // Cookie valid but user gone (e.g. wiped dev DB): treat as logged out.
  if (!user) return c.json({ error: 'Not authenticated' }, 401)

  return c.json(user)
})

auth.post('/logout', (c) => {
  endSession(c)
  return c.json({ ok: true })
})
