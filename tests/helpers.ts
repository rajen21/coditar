import prisma from "../src/lib/prisma";
import { ensureBucket } from "../src/lib/minio";

export async function resetDb(): Promise<void> {
  await prisma.submission.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();
}

export async function setupMinio(): Promise<void> {
  await ensureBucket();
}
