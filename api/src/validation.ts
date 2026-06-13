import { z } from 'zod'

// All request bodies are validated here, at the trust boundary, before they
// touch the database. The web app does friendlier inline validation too, but
// the server never trusts that.

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
})

const questionTypeSchema = z.enum(['short_text', 'long_text', 'multiple_choice', 'rating'])

// One question as the builder sends it. `id` is client-generated so the editor
// can track rows before they're saved; the server trusts the array order for
// positioning rather than a separate position field.
const questionSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: questionTypeSchema,
    label: z.string().trim().min(1, 'Question needs a label').max(500),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(200)).max(20),
    max: z.number().int().min(2).max(10),
  })
  .refine((q) => q.type !== 'multiple_choice' || q.options.length >= 2, {
    message: 'Multiple choice needs at least two options',
    path: ['options'],
  })

export const surveyInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).default(''),
  // Hex color, 3 or 6 digits.
  primaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex color')
    .default('#6366f1'),
  logoUrl: z.string().trim().url().or(z.literal('')).default(''),
  status: z.enum(['draft', 'published']).default('draft'),
  questions: z.array(questionSchema).max(100),
})

// A public submission: a map of questionId -> answer value (string). Rating and
// choice answers arrive as strings too; the server checks them against the
// survey's questions when saving. Responses are anonymous — no respondent
// identity is collected.
export const responseInputSchema = z.object({
  answers: z.record(z.string().min(1), z.string().max(5000)),
})

export type SurveyInput = z.infer<typeof surveyInputSchema>
export type ResponseInput = z.infer<typeof responseInputSchema>
