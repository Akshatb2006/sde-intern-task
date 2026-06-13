import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, X } from 'lucide-react'
import { questionTypeMeta } from '../lib/questionTypes'
import type { Question } from '../lib/types'

// One editable question card in the builder. Sortable (drag handle on the
// left), edits its own copy and reports changes up via onChange. The parent
// owns the question array; this component never mutates in place.

interface QuestionEditorProps {
  question: Question
  index: number
  onChange: (question: Question) => void
  onRemove: () => void
  error?: string
}

export function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
  error,
}: QuestionEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })
  const meta = questionTypeMeta(question.type)
  const Icon = meta.icon

  // Helper to patch one field while keeping the rest of the question intact.
  const update = (patch: Partial<Question>) => onChange({ ...question, ...patch })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-2xl border bg-white shadow-sm ${
        isDragging ? 'border-indigo-400 shadow-lg' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <Icon className="h-4 w-4" />
          {meta.label}
        </span>
        <span className="text-xs text-slate-400">#{index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove question"
          className="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <input
          type="text"
          value={question.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Question label"
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500
            focus:ring-2 focus:ring-indigo-100 ${error ? 'border-red-300' : 'border-slate-300'}`}
        />

        {question.type === 'multiple_choice' && (
          <OptionsEditor options={question.options} onChange={(options) => update({ options })} />
        )}

        {question.type === 'rating' && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Scale: 1 to
            <select
              value={question.max}
              onChange={(e) => update({ max: Number(e.target.value) })}
              className="rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-indigo-500"
            >
              {[3, 4, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <label className="flex w-fit items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => update({ required: e.target.checked })}
            className="h-4 w-4 accent-indigo-600"
          />
          Required
        </label>
      </div>
    </div>
  )
}

// Editor for a multiple-choice question's options: edit, remove, add.
function OptionsEditor({
  options,
  onChange,
}: {
  options: string[]
  onChange: (options: string[]) => void
}) {
  const setAt = (i: number, value: string) => onChange(options.map((o, j) => (j === i ? value : o)))
  const removeAt = (i: number) => onChange(options.filter((_, j) => j !== i))
  const add = () => onChange([...options, `Option ${options.length + 1}`])

  return (
    <div className="space-y-2">
      {options.map((option, i) => (
        // Index keys are fine here: options are a positional list with no stable id.
        // biome-ignore lint/suspicious/noArrayIndexKey: positional option list
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full border border-slate-300" />
          <input
            type="text"
            value={option}
            onChange={(e) => setAt(i, e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none
              focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            disabled={options.length <= 2}
            aria-label="Remove option"
            className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Add option
      </button>
    </div>
  )
}
