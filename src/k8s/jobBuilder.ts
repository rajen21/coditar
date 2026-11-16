import { V1ConfigMap, V1Job } from "@kubernetes/client-node";

const CPU_LIMIT = "500m";

export function buildConfigMap({
  name,
  namespace,
  fileName,
  code,
  testcaseInputs,
}: {
  name: string;
  namespace: string;
  fileName: string;
  code: string;
  testcaseInputs: string[];
}): V1ConfigMap {
  const data: Record<string, string> = { [fileName]: code };
  testcaseInputs.forEach((input, idx) => {
    data[`input_${idx + 1}.txt`] = input;
  });

  return {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: { name, namespace },
    data,
  };
}

export function buildJob({
  name,
  namespace,
  image,
  configMapName,
  fileName,
  testcaseCount,
  timeLimitMs,
  memoryLimitMb,
}: {
  name: string;
  namespace: string;
  image: string;
  configMapName: string;
  fileName: string;
  testcaseCount: number;
  timeLimitMs: number;
  memoryLimitMb: number;
}): V1Job {
  const activeDeadlineSeconds = Math.ceil((timeLimitMs / 1000) * testcaseCount) + 15;

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: { name, namespace, labels: { app: "code-exec", submission: name } },
    spec: {
      backoffLimit: 0,
      activeDeadlineSeconds,
      ttlSecondsAfterFinished: 60,
      template: {
        metadata: { labels: { app: "code-exec", "job-name": name } },
        spec: {
          restartPolicy: "Never",
          automountServiceAccountToken: false,
          securityContext: {
            runAsNonRoot: true,
            runAsUser: 1000,
            fsGroup: 1000,
            seccompProfile: { type: "RuntimeDefault" },
          },
          containers: [
            {
              name: "exec",
              image,
              // No command override - each language image's own Dockerfile
              // ENTRYPOINT runs its entrypoint script.
              env: [
                { name: "FILE_NAME", value: fileName },
                { name: "TESTCASE_COUNT", value: String(testcaseCount) },
                { name: "TIME_LIMIT_MS", value: String(timeLimitMs) },
                { name: "MEMORY_LIMIT_MB", value: String(memoryLimitMb) },
              ],
              volumeMounts: [{ name: "work", mountPath: "/work", readOnly: true }],
              securityContext: {
                allowPrivilegeEscalation: false,
                readOnlyRootFilesystem: true,
                capabilities: { drop: ["ALL"] },
              },
              resources: {
                limits: { memory: `${memoryLimitMb}Mi`, cpu: CPU_LIMIT },
                requests: { memory: `${memoryLimitMb}Mi`, cpu: CPU_LIMIT },
              },
            },
          ],
          volumes: [{ name: "work", configMap: { name: configMapName } }],
        },
      },
    },
  };
}
