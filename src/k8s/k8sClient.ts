import * as k8s from "@kubernetes/client-node";
import { env } from "../config/env";

const kc = new k8s.KubeConfig();
if (env.k8s.mode === "in-cluster") {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault(); // ~/.kube/config, current context
}

export const coreApi = kc.makeApiClient(k8s.CoreV1Api);
export const batchApi = kc.makeApiClient(k8s.BatchV1Api);
export const namespace = env.k8s.namespace;
