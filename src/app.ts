import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { NextFunction, Request, Response } from "express";
import logger from "./lib/logger";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { generateOpenApiDocument } from "./openapi/document";

const app = express();
const openApiDocument = generateOpenApiDocument();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));
app.get("/api/openapi.json", (_req: Request, res: Response) => res.json(openApiDocument));
// Swagger UI's inline bootstrap script conflicts with helmet's default CSP - relax it for this path only.
app.use(
  "/api/docs",
  (_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader("Content-Security-Policy");
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument)
);
app.use("/api", routes);

app.use((_req: Request, res: Response) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
