// Domain types shared across the API. The web app keeps its own mirror of the
// response shapes (web/src/lib/types.ts) — small enough to duplicate, and it
// keeps the two packages decoupled.

export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'rating'

export type SurveyStatus = 'draft' | 'published'

export interface Question {
  id: string
  type: QuestionType
  label: string
  required: boolean
  // Type-specific config. multiple_choice uses `options`; rating uses `max`.
  options: string[]
  max: number
}

export interface Survey {
  id: string
  title: string
  description: string
  primaryColor: string
  logoUrl: string
  status: SurveyStatus
  createdAt: number
  updatedAt: number
}

// A survey plus its ordered questions — what the builder and public page load.
export interface SurveyWithQuestions extends Survey {
  questions: Question[]
}

// Hono generics: `Bindings` are the Worker env, `Variables` are values the auth
// middleware attaches to the request context.
export type Bindings = Env & { SESSION_SECRET?: string }

export interface Variables {
  userId: string
}
