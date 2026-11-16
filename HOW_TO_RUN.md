# How to run this project

Everything below assumes you're in the repo root unless a step says
otherwise. Run each numbered block in order the first time; after that,
steps 4-7 are what you repeat on every subsequent run (1-3 only need
redoing after a reboot/cleanup, since they create the cluster/containers).

## 1. Start infra (Postgres, Redis, Minio)
```bash
docker compose up -d
```

## 2. Install deps + migrate the database
```bash
npm install
npm run prisma:migrate
```

## 3. Create the k8s cluster (for code execution) and load the exec images
```bash
kind create cluster --config kind-config.yaml
kubectl apply -f k8s-manifests/namespace.yaml
kubectl apply -f k8s-manifests/rbac.yaml

docker build -t exec-js:1.0 docker/exec-js
kind load docker-image exec-js:1.0 --name coditar

docker build -t exec-python:1.0 docker/exec-python
kind load docker-image exec-python:1.0 --name coditar
```
More detail / troubleshooting: `docs/k8s-local-setup.md`.

## 4. Seed a sample problem (once, skip if you already have data)
```bash
npm run seed:problem
```

## 5. Build + run the backend (two separate terminals)
```bash
npm run build

# terminal A
npm run start          # API on http://localhost:4000

# terminal B
npm run worker:start   # worker - creates/watches k8s Jobs
```
(Or `npm run dev` / `npm run worker` instead of build+start, for hot-reload
during development.)

## 6. Run the frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## 7. Use it
- App: http://localhost:5173 - register an account, browse problems, submit code.
- API docs (Swagger): http://localhost:4000/api/docs
- To make yourself an admin (needed to create problems), promote your user
  in the DB, then log out and back in (the JWT bakes in the role at login):
  ```bash
  node -e "
  require('dotenv').config();
  const prisma = require('./dist/src/lib/prisma').default;
  prisma.user.update({ where: { email: 'YOUR_EMAIL' }, data: { role: 'ADMIN' } })
    .then(u => console.log('promoted:', u.email, u.role))
    .finally(() => prisma.\$disconnect());
  "
  ```

## Adding a new problem
You must be logged in as an admin (see the promotion snippet above).

**Via the UI (easiest)**: log in, click "New Problem" in the nav, fill in the
form (title, slug, description, constraints, time/memory limits, testcases).
Each testcase has:
- **Input** / **Expected output** - exact text, compared after trimming
  trailing whitespace per line (so harmless formatting differences don't
  fail a correct solution).
- **Weight** - how much that testcase counts toward the submission's `score`
  (0-100). A weight-4 testcase counts 4x a weight-1 one - doesn't affect the
  simple `passedTC/totalTC` count, only `score`.
- **Hidden** - if checked, submitters only ever see AC/WA/etc. for that
  testcase, never its timing or output/stderr. Use this for testcases you
  don't want submitters reverse-engineering the expected output from.

**Via the API** (e.g. for scripting/bulk import) - `POST /api/problems` as an
admin. See it in Swagger (`/api/docs`) for the exact shape, or:
```bash
curl -s localhost:4000/api/problems -H "authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{
    "title": "Reverse String",
    "slug": "reverse-string",
    "description": "Read a line, print it reversed.",
    "constraints": "1 <= len <= 1000",
    "timeLimitMs": 2000,
    "memoryLimitMb": 128,
    "testcases": [
      { "id": 1, "input": "hello\n", "output": "olleh", "weight": 1, "hidden": false },
      { "id": 2, "input": "abc\n",   "output": "cba",   "weight": 1, "hidden": true  }
    ]
  }'
```
`slug` must be unique (409 if it's already taken). `testcases[].id` just
needs to be unique within that problem - 1, 2, 3... is fine.

`scripts/seed-problem.ts` is a second example of doing this programmatically
(seeds one fixed "Sum Array" problem, idempotent - skips if already seeded).

## Tests
```bash
npm run pretest && npm test   # backend - separate isolated DB, safe to run anytime
cd frontend && npm test       # frontend
```

## Shutting everything down
```bash
# stop the backend/worker/frontend processes (Ctrl+C in their terminals, or):
pkill -f "node dist/src/server.js"
pkill -f "node dist/src/worker.js"
pkill -f "vite"

docker compose down          # stops postgres/redis/minio (keeps data volumes)
kind delete cluster --name coditar   # deletes the k8s cluster entirely
```
Postgres/Minio data survives `docker compose down` (named volumes aren't
removed) - it's gone only if you also run `docker compose down -v`.

## If a docker/kind command says "permission denied"
Your user needs to be in the `docker` group:
```bash
sudo usermod -aG docker $USER
```
Then log out and back in (or open a new terminal) for it to take effect.
