import { Hono } from 'hono'
import { auth } from './routes/auth'
import { publicRoutes } from './routes/public'
import { surveys } from './routes/surveys'
import type { Bindings, Variables } from './types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.route('/api/auth', auth)
app.route('/api/surveys', surveys)
app.route('/api/public', publicRoutes)

export default app
