# Cloud K8s setup (EKS / GKE / AKS)

Same manifests as local (`k8s-manifests/`) — only cluster creation and image
registry steps differ per provider. Steps below use EKS/GKE as examples; AKS
follows the same shape (`az aks create`, ACR instead of ECR/GCR).

## 1. Create a small cluster
Autoscaling on, exec workload is bursty.

**EKS**
```bash
eksctl create cluster --name coditar --nodes 2 --node-type t3.medium \
  --nodes-min 1 --nodes-max 4
```

**GKE**
```bash
gcloud container clusters create coditar \
  --num-nodes 2 --machine-type e2-medium \
  --enable-autoscaling --min-nodes 1 --max-nodes 4
```

## 2. Push the exec image to a registry
**EKS (ECR)**
```bash
aws ecr create-repository --repository-name exec-js
docker tag exec-js:1.0 <account-id>.dkr.ecr.<region>.amazonaws.com/exec-js:1.0
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/exec-js:1.0
```

**GKE (GCR/Artifact Registry)**
```bash
docker tag exec-js:1.0 gcr.io/<project-id>/exec-js:1.0
docker push gcr.io/<project-id>/exec-js:1.0
```
Update `src/config/languages.js` → `image` field to the full registry path.

## 3. Namespace, RBAC, NetworkPolicy
Identical to local — this is the whole point of keeping manifests portable:
```bash
kubectl apply -f k8s-manifests/namespace.yaml
kubectl apply -f k8s-manifests/rbac.yaml
kubectl apply -f k8s-manifests/networkpolicy.yaml
```
EKS/GKE/AKS's default CNI (VPC CNI, Calico add-on, Azure CNI) all enforce
NetworkPolicy natively — no extra install needed, unlike kind.

## 4. Run the worker in-cluster (recommended for prod)
Deploy the worker as a Deployment inside the cluster, bound to the
`coditar-worker` ServiceAccount from `rbac.yaml`, and set:
```
K8S_MODE=in-cluster
```
This uses the pod's projected ServiceAccount token instead of a kubeconfig
file — no credentials to manage.

## 5. Secrets
Don't put `DATABASE_URL` / `JWT_SECRET` / minio creds in plain env vars in
prod. Use a k8s Secret (or the cloud provider's secret manager synced via
External Secrets Operator) and mount as env from `secretKeyRef`.

## 6. Object storage
Self-hosted minio works as-is. For managed storage, swap `src/lib/minio.js`'s
endpoint/credentials for S3 (EKS) or GCS via the S3-compatible interop
endpoint (GKE) — the `minio` SDK client works against real S3 unchanged, only
the connection config differs.

## 7. Ingress
Put the API behind an Ingress/LoadBalancer with TLS (cert-manager +
Let's Encrypt, or the cloud provider's managed certs). Socket.IO needs
sticky sessions if you run multiple API replicas without the Redis adapter
handling cross-pod delivery — the adapter is already wired in
(`src/sockets/index.js`), so plain round-robin LB is fine.
