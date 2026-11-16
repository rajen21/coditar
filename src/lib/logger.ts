import pino from "pino";
import { env } from "../config/env";

const logger = pino(
  env.nodeEnv === "development"
    ? { transport: { target: "pino-pretty" } }
    : env.nodeEnv === "test"
      ? { level: "silent" }
      : {}
);

export default logger;
