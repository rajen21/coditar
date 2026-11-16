import * as Minio from "minio";
import { env } from "../config/env";

export const minioClient = new Minio.Client({
  endPoint: env.minio.endPoint,
  port: env.minio.port,
  useSSL: env.minio.useSSL,
  accessKey: env.minio.accessKey,
  secretKey: env.minio.secretKey,
});

export const bucket = env.minio.bucket;

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(bucket);
  }
}
