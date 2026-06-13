import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

// The router carries the QueryClient in context so auth guards in child routes
// (see routes/app.tsx) can prime/read cached queries during `beforeLoad`.
export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})
