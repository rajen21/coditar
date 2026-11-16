import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
import "./schemas";
import "./paths";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "k8s-coditar API",
      version: "1.0.0",
      description:
        "Online code judge: user auth, problem CRUD, and code submission/grading via Kubernetes Jobs. " +
        "Grading results also push over Socket.IO (`submission:status` / `submission:result` events on room " +
        "`submission:{submissionId}`) - see README for the WebSocket contract, not documented here since it's not HTTP.",
    },
    servers: [{ url: "/api" }],
  });
}
