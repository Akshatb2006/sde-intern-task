import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '../components/ui'
import { ensureUser, useLogin } from '../lib/queries'

export const Route = createFileRoute('/login')({
  // Already signed in? Skip the form.
  beforeLoad: async ({ context }) => {
    if (await ensureUser(context.queryClient)) throw redirect({ to: '/app' })
  },
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    login.mutate(email, { onSuccess: () => navigate({ to: '/app' }) })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Survey Builder</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your email to build and share surveys.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            // Sole field on a dedicated sign-in page — autofocus is the expected UX here.
            // biome-ignore lint/a11y/noAutofocus: single-field login page
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
              outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          {login.isError && (
            <p className="mt-2 text-sm text-red-600">{(login.error as Error).message}</p>
          )}

          <Button type="submit" loading={login.isPending} className="mt-4 w-full">
            Continue
          </Button>

          <p className="mt-4 text-center text-xs text-slate-400">
            No password needed — we'll create your account if it's your first time.
          </p>
        </form>
      </div>
    </div>
  )
}
