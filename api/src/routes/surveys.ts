import { Hono } from 'hono'
import { requireAuth } from '../auth'
import { getSurveyWithQuestions, listSurveysForUser, newId } from '../db'
import type { Bindings, Variables } from '../types'
import { surveyInputSchema } from '../validation'

export const surveys = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Every route here is owner-only.
surveys.use('*', requireAuth)

// Confirms the survey exists and belongs to the caller. Returns false for both
// "missing" and "not yours" so we never leak which surveys exist.
async function owns(db: D1Database, surveyId: string, userId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM surveys WHERE id = ? AND user_id = ?')
    .bind(surveyId, userId)
    .first()
  return row !== null
}

surveys.get('/', async (c) => {
  const list = await listSurveysForUser(c.env.DB, c.get('userId'))
  return c.json(list)
})

// Creates a blank draft so the builder always edits a real, saved survey.
surveys.post('/', async (c) => {
  const id = newId()
  const now = Date.now()
  await c.env.DB.prepare(
    'INSERT INTO surveys (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, c.get('userId'), 'Untitled survey', now, now)
    .run()
  return c.json({ id }, 201)
})

surveys.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!(await owns(c.env.DB, id, c.get('userId')))) return c.json({ error: 'Not found' }, 404)

  const survey = await getSurveyWithQuestions(c.env.DB, id)
  return survey ? c.json(survey) : c.json({ error: 'Not found' }, 404)
})

// Saves the whole survey as one document: the survey row is updated and its
// questions are fully replaced. Simplest correct model for add/remove/reorder —
// array order becomes `position`. Wrapped in a batch so it's atomic.
surveys.put('/:id', async (c) => {
  const id = c.req.param('id')
  if (!(await owns(c.env.DB, id, c.get('userId')))) return c.json({ error: 'Not found' }, 404)

  const parsed = surveyInputSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'Invalid survey', issues: parsed.error.issues }, 400)
  }
  const input = parsed.data

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `UPDATE surveys
       SET title = ?, description = ?, primary_color = ?, logo_url = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      input.title,
      input.description,
      input.primaryColor,
      input.logoUrl,
      input.status,
      Date.now(),
      id,
    ),
    c.env.DB.prepare('DELETE FROM questions WHERE survey_id = ?').bind(id),
  ]

  input.questions.forEach((q, position) => {
    // Persist only the config each type actually uses.
    const config =
      q.type === 'multiple_choice'
        ? JSON.stringify({ options: q.options })
        : q.type === 'rating'
          ? JSON.stringify({ max: q.max })
          : '{}'
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO questions (id, survey_id, type, label, required, position, config)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(newId(), id, q.type, q.label, q.required ? 1 : 0, position, config),
    )
  })

  await c.env.DB.batch(statements)

  const updated = await getSurveyWithQuestions(c.env.DB, id)
  return c.json(updated)
})

surveys.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!(await owns(c.env.DB, id, c.get('userId')))) return c.json({ error: 'Not found' }, 404)

  // Delete children before the survey, explicitly, rather than relying on
  // ON DELETE CASCADE being enabled — atomic via batch.
  await c.env.DB.batch([
    c.env.DB.prepare(
      'DELETE FROM answers WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)',
    ).bind(id),
    c.env.DB.prepare('DELETE FROM responses WHERE survey_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM questions WHERE survey_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM surveys WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})

// Raw responses for a survey. The dashboard computes counts/averages/breakdowns
// from this client-side — keeps the API lean and the data in one shape.
surveys.get('/:id/responses', async (c) => {
  const id = c.req.param('id')
  if (!(await owns(c.env.DB, id, c.get('userId')))) return c.json({ error: 'Not found' }, 404)

  const survey = await getSurveyWithQuestions(c.env.DB, id)
  if (!survey) return c.json({ error: 'Not found' }, 404)

  const responses = await loadResponses(c.env.DB, id)
  return c.json({ survey, responses })
})

// CSV export: one row per response, one column per question. Built server-side
// so the browser gets a proper file download.
surveys.get('/:id/responses.csv', async (c) => {
  const id = c.req.param('id')
  if (!(await owns(c.env.DB, id, c.get('userId')))) return c.json({ error: 'Not found' }, 404)

  const survey = await getSurveyWithQuestions(c.env.DB, id)
  if (!survey) return c.json({ error: 'Not found' }, 404)

  const responses = await loadResponses(c.env.DB, id)
  const header = ['Submitted at', ...survey.questions.map((q) => q.label)]
  const rows = responses.map((r) => [
    new Date(r.createdAt).toISOString(),
    ...survey.questions.map((q) => r.answers[q.id] ?? ''),
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')

  const filename = `${slugify(survey.title)}-responses.csv`
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})

interface ResponseRecord {
  id: string
  createdAt: number
  answers: Record<string, string>
}

// Loads every response for a survey and groups its answers into a
// questionId -> value map. Two queries regardless of response count.
async function loadResponses(db: D1Database, surveyId: string): Promise<ResponseRecord[]> {
  const { results: responseRows } = await db
    .prepare('SELECT id, created_at FROM responses WHERE survey_id = ? ORDER BY created_at DESC')
    .bind(surveyId)
    .all<{ id: string; created_at: number }>()

  const { results: answerRows } = await db
    .prepare(`
      SELECT a.response_id, a.question_id, a.value
      FROM answers a
      JOIN responses r ON r.id = a.response_id
      WHERE r.survey_id = ?
    `)
    .bind(surveyId)
    .all<{ response_id: string; question_id: string; value: string }>()

  const answersByResponse = new Map<string, Record<string, string>>()
  for (const row of answerRows) {
    const map = answersByResponse.get(row.response_id) ?? {}
    map[row.question_id] = row.value
    answersByResponse.set(row.response_id, map)
  }

  return responseRows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    answers: answersByResponse.get(r.id) ?? {},
  }))
}

// Quote a CSV cell only when needed (comma, quote, or newline), doubling any
// embedded quotes per RFC 4180.
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'survey'
  )
}
