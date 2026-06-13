<p align="center">
  <img src=".github/logo.png" alt="DoCoDeGo" width="360" />
</p>

# Branded Survey Builder

A small Typeform/Tally-style app: sign in, build a survey with a live-previewing
builder, brand it with your own color + logo, publish a public link anyone can
fill in without an account, and read the responses back as analytics or CSV.

Built for the DoCoDeGo SDE intern take-home. Stack is the required one — Hono on
Cloudflare Workers, React + Vite + TanStack Router, Cloudflare D1, TypeScript end
to end.

## What it does

- **Email-only sign-in** — enter an email, you're in. Account is created on first
  use.
- **Survey builder** with four question types — short text, paragraph, multiple
  choice, and 1–N star rating.
- **Add / remove / drag-to-reorder** questions, with a **live preview** of the
  branded public page beside the editor.
- **Per-survey branding** — pick a primary color (the whole public page themes to
  it) and an optional logo URL.
- **Draft → Published** toggle. Only published surveys are reachable at their
  public link.
- **Public response page** — no login, renders in the owner's brand, validates
  required questions, thanks the respondent. Responses are anonymous.
- **Owner dashboard** — list surveys with response counts, plus a per-question
  **analytics** view (text answer lists, choice breakdowns, rating averages) and
  **CSV export**.

## Key decisions

These are the choices I'd want to talk through — the *why*, not just the *what*.

**D1 for persistence.** Survey data is inherently relational: a survey has many
ordered questions; a response has one answer per question. That's a join-shaped
problem, so SQLite-backed D1 fits far better than KV (no relations) or R2 (blob
storage). Five tables, foreign keys, two indexes — see
[`api/migrations/0001_init.sql`](api/migrations/0001_init.sql).

**Email-only auth with a signed cookie.** The brief explicitly allows an
email-only flow if justified. I took it: it removes a password store and an email
provider, and keeps the focus on the builder UX (the thing actually being
graded). The session is just the user id in an **HMAC-signed, httpOnly cookie**
(Hono's `setSignedCookie`) — no session table, can't be forged. The honest
trade-off: there's no identity *verification*, so this is a demo-grade auth. The
production upgrade is a magic link — same cookie, one email step in front.

**Save the survey as one document.** The builder PUTs the whole survey (settings +
ordered question array) in one request; the server updates the row and **replaces**
the question set in a single atomic batch, using array index as `position`. This
makes add / remove / reorder trivially correct — there's no per-question diffing
or drag-position bookkeeping to get wrong. For surveys (tens of questions, one
editor) it's the right simplicity/correctness trade.

**Validate at the trust boundary with Zod.** Every request body is parsed by a Zod
schema in the API before it touches the DB. The client does friendlier inline
validation for UX, but the server never trusts it — required answers, valid
choices, and in-range ratings are all re-checked server-side on submit.

**One shared `SurveyView` for preview *and* the real thing.** The builder's live
preview and the public page render the *same* component, so what the owner
previews is exactly what respondents get. Branding is applied with a scoped CSS
variable (`--brand`) plus a luminance check that picks black/white text for
contrast ([`web/src/lib/brand.ts`](web/src/lib/brand.ts)).

**TanStack Query for server state.** Caching, request dedup, and cache
invalidation on mutations — no hand-rolled `useEffect` fetching. Auth guards live
in route `beforeLoad` and read the same query cache.

## Data model

```
users ──< surveys ──< questions
                  └──< responses ──< answers
```

- `surveys` carry branding (`primary_color`, `logo_url`) and a `status` of
  `draft | published`.
- `questions` store type-specific settings (choice options, rating max) as a
  small JSON `config` blob — avoids a sparse column-per-type table.
- `answers` store every value as text; the rating number and chosen option are
  stringified and validated against the question on the way in.

## Project structure

```
api/
  migrations/0001_init.sql   schema
  src/
    index.ts                 app + route mounting
    auth.ts                  signed-cookie session + requireAuth middleware
    db.ts                    row→domain mappers, shared queries
    validation.ts            Zod request schemas
    routes/{auth,surveys,public}.ts
web/
  src/
    lib/      types, api client, query hooks, brand + question-type helpers
    components/ Button, SurveyView, QuestionInput, QuestionEditor
    routes/   login, app (dashboard/builder/responses), s/$id (public)
```

## Running locally

pnpm workspace — one install covers both packages.

```bash
pnpm install        # installs api + web + root devDeps
pnpm dev            # api on :8787, web on :5173 (output prefixed [api]/[web])
```

`pnpm dev` applies the local D1 migration automatically before starting the API,
so a fresh clone just works. Open http://localhost:5173.

> The session cookie is signed with `SESSION_SECRET`. Local dev falls back to a
> hard-coded dev secret so there's nothing to configure; production should set a
> real one (see below).

Other scripts:

```bash
pnpm check          # Biome lint + format (must pass)
pnpm check:fix      # auto-fix
pnpm typecheck      # tsc --noEmit across both packages
pnpm build          # production build of web
pnpm --filter sde-intern-task-api db:migrate   # re-apply local migrations
```

A note on Biome config: I enabled `css.parser.tailwindDirectives` so Biome
understands Tailwind v4's `@theme`/`@import`, and excluded the generated
`routeTree.gen.ts` from linting. Both are in [`biome.json`](biome.json).

## Deploying to Cloudflare (notes)

Not deployed as part of this submission, but the path is:

1. `wrangler d1 create survey-builder` and paste the real `database_id` into
   [`api/wrangler.jsonc`](api/wrangler.jsonc).
2. `wrangler d1 migrations apply DB --remote`.
3. `wrangler secret put SESSION_SECRET`.
4. `pnpm --filter sde-intern-task-api deploy`, and host the built `web/dist`
   (Cloudflare Pages), pointing `/api/*` at the Worker.

## With another week

- **Logo upload to R2** instead of a URL field (the obvious branding gap).
- **Response analytics over time** and per-question completion/drop-off.
- **Multi-select + more types** (date, ranking), and conditional branching.
- **Real auth** (magic link) and survey-level access controls.
- A **test suite** — the validation and CSV logic especially are pure and
  test-friendly.
