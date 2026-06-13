import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { Bindings, Variables } from './types'

const COOKIE_NAME = 'session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

// Dev-only fallback so a fresh clone works with zero setup. Production must set
// a real secret via `wrangler secret put SESSION_SECRET`.
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>

function secret(c: AppContext): string {
  return c.env.SESSION_SECRET || DEV_SECRET
}

// The session cookie holds nothing but the user id, signed with HMAC so it
// can't be forged. No server-side session table needed for an email-only flow.
export async function startSession(c: AppContext, userId: string): Promise<void> {
  await setSignedCookie(c, COOKIE_NAME, userId, secret(c), {
    httpOnly: true,
    sameSite: 'Lax',
    secure: c.req.url.startsWith('https'),
    path: '/',
    maxAge: THIRTY_DAYS,
  })
}

export function endSession(c: AppContext): void {
  deleteCookie(c, COOKIE_NAME, { path: '/' })
}

export async function getSessionUserId(c: AppContext): Promise<string | null> {
  const value = await getSignedCookie(c, secret(c), COOKIE_NAME)
  // false = signature mismatch (tampered), undefined = absent.
  return value || null
}

// Gate for owner-only routes: 401s unless a valid session cookie is present,
// otherwise stashes the user id for handlers to read.
export const requireAuth: MiddlewareHandler<{
  Bindings: Bindings
  Variables: Variables
}> = async (c, next) => {
  const userId = await getSessionUserId(c)
  if (!userId) return c.json({ error: 'Not authenticated' }, 401)
  c.set('userId', userId)
  await next()
}
