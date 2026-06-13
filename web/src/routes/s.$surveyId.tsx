import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { SurveyView } from '../components/SurveyView'
import { CenteredMessage, FullScreenLoader } from '../components/ui'
import { brandStyle } from '../lib/brand'
import { usePublicSurvey, useSubmitResponse } from '../lib/queries'
import type { SurveyWithQuestions } from '../lib/types'

// Public, no-auth survey page. Renders in the owner's brand and accepts one
// anonymous response.
export const Route = createFileRoute('/s/$surveyId')({
  component: PublicSurvey,
})

function PublicSurvey() {
  const { surveyId } = Route.useParams()
  const { data: survey, isLoading, isError } = usePublicSurvey(surveyId)

  if (isLoading) return <FullScreenLoader />
  // Covers not-found, unpublished, and network errors — all "can't take this survey".
  if (isError || !survey) {
    return (
      <CenteredMessage title="Survey not available">
        This survey doesn't exist or isn't accepting responses right now.
      </CenteredMessage>
    )
  }

  return <Respond survey={survey} />
}

function Respond({ survey }: { survey: SurveyWithQuestions }) {
  const submit = useSubmitResponse(survey.id)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function onAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    // Clear a field's error as soon as the respondent edits it.
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })
    }
  }

  function onSubmit() {
    const errors: Record<string, string> = {}
    for (const q of survey.questions) {
      if (q.required && !answers[q.id]?.trim()) errors[q.id] = 'This question is required'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    submit.mutate(answers)
  }

  if (submit.isSuccess) return <ThankYou survey={survey} />

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <SurveyView
        survey={survey}
        answers={answers}
        onAnswer={onAnswer}
        onSubmit={onSubmit}
        submitting={submit.isPending}
        errorMessage={submit.isError ? (submit.error as Error).message : null}
        fieldErrors={fieldErrors}
      />
    </div>
  )
}

function ThankYou({ survey }: { survey: SurveyWithQuestions }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div
        style={brandStyle(survey.primaryColor)}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm"
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Thanks for your response!</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your answers to “{survey.title}” were recorded.
        </p>
      </div>
    </div>
  )
}
