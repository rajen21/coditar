import http from "http";
import app from "./app";
import { attachSocketServer } from "./sockets";
import { ensureBucket } from "./lib/minio";
import { env } from "./config/env";
import logger from "./lib/logger";

async function main(): Promise<void> {
  await ensureBucket();

  const httpServer = http.createServer(app);
  attachSocketServer(httpServer);

  httpServer.listen(env.port, () => logger.info(`API listening on :${env.port}`));
}

main().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});
