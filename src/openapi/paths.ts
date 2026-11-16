// Registers every route with the same zod schemas that actually validate
// requests (imported from the controllers) - the docs can't drift from real
// validation because there's only one schema, not a hand-duplicated copy.
import { z } from "../lib/zod";
import { registry } from "./registry";
import { registerSchema, loginSchema } from "../controllers/auth.controller";
import { createSchema } from "../controllers/problem.controller";
import { executeSchema, listSchema } from "../controllers/submission.controller";
import { updateUserSchema } from "../controllers/user.controller";
import { paginationSchema } from "../utils/pagination";
import {
  authResponseSchema,
  errorResponseSchema,
  executeResponseSchema,
  paginatedProblemsSchema,
  paginatedSubmissionsSchema,
  paginatedUsersSchema,
  problemDetailSchema,
  problemSchema,
  submissionSchema,
  userSchema,
  validationErrorResponseSchema,
} from "./schemas";

const bearerAuth = [{ bearerAuth: [] }];
const idParams = z.object({ id: z.string().uuid() });

const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  content: { "application/json": { schema } },
});

// ---- Auth ----

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: { body: jsonBody(registerSchema) },
  responses: {
    201: { description: "User created", content: { "application/json": { schema: authResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: validationErrorResponseSchema } } },
    409: { description: "Email already registered", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in and receive a JWT",
  request: { body: jsonBody(loginSchema) },
  responses: {
    200: { description: "Logged in", content: { "application/json": { schema: authResponseSchema } } },
    401: { description: "Invalid credentials", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

// ---- Users ----

registry.registerPath({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "List users (admin only)",
  security: bearerAuth,
  request: { query: paginationSchema },
  responses: {
    200: { description: "Paginated users", content: { "application/json": { schema: paginatedUsersSchema } } },
    403: { description: "Admin access required", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Get a user by id",
  security: bearerAuth,
  request: { params: idParams },
  responses: {
    200: { description: "User", content: { "application/json": { schema: userSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Update a user's name (self or admin)",
  security: bearerAuth,
  request: { params: idParams, body: jsonBody(updateUserSchema) },
  responses: {
    200: { description: "Updated user", content: { "application/json": { schema: userSchema } } },
    403: { description: "Not allowed", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Delete a user (self or admin)",
  security: bearerAuth,
  request: { params: idParams },
  responses: {
    204: { description: "Deleted" },
    403: { description: "Not allowed", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

// ---- Problems ----

registry.registerPath({
  method: "get",
  path: "/problems",
  tags: ["Problems"],
  summary: "List active problems",
  security: bearerAuth,
  request: { query: paginationSchema },
  responses: {
    200: { description: "Paginated problems", content: { "application/json": { schema: paginatedProblemsSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/problems",
  tags: ["Problems"],
  summary: "Create a problem, with testcases (admin only)",
  security: bearerAuth,
  request: { body: jsonBody(createSchema) },
  responses: {
    201: { description: "Created problem", content: { "application/json": { schema: problemSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: validationErrorResponseSchema } } },
    403: { description: "Admin access required", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/problems/{id}",
  tags: ["Problems"],
  summary: "Get a problem's full detail (description, constraints, sample testcases)",
  security: bearerAuth,
  request: { params: idParams },
  responses: {
    200: { description: "Problem detail", content: { "application/json": { schema: problemDetailSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/problems/{id}",
  tags: ["Problems"],
  summary: "Soft-delete a problem (admin only)",
  security: bearerAuth,
  request: { params: idParams },
  responses: {
    204: { description: "Deleted" },
    403: { description: "Admin access required", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

// ---- Submissions ----

registry.registerPath({
  method: "get",
  path: "/submissions",
  tags: ["Submissions"],
  summary: "List the caller's own submission history",
  security: bearerAuth,
  request: { query: listSchema },
  responses: {
    200: { description: "Paginated submissions", content: { "application/json": { schema: paginatedSubmissionsSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/submissions/execute",
  tags: ["Submissions"],
  summary: "Submit code for grading (queued, runs in a k8s Job)",
  security: bearerAuth,
  request: { body: jsonBody(executeSchema) },
  responses: {
    202: { description: "Queued", content: { "application/json": { schema: executeResponseSchema } } },
    400: { description: "Validation failed or unsupported language", content: { "application/json": { schema: validationErrorResponseSchema } } },
    404: { description: "Problem not found", content: { "application/json": { schema: errorResponseSchema } } },
    429: { description: "Rate limited (10/min per user)", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/submissions/{id}",
  tags: ["Submissions"],
  summary: "Get a submission's status/result",
  security: bearerAuth,
  request: { params: idParams },
  responses: {
    200: { description: "Submission", content: { "application/json": { schema: submissionSchema } } },
    403: { description: "Not your submission", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
