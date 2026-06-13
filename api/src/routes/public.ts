import { Hono } from 'hono'
import { getSurveyWithQuestions, newId } from '../db'
import type { Bindings, SurveyWithQuestions, Variables } from '../types'
import { responseInputSchema } from '../validation'

// Unauthenticated routes for respondents. Only published surveys are reachable.
export const publicRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

publicRoutes.get('/surveys/:id', async (c) => {
  const survey = await getSurveyWithQuestions(c.env.DB, c.req.param('id'))
  if (!survey || survey.status !== 'published') return c.json({ error: 'Survey not found' }, 404)
  return c.json(survey)
})

publicRoutes.post('/surveys/:id/responses', async (c) => {
  const survey = await getSurveyWithQuestions(c.env.DB, c.req.param('id'))
  if (!survey || survey.status !== 'published') return c.json({ error: 'Survey not found' }, 404)

  const parsed = responseInputSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'Invalid submission' }, 400)

  const error = validateAnswers(survey, parsed.data.answers)
  if (error) return c.json({ error }, 400)

  // Insert the response and its answers atomically. Only answers that map to a
  // real question and carry a value are stored.
  const responseId = newId()
  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare('INSERT INTO responses (id, survey_id, created_at) VALUES (?, ?, ?)').bind(
      responseId,
      survey.id,
      Date.now(),
    ),
  ]
  for (const question of survey.questions) {
    const value = parsed.data.answers[question.id]?.trim()
    if (!value) continue
    statements.push(
      c.env.DB.prepare(
        'INSERT INTO answers (id, response_id, question_id, value) VALUES (?, ?, ?, ?)',
      ).bind(newId(), responseId, question.id, value),
    )
  }

  await c.env.DB.batch(statements)
  return c.json({ ok: true }, 201)
})

// Server-side answer validation: enforce required questions and that choice /
// rating answers fall within what the question allows. Returns an error message
// or null if everything checks out.
function validateAnswers(
  survey: SurveyWithQuestions,
  answers: Record<string, string>,
): string | null {
  for (const q of survey.questions) {
    const value = answers[q.id]?.trim() ?? ''

    if (q.required && !value) return `"${q.label}" is required`
    if (!value) continue

    if (q.type === 'multiple_choice' && !q.options.includes(value)) {
      return `Invalid choice for "${q.label}"`
    }
    if (q.type === 'rating') {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1 || n > q.max) return `Invalid rating for "${q.label}"`
    }
  }
  return null
}
