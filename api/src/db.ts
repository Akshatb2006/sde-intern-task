import type { Question, Survey, SurveyWithQuestions } from './types'

// Raw row shapes as they come back from D1 (snake_case, ints for booleans).
interface SurveyRow {
  id: string
  title: string
  description: string
  primary_color: string
  logo_url: string
  status: string
  created_at: number
  updated_at: number
}

interface QuestionRow {
  id: string
  type: string
  label: string
  required: number
  config: string
}

export function newId(): string {
  return crypto.randomUUID()
}

function rowToSurvey(row: SurveyRow): Survey {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    primaryColor: row.primary_color,
    logoUrl: row.logo_url,
    status: row.status as Survey['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToQuestion(row: QuestionRow): Question {
  // config is type-specific JSON; default the fields the UI always expects.
  const config = JSON.parse(row.config || '{}') as { options?: string[]; max?: number }
  return {
    id: row.id,
    type: row.type as Question['type'],
    label: row.label,
    required: row.required === 1,
    options: config.options ?? [],
    max: config.max ?? 5,
  }
}

// Loads a survey and its ordered questions in two queries. Shared by the owner
// editor and the public render path, so the mapping lives in one place.
export async function getSurveyWithQuestions(
  db: D1Database,
  surveyId: string,
): Promise<SurveyWithQuestions | null> {
  const surveyRow = await db
    .prepare('SELECT * FROM surveys WHERE id = ?')
    .bind(surveyId)
    .first<SurveyRow>()
  if (!surveyRow) return null

  const { results } = await db
    .prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY position ASC')
    .bind(surveyId)
    .all<QuestionRow>()

  return { ...rowToSurvey(surveyRow), questions: results.map(rowToQuestion) }
}

export async function listSurveysForUser(
  db: D1Database,
  userId: string,
): Promise<(Survey & { responseCount: number })[]> {
  // Left join keeps surveys with zero responses; COUNT over the joined rows
  // gives the per-survey total.
  const { results } = await db
    .prepare(`
      SELECT s.*, COUNT(r.id) AS response_count
      FROM surveys s
      LEFT JOIN responses r ON r.survey_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `)
    .bind(userId)
    .all<SurveyRow & { response_count: number }>()

  return results.map((row) => ({ ...rowToSurvey(row), responseCount: row.response_count }))
}
