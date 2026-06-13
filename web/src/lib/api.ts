import type {
  ResponsesPayload,
  Survey,
  SurveyInput,
  SurveyListItem,
  SurveyWithQuestions,
  User,
} from './types'

// Thrown for any non-2xx response. Carries the status so callers can branch
// (e.g. 401 -> not logged in) and a server-supplied message for the UI.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

// One fetch wrapper for the whole app. Always sends cookies (the session),
// JSON-encodes bodies, and turns error responses into ApiError.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })

  if (!res.ok) {
    const message = await res
      .json()
      .then((b) => (b as { error?: string }).error)
      .catch(() => null)
    throw new ApiError(res.status, message ?? `Request failed (${res.status})`)
  }

  // 204-style responses are rare here, but guard against empty bodies.
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export const api = {
  // --- auth ---
  me: () => request<User>('/auth/me'),
  login: (email: string) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),

  // --- owner surveys ---
  listSurveys: () => request<SurveyListItem[]>('/surveys'),
  createSurvey: () => request<{ id: string }>('/surveys', { method: 'POST' }),
  getSurvey: (id: string) => request<SurveyWithQuestions>(`/surveys/${id}`),
  saveSurvey: (id: string, input: SurveyInput) =>
    request<SurveyWithQuestions>(`/surveys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteSurvey: (id: string) => request<{ ok: true }>(`/surveys/${id}`, { method: 'DELETE' }),
  getResponses: (id: string) => request<ResponsesPayload>(`/surveys/${id}/responses`),

  // --- public ---
  getPublicSurvey: (id: string) => request<SurveyWithQuestions>(`/public/surveys/${id}`),
  submitResponse: (id: string, answers: Record<string, string>) =>
    request<{ ok: true }>(`/public/surveys/${id}/responses`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
}

// CSV lives outside `api` because it's a file download, not a JSON call.
export function responsesCsvUrl(surveyId: string): string {
  return `/api/surveys/${surveyId}/responses.csv`
}

export type { Survey }
