import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",

  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",

  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucket: process.env.MINIO_BUCKET || "problems",
  },

  k8s: {
    namespace: process.env.K8S_NAMESPACE || "code-exec",
    mode: (process.env.K8S_MODE || "kubeconfig") as "kubeconfig" | "in-cluster",
  },

  queueConcurrency: Number(process.env.QUEUE_CONCURRENCY || 3),
};
