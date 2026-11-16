# k8s-coditar

Online code judge: Express API + BullMQ worker + Kubernetes Job per submission,
React frontend. TypeScript (strict) + ESLint throughout, on both sides.

- Backend API docs (Swagger UI): `/api/docs` (raw spec at `/api/openapi.json`)
  - generated straight from the same Zod schemas that validate requests
    (`src/openapi/`) - the docs can't drift from real validation because
    there's only one schema, not a hand-maintained copy.
- Frontend: see [frontend/README.md](frontend/README.md) for setup and
  structure; quick version: `cd frontend && npm install && npm run dev`
  (proxies `/api` and `/socket.io` to `localhost:4000` in dev - see
  `frontend/vite.config.ts`).

## Architecture
```
Client --POST /api/submissions/execute--> API --enqueue--> BullMQ (Redis)
Client --socket.io connect + subscribe(submissionId)--------^
Worker <--dequeue-- BullMQ
Worker --create ConfigMap(code+testcases) + Job--> K8s (code-exec ns)
Worker --poll Job status, read pod logs--> parse result, grade vs expected
Worker --update DB, emit socket.io event (via Redis adapter)--> Client
```
- Postgres (Prisma) — users, problems (reference only), submissions.
- Minio — problem statements + testcases (`problems/{id}/meta.json`,
  `problems/{id}/testcases/{n}/input.txt|output.txt`). Keeps heavy content out
  of the DB; new problems are just a folder upload + one DB row.
- K8s Job (not a bare Pod) — retry/backoff control, `ttlSecondsAfterFinished`
  auto-cleanup, `activeDeadlineSeconds` timeout enforcement, non-root +
  read-only-root-fs + all-capabilities-dropped + NetworkPolicy deny-all.
- One Job per submission runs all its testcases (not one Job per testcase) —
  much less k8s overhead. Each language's entrypoint (`docker/exec-*/entrypoint.*`)
  loops testcases with a per-testcase timeout, prints one JSON result block to
  stdout; the Job's container command is left unset so each image's own
  Dockerfile `ENTRYPOINT` runs.
- Languages are pluggable via `src/config/languages.ts` — add a registry entry
  + build an image (`docker/exec-<lang>/`), no other code changes. JS and
  Python supported; each new language: build+load its image (see
  [docs/k8s-local-setup.md](docs/k8s-local-setup.md)), then restart the API
  and worker processes (the registry is read once at process start).
- TypeScript throughout (`strict`, `noUnusedLocals`/`noUnusedParameters`).
  `docker/exec-js/entrypoint.ts` compiles in its own Docker build stage (its
  own `tsconfig.json`, not part of the main project build) so the final
  runtime image ships plain JS with no `typescript`/`ts-node` inside it.
  `docker/exec-python` stays Python — nothing to convert there.

## Local setup
```bash
npm install
cp .env.example .env

docker compose up -d          # postgres, redis, minio
npm run prisma:migrate
npm run seed:problem          # seeds a sample "Sum Array" problem
```

Dev (hot reload via `tsx watch`): `npm run dev` / `npm run worker`.
Prod: `npm run build` (tsc → `dist/`), then `npm run start` / `npm run worker:start`.
Lint: `npm run lint` (`npm run lint:fix` to autofix). Typecheck only: `npm run typecheck`.

Then set up the exec cluster — see [docs/k8s-local-setup.md](docs/k8s-local-setup.md)
(kind, RBAC, image build+load). For a real cluster instead of kind, see
[docs/k8s-cloud-setup.md](docs/k8s-cloud-setup.md).

Run the app (two processes):
```bash
npm run dev      # API on :4000
npm run worker   # BullMQ worker, talks to k8s
```

## Try it
```bash
# register + login
curl -s localhost:4000/api/auth/register -H 'content-type: application/json' \
  -d '{"email":"a@b.com","password":"password123","name":"A"}' | tee /tmp/reg.json
TOKEN=$(jq -r .token /tmp/reg.json)

# list problems, grab the seeded one's id
curl -s localhost:4000/api/problems -H "authorization: Bearer $TOKEN"

# execute (replace PROBLEM_ID)
curl -s localhost:4000/api/submissions/execute -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"problemId":"PROBLEM_ID","language":"javascript","code":"const lines=require(\"fs\").readFileSync(0,\"utf8\").trim().split(\"\\n\");const n=+lines[0];const nums=lines[1].split(\" \").map(Number);console.log(nums.reduce((a,b)=>a+b,0));"}'
```
Connect a socket.io client with `auth: { token: TOKEN }`, emit
`submission:subscribe` with the returned `submissionId`, listen for
`submission:status` / `submission:result`. Or poll `GET /api/submissions/:id`.

`GET /api/submissions?page=&limit=&problemId=` lists the caller's own
submission history (paginated, newest first, `code`/`results` omitted for a
lean list view - use the single-submission GET for full detail).

Every graded submission carries both `passedTC` (flat count) and `score`
(0-100, weighted by each testcase's `weight` - a testcase worth 5x counts 5x
toward `score` but still just +1 toward `passedTC`).

## Repo layout
```
src/
  config/       env, language registry
  controllers/  route handlers
  services/     business logic (auth, problem/minio, submission, socket emit)
  routes/       express routers
  middleware/   auth, error handling
  k8s/          k8s client, Job/ConfigMap builder, Job runner (create/watch/grade/cleanup)
  queue/        BullMQ producer
  sockets/      socket.io server (API process side)
  openapi/      OpenAPI doc generation - registers paths against the same
                Zod schemas the controllers validate requests with
  worker.ts     BullMQ consumer entrypoint (separate process)
  server.ts     API entrypoint
docker/exec-js/     sandboxed JS execution image
docker/exec-python/ sandboxed Python execution image
k8s-manifests/  namespace, RBAC, NetworkPolicy
docs/           k8s setup guides
tests/          integration tests (supertest against the Express app)
src/**/*.test.ts  unit tests, colocated with the code they cover
frontend/       React + TS + Vite app - see frontend/README.md
```

## Testing
Unit tests (`src/**/*.test.ts`) need no infra. Integration tests
(`tests/integration/`) hit a real, isolated Postgres/Redis/Minio via
supertest against the Express app directly (no HTTP server bound) — they do
**not** exercise the k8s Job execution path (that stays covered by manual
end-to-end verification; running real k8s Jobs per test run is too slow/heavy
for a test suite).

```bash
npm run pretest       # one-time-safe: creates coditar_test DB, applies migrations
npm test               # full suite
npm run test:unit      # unit tests only, no infra needed
npm run test:watch     # watch mode
```
Test config lives in `.env.test` (separate DB name, separate redis db index,
separate minio bucket — never touches dev data). `pretest` assumes
`docker compose up -d` is already running.

## Known MVP limitations
- Per-testcase MLE is detected by a userspace watchdog, not the kernel: all
  testcases for a submission run as sibling child processes inside **one**
  pod sharing **one** memory cgroup limit (see `memoryLimitMb` on the
  problem), and Kubernetes/containerd set `memory.oom.group=1` on that
  cgroup — confirmed empirically — so a real kernel OOM kill is always
  *whole-container*, with no way to tell which testcase caused it or grade
  the ones before it. So the entrypoint (`docker/exec-js/entrypoint.ts`,
  `docker/exec-python/entrypoint.py`) never lets the kernel killer fire: it
  polls each child's own RSS every 50ms via `/proc/<pid>/status` and kills
  *that child* the moment it crosses 80% of the limit, then keeps grading the
  remaining testcases. Verified live: a submission whose testcase 1 leaks
  memory unboundedly graded testcase 1 as `MLE` while testcases 2–3 still
  graded normally (`passedTC: 2/3`, `score: 75`), where before this the whole
  submission would've come back as one opaque `ERROR`.
  Residual gap: a single allocation large enough to blow past the limit
  *between* two 50ms polls can still race the kernel's whole-container
  killer and win — that case still falls back to the old whole-submission
  `ERROR` behavior (unchanged, still handled). This catches the common case
  (gradual/unbounded growth) but not a single instantaneous giant allocation.
- No retry on transient k8s/infra failures (`attempts: 1` in the queue) —
  fine for MVP, add BullMQ retry+backoff if infra flakiness shows up.
- `npm audit`: one moderate vuln remains (`decode-uri-component` via minio's
  `query-string` dependency, all minio 7.0.30+ versions) — no fix exists yet
  that isn't a downgrade to minio 7.0.26. Low practical risk here: we only
  ever pass minio our own UUID-derived object paths, never user-supplied
  strings, so the vulnerable URL-decoding path never sees attacker input.
  Revisit when minio publishes a patched release.
- No automated coverage for the multi-replica rate-limit behavior itself
  (`rate-limit-redis`, sharing the BullMQ Redis instance) - verified manually
  by running two API processes on different ports against the same Redis and
  confirming the limit is enforced across both, not per-process.
