import { describe, expect, it } from "vitest";
import { buildConfigMap, buildJob } from "./jobBuilder";

describe("buildConfigMap", () => {
  it("puts the code under the language's file name and numbers testcase inputs from 1", () => {
    const cm = buildConfigMap({
      name: "exec-abc",
      namespace: "code-exec",
      fileName: "main.js",
      code: "console.log(1)",
      testcaseInputs: ["in1", "in2"],
    });

    expect(cm.data).toEqual({
      "main.js": "console.log(1)",
      "input_1.txt": "in1",
      "input_2.txt": "in2",
    });
    expect(cm.metadata).toEqual({ name: "exec-abc", namespace: "code-exec" });
  });
});

describe("buildJob", () => {
  const base = {
    name: "exec-abc",
    namespace: "code-exec",
    image: "exec-js:1.0",
    configMapName: "exec-abc",
    fileName: "main.js",
    testcaseCount: 3,
    timeLimitMs: 2000,
    memoryLimitMb: 128,
  };

  it("sets activeDeadlineSeconds from timeLimitMs * testcaseCount plus a buffer", () => {
    const job = buildJob(base);
    // ceil(2000/1000 * 3) + 15 = 21
    expect(job.spec?.activeDeadlineSeconds).toBe(21);
  });

  it("does not override the container command - each image's own ENTRYPOINT runs", () => {
    const job = buildJob(base);
    const container = job.spec?.template.spec?.containers[0];
    expect(container?.command).toBeUndefined();
    expect(container?.image).toBe("exec-js:1.0");
  });

  it("sets memory limit and request from memoryLimitMb", () => {
    const job = buildJob(base);
    const container = job.spec?.template.spec?.containers[0];
    expect(container?.resources?.limits).toMatchObject({ memory: "128Mi" });
    expect(container?.resources?.requests).toMatchObject({ memory: "128Mi" });
  });

  it("hardens the pod: nonroot, no privilege escalation, read-only rootfs, all caps dropped", () => {
    const job = buildJob(base);
    const podSpec = job.spec?.template.spec;
    const container = podSpec?.containers[0];

    expect(podSpec?.securityContext).toMatchObject({ runAsNonRoot: true, runAsUser: 1000 });
    expect(container?.securityContext).toMatchObject({
      allowPrivilegeEscalation: false,
      readOnlyRootFilesystem: true,
    });
    expect(container?.securityContext?.capabilities?.drop).toEqual(["ALL"]);
    expect(podSpec?.restartPolicy).toBe("Never");
  });

  it("sets backoffLimit to 0 - no retry for a wrong-answer/crash run", () => {
    expect(buildJob(base).spec?.backoffLimit).toBe(0);
  });
});
