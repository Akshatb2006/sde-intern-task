import { CircleDot, Star, Type, WrapText } from 'lucide-react'
import type { Question, QuestionType } from './types'

interface QuestionTypeMeta {
  type: QuestionType
  label: string
  description: string
  icon: typeof Type
}

// Single source of truth for the question types: drives the "add question"
// menu and the icons shown on each card. Add a type here + render it in
// QuestionInput/QuestionEditor and it flows through the whole app.
export const QUESTION_TYPES: QuestionTypeMeta[] = [
  { type: 'short_text', label: 'Short text', description: 'A single line', icon: Type },
  { type: 'long_text', label: 'Paragraph', description: 'A longer answer', icon: WrapText },
  {
    type: 'multiple_choice',
    label: 'Multiple choice',
    description: 'Pick one option',
    icon: CircleDot,
  },
  { type: 'rating', label: 'Rating', description: '1–5 scale', icon: Star },
]

export function questionTypeMeta(type: QuestionType): QuestionTypeMeta {
  // Non-null: every QuestionType has an entry above.
  return QUESTION_TYPES.find((t) => t.type === type) as QuestionTypeMeta
}

// A fresh question of the given type with sensible defaults. The id is
// client-side only until the survey is saved.
export function makeQuestion(type: QuestionType): Question {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    required: false,
    options: type === 'multiple_choice' ? ['Option 1', 'Option 2'] : [],
    max: 5,
  }
}
