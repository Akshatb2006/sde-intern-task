// Mirror of the API's domain types (api/src/types.ts). Kept as a small,
// deliberate duplicate so the two packages stay decoupled.

export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'rating'

export type SurveyStatus = 'draft' | 'published'

export interface Question {
  id: string
  type: QuestionType
  label: string
  required: boolean
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

export interface SurveyWithQuestions extends Survey {
  questions: Question[]
}

export interface SurveyListItem extends Survey {
  responseCount: number
}

export interface User {
  id: string
  email: string
}

export interface ResponseRecord {
  id: string
  createdAt: number
  answers: Record<string, string>
}

export interface ResponsesPayload {
  survey: SurveyWithQuestions
  responses: ResponseRecord[]
}

// What the builder edits and PUTs back. Same shape the survey is loaded in,
// minus the server-managed fields.
export interface SurveyInput {
  title: string
  description: string
  primaryColor: string
  logoUrl: string
  status: SurveyStatus
  questions: Question[]
}
