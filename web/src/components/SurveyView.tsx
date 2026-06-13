import { Loader2 } from 'lucide-react'
import { brandStyle } from '../lib/brand'
import type { SurveyWithQuestions } from '../lib/types'
import { QuestionInput } from './QuestionInput'

// The branded respondent view of a survey. Pure presentation: the parent owns
// the answers and submission. Reused by the public page (live, submittable) and
// the builder preview (disabled). The whole subtree is scoped to the survey's
// brand color via CSS variables.

interface SurveyViewProps {
  survey: SurveyWithQuestions
  answers: Record<string, string>
  onAnswer: (questionId: string, value: string) => void
  onSubmit?: () => void
  submitting?: boolean
  errorMessage?: string | null
  fieldErrors?: Record<string, string>
  // Preview mode (builder): controls disabled, no submit.
  preview?: boolean
}

export function SurveyView({
  survey,
  answers,
  onAnswer,
  onSubmit,
  submitting,
  errorMessage,
  fieldErrors = {},
  preview = false,
}: SurveyViewProps) {
  return (
    <div style={brandStyle(survey.primaryColor)} className="mx-auto max-w-xl">
      {/* Branded header */}
      <div className="overflow-hidden rounded-t-2xl bg-brand px-8 py-10 text-center">
        {survey.logoUrl && (
          <img
            src={survey.logoUrl}
            alt=""
            className="mx-auto mb-4 h-14 w-auto rounded-lg bg-white/90 object-contain p-1.5"
          />
        )}
        <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-fg)' }}>
          {survey.title || 'Untitled survey'}
        </h1>
        {survey.description && (
          <p className="mt-2 text-sm opacity-90" style={{ color: 'var(--brand-fg)' }}>
            {survey.description}
          </p>
        )}
      </div>

      <form
        className="space-y-6 rounded-b-2xl border border-t-0 border-slate-200 bg-white px-8 py-8"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit?.()
        }}
      >
        {survey.questions.length === 0 && (
          <p className="text-center text-sm text-slate-400">This survey has no questions yet.</p>
        )}

        {survey.questions.map((question) => (
          <div key={question.id}>
            <div className="mb-2 font-medium text-slate-800">
              {question.label || <span className="text-slate-400">Untitled question</span>}
              {question.required && <span className="ml-1 text-red-500">*</span>}
            </div>
            <QuestionInput
              question={question}
              value={answers[question.id] ?? ''}
              onChange={(value) => onAnswer(question.id, value)}
              disabled={preview}
            />
            {fieldErrors[question.id] && (
              <p className="mt-1.5 text-sm text-red-600">{fieldErrors[question.id]}</p>
            )}
          </div>
        ))}

        {errorMessage && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</p>
        )}

        {survey.questions.length > 0 && (
          <button
            type="submit"
            disabled={preview || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5
              font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ color: 'var(--brand-fg)' }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit
          </button>
        )}
      </form>
    </div>
  )
}
