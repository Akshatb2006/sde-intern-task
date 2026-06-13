import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { ClipboardList, LogOut } from 'lucide-react'
import { Button } from '../components/ui'
import { ensureUser, useAuth, useLogout } from '../lib/queries'

// Layout + guard for every owner screen. Unauthenticated visitors are bounced
// to /login before any child route loads.
export const Route = createFileRoute('/app')({
  beforeLoad: async ({ context }) => {
    const user = await ensureUser(context.queryClient)
    if (!user) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

function AppLayout() {
  const { data: user } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/app" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <ClipboardList className="h-4 w-4 text-white" />
            </span>
            Survey Builder
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
            <Button
              variant="ghost"
              onClick={() =>
                logout.mutate(undefined, { onSuccess: () => navigate({ to: '/login' }) })
              }
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
