import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { Server as HttpServer } from "http";
import prisma from "../lib/prisma";
import { createRedisConnection } from "../lib/redis";
import { env } from "../config/env";
import logger from "../lib/logger";

interface SocketUser {
  id: string;
  email: string;
  role: Role;
}

declare module "socket.io" {
  interface Socket {
    user: SocketUser;
  }
}

export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  const pubClient = createRedisConnection();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.user = jwt.verify(token, env.jwtSecret) as SocketUser;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("submission:subscribe", async (submissionId: string, ack?: (res: { ok: boolean; error?: string }) => void) => {
      try {
        const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
        if (!submission || submission.userId !== socket.user.id) {
          return ack?.({ ok: false, error: "Not found or not yours" });
        }
        socket.join(`submission:${submissionId}`);
        ack?.({ ok: true });
      } catch (err) {
        logger.error(err);
        ack?.({ ok: false, error: "Internal error" });
      }
    });
  });

  return io;
}
