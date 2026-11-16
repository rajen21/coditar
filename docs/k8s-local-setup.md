# Local K8s setup (kind)

Goal: a local cluster the worker can create exec Jobs in, using the same
manifests that go to production.

## 1. Install tools
- Docker
- `kind` — https://kind.sigs.k8s.io/docs/user/quick-start/#installation
- `kubectl`

## 2. Create the cluster
```bash
kind create cluster --config kind-config.yaml
kubectl cluster-info --context kind-coditar
```

## 3. Create namespace + RBAC
```bash
kubectl apply -f k8s-manifests/namespace.yaml
kubectl apply -f k8s-manifests/rbac.yaml
```

## 4. NetworkPolicy note
kind's default CNI (kindnet) does **not** enforce NetworkPolicy. Applying
`k8s-manifests/networkpolicy.yaml` locally is a no-op unless you install a
policy-enforcing CNI. Two options:
- Skip it locally, rely on it in cloud (see below) — fine for dev.
- Install Calico for full local parity:
  ```bash
  kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml
  ```
Then:
```bash
kubectl apply -f k8s-manifests/networkpolicy.yaml
```

## 5. Build and load the exec image
kind runs its own containerd, so images must be built then explicitly loaded
(a plain `docker build` alone isn't visible to the cluster):
```bash
docker build -t exec-js:1.0 docker/exec-js
kind load docker-image exec-js:1.0 --name coditar

docker build -t exec-python:1.0 docker/exec-python
kind load docker-image exec-python:1.0 --name coditar
```
Repeat the build+load step for a language whenever its `docker/exec-*`
folder changes. Restart the API and worker processes afterward — the
language registry (`src/config/languages.js`) is only read at process start.

## 6. Point the app at the cluster
The worker uses your default kubeconfig context. Confirm it's pointed at kind:
```bash
kubectl config current-context   # should print: kind-coditar
```
`.env`: `K8S_MODE=kubeconfig`, `K8S_NAMESPACE=code-exec` (already the default).

## 7. Sanity check
```bash
kubectl get ns code-exec
kubectl get sa -n code-exec
```
Run the app (`npm run dev` + `npm run worker`) and submit code — the worker
will create/delete Jobs in `code-exec` on every execute. Watch it live:
```bash
kubectl get jobs -n code-exec -w
```

## Teardown
```bash
kind delete cluster --name coditar
```
