import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Check, Eye, Share2 } from 'lucide-react'
import { useState } from 'react'
import { QuestionEditor } from '../components/QuestionEditor'
import { SurveyView } from '../components/SurveyView'
import { Button, CenteredMessage, FullScreenLoader } from '../components/ui'
import { useSaveSurvey, useSurvey } from '../lib/queries'
import { makeQuestion, QUESTION_TYPES } from '../lib/questionTypes'
import type { Question, SurveyInput, SurveyStatus, SurveyWithQuestions } from '../lib/types'

export const Route = createFileRoute('/app/surveys/$surveyId/edit')({
  component: BuilderRoute,
})

function BuilderRoute() {
  const { surveyId } = Route.useParams()
  const { data: survey, isLoading, isError } = useSurvey(surveyId)

  if (isLoading) return <FullScreenLoader />
  if (isError || !survey) {
    return (
      <CenteredMessage title="Survey not found">
        <Link to="/app" className="text-indigo-600 hover:underline">
          Back to dashboard
        </Link>
      </CenteredMessage>
    )
  }
  // Re-mount the editor per survey id so its state initialises cleanly.
  return <Builder key={survey.id} survey={survey} />
}

function toInput(survey: SurveyWithQuestions): SurveyInput {
  const { title, description, primaryColor, logoUrl, status, questions } = survey
  return { title, description, primaryColor, logoUrl, status, questions }
}

function Builder({ survey }: { survey: SurveyWithQuestions }) {
  const save = useSaveSurvey(survey.id)
  const [form, setForm] = useState<SurveyInput>(() => toInput(survey))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function patch(next: Partial<SurveyInput>) {
    setForm((prev) => ({ ...prev, ...next }))
  }

  function updateQuestion(id: string, question: Question) {
    patch({ questions: form.questions.map((q) => (q.id === id ? question : q)) })
  }

  function removeQuestion(id: string) {
    patch({ questions: form.questions.filter((q) => q.id !== id) })
  }

  function addQuestion(type: Question['type']) {
    patch({ questions: [...form.questions, makeQuestion(type)] })
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = form.questions.findIndex((q) => q.id === active.id)
    const to = form.questions.findIndex((q) => q.id === over.id)
    patch({ questions: arrayMove(form.questions, from, to) })
  }

  function onSave() {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    save.mutate(form)
  }

  return (
    <div>
      <Toolbar
        surveyId={survey.id}
        status={form.status}
        onStatusChange={(status) => patch({ status })}
        onSave={onSave}
        saving={save.isPending}
        saved={save.isSuccess && !save.isPending}
      />

      {errors.form && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{errors.form}</p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Left: editor */}
        <div className="space-y-6">
          <BrandSettings form={form} patch={patch} titleError={errors.title} />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={form.questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {form.questions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    index={index}
                    question={question}
                    error={errors[question.id]}
                    onChange={(q) => updateQuestion(question.id, q)}
                    onRemove={() => removeQuestion(question.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <AddQuestion onAdd={addQuestion} />
        </div>

        {/* Right: live preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Eye className="h-4 w-4" />
            Live preview
          </div>
          <SurveyView survey={{ ...survey, ...form }} answers={{}} onAnswer={() => {}} preview />
        </div>
      </div>
    </div>
  )
}

function Toolbar({
  surveyId,
  status,
  onStatusChange,
  onSave,
  saving,
  saved,
}: {
  surveyId: string
  status: SurveyStatus
  onStatusChange: (status: SurveyStatus) => void
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  const [copied, setCopied] = useState(false)

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/s/${surveyId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        to="/app"
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {status === 'published' && (
          <Button variant="ghost" onClick={copyShareLink}>
            <Share2 className="h-4 w-4" />
            {copied ? 'Copied!' : 'Share link'}
          </Button>
        )}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as SurveyStatus)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
            focus:border-indigo-500"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <Button onClick={onSave} loading={saving}>
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

function BrandSettings({
  form,
  patch,
  titleError,
}: {
  form: SurveyInput
  patch: (next: Partial<SurveyInput>) => void
  titleError?: string
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          Survey title
        </label>
        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500
            focus:ring-2 focus:ring-indigo-100 ${titleError ? 'border-red-300' : 'border-slate-300'}`}
        />
        {titleError && <p className="mt-1 text-sm text-red-600">{titleError}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="description"
          value={form.description}
          rows={2}
          onChange={(e) => patch({ description: e.target.value })}
          className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none
            focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <span className="block text-sm font-medium text-slate-700">Brand color</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              aria-label="Brand color"
              value={form.primaryColor}
              onChange={(e) => patch({ primaryColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
            />
            <input
              type="text"
              value={form.primaryColor}
              onChange={(e) => patch({ primaryColor: e.target.value })}
              className="w-28 rounded-lg border border-slate-300 px-2.5 py-2 text-sm uppercase outline-none
                focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1">
          <label htmlFor="logo" className="block text-sm font-medium text-slate-700">
            Logo URL <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="logo"
            type="url"
            value={form.logoUrl}
            placeholder="https://…/logo.png"
            onChange={(e) => patch({ logoUrl: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none
              focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
    </div>
  )
}

function AddQuestion({ onAdd }: { onAdd: (type: Question['type']) => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-4">
      <p className="mb-2 text-sm font-medium text-slate-500">Add a question</p>
      <div className="flex flex-wrap gap-2">
        {QUESTION_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2
              text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-600"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Builder-side validation. Mirrors the server's rules so the owner gets inline
// feedback before the PUT; the server still enforces them at the boundary.
function validate(form: SurveyInput): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!form.title.trim()) errors.title = 'Give your survey a title'

  for (const q of form.questions) {
    if (!q.label.trim()) {
      errors[q.id] = 'This question needs a label'
    } else if (q.type === 'multiple_choice' && q.options.filter((o) => o.trim()).length < 2) {
      errors[q.id] = 'Add at least two options'
    }
  }

  if (form.status === 'published' && form.questions.length === 0) {
    errors.form = 'Add at least one question before publishing — or switch back to draft.'
  }

  return errors
}
