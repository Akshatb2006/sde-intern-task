import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from './api'
import type { SurveyInput, User } from './types'

// Centralised query keys so invalidations and reads can't drift apart.
export const keys = {
  me: ['me'] as const,
  surveys: ['surveys'] as const,
  survey: (id: string) => ['survey', id] as const,
  responses: (id: string) => ['responses', id] as const,
  publicSurvey: (id: string) => ['public-survey', id] as const,
}

// --- auth ---

// Used by route `beforeLoad` guards: returns the current user (priming the
// cache so useAuth is instant) or null when logged out. Never throws.
export async function ensureUser(qc: QueryClient): Promise<User | null> {
  const cached = qc.getQueryData<User>(keys.me)
  if (cached) return cached
  try {
    const user = await api.me()
    qc.setQueryData(keys.me, user)
    return user
  } catch {
    return null
  }
}

export function useAuth() {
  return useQuery({
    queryKey: keys.me,
    queryFn: api.me,
    // A 401 is a normal "logged out" state, not an error worth retrying.
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api.login(email),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => qc.clear(),
  })
}

// --- owner surveys ---

export function useSurveys() {
  return useQuery({ queryKey: keys.surveys, queryFn: api.listSurveys })
}

export function useSurvey(id: string) {
  return useQuery({ queryKey: keys.survey(id), queryFn: () => api.getSurvey(id) })
}

export function useCreateSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createSurvey,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.surveys }),
  })
}

export function useSaveSurvey(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SurveyInput) => api.saveSurvey(id, input),
    onSuccess: (saved) => {
      qc.setQueryData(keys.survey(id), saved)
      qc.invalidateQueries({ queryKey: keys.surveys })
    },
  })
}

export function useDeleteSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSurvey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.surveys }),
  })
}

export function useResponses(id: string) {
  return useQuery({ queryKey: keys.responses(id), queryFn: () => api.getResponses(id) })
}

// --- public ---

export function usePublicSurvey(id: string) {
  return useQuery({
    queryKey: keys.publicSurvey(id),
    queryFn: () => api.getPublicSurvey(id),
    retry: false,
  })
}

export function useSubmitResponse(id: string) {
  return useMutation({
    mutationFn: (answers: Record<string, string>) => api.submitResponse(id, answers),
  })
}
