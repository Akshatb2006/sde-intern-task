import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Download, Inbox } from 'lucide-react'
import { CenteredMessage, FullScreenLoader } from '../components/ui'
import { responsesCsvUrl } from '../lib/api'
import { useResponses } from '../lib/queries'
import { questionTypeMeta } from '../lib/questionTypes'
import type { Question, ResponseRecord } from '../lib/types'

export const Route = createFileRoute('/app/surveys/$surveyId/responses')({
  component: ResponsesRoute,
})

function ResponsesRoute() {
  const { surveyId } = Route.useParams()
  const { data, isLoading, isError } = useResponses(surveyId)

  if (isLoading) return <FullScreenLoader />
  if (isError || !data) {
    return (
      <CenteredMessage title="Survey not found">
        <Link to="/app" className="text-indigo-600 hover:underline">
          Back to dashboard
        </Link>
      </CenteredMessage>
    )
  }

  const { survey, responses } = data

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/app"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        {responses.length > 0 && (
          <a
            href={responsesCsvUrl(survey.id)}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white
              px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        )}
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
        <p className="text-sm text-slate-500">
          {responses.length} {responses.length === 1 ? 'response' : 'responses'}
        </p>
      </div>

      {responses.length === 0 ? (
        <div className="mt-8">
          <CenteredMessage title="No responses yet">
            <span className="flex flex-col items-center gap-3">
              <Inbox className="h-8 w-8 text-slate-300" />
              Share your survey's link to start collecting answers.
            </span>
          </CenteredMessage>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {survey.questions.map((question, i) => (
            <QuestionSummary
              key={question.id}
              index={i}
              question={question}
              responses={responses}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionSummary({
  index,
  question,
  responses,
}: {
  index: number
  question: Question
  responses: ResponseRecord[]
}) {
  const meta = questionTypeMeta(question.type)
  // Every non-empty answer given to this question.
  const answers = responses.map((r) => r.answers[question.id]?.trim()).filter(Boolean) as string[]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-slate-900">
          <span className="mr-1.5 text-slate-400">{index + 1}.</span>
          {question.label}
        </h2>
        <span className="shrink-0 text-xs text-slate-400">
          {meta.label} · {answers.length} answered
        </span>
      </div>

      <div className="mt-4">
        {question.type === 'multiple_choice' ? (
          <ChoiceBreakdown question={question} answers={answers} />
        ) : question.type === 'rating' ? (
          <RatingBreakdown question={question} answers={answers} />
        ) : (
          <TextAnswers answers={answers} />
        )}
      </div>
    </section>
  )
}

// Horizontal bar with a brand-neutral fill; width encodes the share.
function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ChoiceBreakdown({ question, answers }: { question: Question; answers: string[] }) {
  const total = answers.length
  return (
    <div className="space-y-3">
      {question.options.map((option) => (
        <Bar
          key={option}
          label={option}
          count={answers.filter((a) => a === option).length}
          total={total}
        />
      ))}
    </div>
  )
}

function RatingBreakdown({ question, answers }: { question: Question; answers: string[] }) {
  const nums = answers.map(Number).filter((n) => Number.isFinite(n))
  const average = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
  const scale = Array.from({ length: question.max }, (_, i) => i + 1)

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">{average.toFixed(1)}</span>
        <span className="text-sm text-slate-500">average of {question.max}</span>
      </div>
      <div className="space-y-2">
        {scale.map((n) => (
          <Bar
            key={n}
            label={`${n} ★`}
            count={nums.filter((v) => v === n).length}
            total={nums.length}
          />
        ))}
      </div>
    </div>
  )
}

function TextAnswers({ answers }: { answers: string[] }) {
  if (answers.length === 0) return <p className="text-sm text-slate-400">No answers yet.</p>
  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto">
      {answers.map((answer, i) => (
        // Answers are plain strings with no id; index key is acceptable for a read-only list.
        // biome-ignore lint/suspicious/noArrayIndexKey: read-only answer list
        <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {answer}
        </li>
      ))}
    </ul>
  )
}
