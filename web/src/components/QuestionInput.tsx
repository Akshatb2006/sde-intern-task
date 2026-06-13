import { Star } from 'lucide-react'
import type { Question } from '../lib/types'

// Renders the answer control for one question, from a respondent's point of
// view. Fully controlled. Shared by the public survey page and the builder's
// live preview — so what the owner previews is exactly what respondents get.

interface QuestionInputProps {
  question: Question
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function QuestionInput({ question, value, onChange, disabled }: QuestionInputProps) {
  switch (question.type) {
    case 'short_text':
      return (
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          style={focusBrand}
        />
      )

    case 'long_text':
      return (
        <textarea
          value={value}
          disabled={disabled}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} resize-y`}
          style={focusBrand}
        />
      )

    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {question.options.map((option) => {
            const selected = value === option
            return (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm
                  transition-colors ${selected ? 'border-brand bg-brand/5' : 'border-slate-300 hover:bg-slate-50'}
                  ${disabled ? 'cursor-default' : ''}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onChange(option)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                <span className="text-slate-800">{option}</span>
              </label>
            )
          })}
        </div>
      )

    case 'rating': {
      const current = Number(value) || 0
      return (
        <div className="flex gap-1.5">
          {Array.from({ length: question.max }, (_, i) => i + 1).map((n) => {
            const active = n <= current
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                aria-label={`${n} of ${question.max}`}
                // Click the current rating again to clear it.
                onClick={() => onChange(n === current ? '' : String(n))}
                className="rounded-md p-1 transition-transform hover:scale-110 disabled:hover:scale-100"
              >
                <Star
                  className="h-7 w-7"
                  style={{ color: active ? 'var(--brand)' : '#cbd5e1' }}
                  fill={active ? 'var(--brand)' : 'none'}
                />
              </button>
            )
          })}
        </div>
      )
    }
  }
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ' +
  'focus:border-brand disabled:bg-slate-50'

// Brand-colored focus ring, applied inline because the color is dynamic.
const focusBrand = { outlineColor: 'var(--brand)' }
