import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, CenteredMessage, FullScreenLoader } from '../components/ui'
import { useCreateSurvey, useDeleteSurvey, useSurveys } from '../lib/queries'
import type { SurveyListItem } from '../lib/types'

export const Route = createFileRoute('/app/')({
  component: Dashboard,
})

function Dashboard() {
  const { data: surveys, isLoading } = useSurveys()
  const createSurvey = useCreateSurvey()
  const navigate = useNavigate()

  function onCreate() {
    createSurvey.mutate(undefined, {
      onSuccess: ({ id }) =>
        navigate({ to: '/app/surveys/$surveyId/edit', params: { surveyId: id } }),
    })
  }

  if (isLoading) return <FullScreenLoader />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your surveys</h1>
          <p className="text-sm text-slate-500">Build, share, and collect responses.</p>
        </div>
        <Button onClick={onCreate} loading={createSurvey.isPending}>
          <Plus className="h-4 w-4" />
          New survey
        </Button>
      </div>

      {surveys && surveys.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {surveys.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </ul>
      ) : (
        <CenteredMessage title="No surveys yet">
          Create your first survey to start collecting responses.
        </CenteredMessage>
      )}
    </div>
  )
}

function SurveyCard({ survey }: { survey: SurveyListItem }) {
  const navigate = useNavigate()
  const deleteSurvey = useDeleteSurvey()
  const [copied, setCopied] = useState(false)

  const isPublished = survey.status === 'published'

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/s/${survey.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function onDelete() {
    if (!confirm(`Delete "${survey.title}" and all its responses? This can't be undone.`)) return
    deleteSurvey.mutate(survey.id)
  }

  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{survey.title}</h2>
        <StatusBadge published={isPublished} />
      </div>

      <p className="mt-1 text-sm text-slate-500">
        {survey.responseCount} {survey.responseCount === 1 ? 'response' : 'responses'} · updated{' '}
        {new Date(survey.updatedAt).toLocaleDateString()}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Button
          variant="secondary"
          onClick={() =>
            navigate({ to: '/app/surveys/$surveyId/edit', params: { surveyId: survey.id } })
          }
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            navigate({ to: '/app/surveys/$surveyId/responses', params: { surveyId: survey.id } })
          }
        >
          <BarChart3 className="h-4 w-4" />
          Responses
        </Button>
        {isPublished && (
          <Button variant="ghost" onClick={copyShareLink}>
            <Share2 className="h-4 w-4" />
            {copied ? 'Copied!' : 'Share'}
          </Button>
        )}
        <Button variant="danger" onClick={onDelete} className="ml-auto">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  )
}
