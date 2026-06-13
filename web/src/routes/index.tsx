import { createFileRoute, redirect } from '@tanstack/react-router'
import { ensureUser } from '../lib/queries'

// The root path is just a router: signed-in users land on the dashboard,
// everyone else on the login screen.
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const user = await ensureUser(context.queryClient)
    throw redirect({ to: user ? '/app' : '/login' })
  },
})
