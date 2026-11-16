# coditar frontend

React + TypeScript + Vite. Monaco editor for the code box, TanStack Query for
API data, React Router for routing, Tailwind for styling, Socket.IO client
for live submission status/result push.

## Setup

```bash
npm install
npm run dev
```

Dev server proxies `/api` and `/socket.io` to `http://localhost:4000` (see
`vite.config.ts`), so the backend just needs to be running - no `.env` needed
for local dev. To point at a different backend (a different host, or a
separate origin in prod), set `VITE_API_BASE_URL` (see `.env.example`).

```bash
npm run build       # tsc -b && vite build -> dist/
npm run lint         # npm run lint:fix to autofix
npm run typecheck
```

## Structure

```
src/
  lib/
    api.ts               fetch wrapper: base URL, auth header, typed errors
    auth.tsx              AuthContext/AuthProvider - token + user, localStorage-persisted
    useSubmissionSocket.ts  Socket.IO hook: subscribes to one submission's live push
    types.ts              shapes mirroring the backend's API/OpenAPI responses
  components/
    Layout.tsx, ProtectedRoute.tsx  nav + route guards (auth required / admin required)
    VerdictBadge.tsx, SubmissionResult.tsx  shared result-rendering pieces
  pages/
    LoginPage, RegisterPage
    ProblemListPage, ProblemDetailPage    (editor + run + live result)
    SubmissionHistoryPage, SubmissionDetailPage
    AdminCreateProblemPage                 (admin only, dynamic testcase rows)
```

Submission status/result updates arrive two ways at once, deliberately: a
`GET /submissions/:id` poll (via TanStack Query's `refetchInterval`, only
while the status is non-terminal) as the reliable baseline, and a Socket.IO
push that updates the same query cache instantly when it arrives. Either one
alone would work; both together means a missed/late socket event still
self-heals within one poll interval.

## Testing
Vitest + React Testing Library, jsdom environment (`vitest.config.ts`,
setup in `src/test/setup.ts`). Colocated with the code as `*.test.ts(x)`.

```bash
npm test          # run once
npm run test:watch
```

Covers: the API client (`lib/api.test.ts` - auth header, error shape, query
serialization), route guards (`ProtectedRoute.test.tsx` - redirect logic for
both auth and admin gates), result rendering (`SubmissionResult.test.tsx` -
including a cross-check of the backend's hidden-testcase regression test),
badges, and one full page (`LoginPage.test.tsx` - real form fill + submit +
navigate, with `fetch` mocked). Pages that render the Monaco editor
(`ProblemDetailPage`) aren't covered here - Monaco doesn't run in jsdom, and
that flow is what the manual browser-automation pass during development
exercises instead.

## Known gaps
- `monaco-editor`'s bundled `dompurify` carries a moderate transitive
  advisory with no non-breaking fix available yet (see root README's audit
  notes for the equivalent backend call on a different package - same
  reasoning: low practical exposure in how this app uses the library, revisit
  when upstream patches it).
