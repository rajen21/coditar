// Seeds a simple "Sum Array" problem: read N then N ints on stdin, print their sum.
// Usage: npm run seed:problem
import "dotenv/config";
import { randomUUID } from "crypto";
import prisma from "../src/lib/prisma";
import { ensureBucket } from "../src/lib/minio";
import * as problemService from "../src/services/problem.service";
import { ProblemMeta, TestcaseInput } from "../src/services/problem.service";

const SLUG = "sum-array";

async function main(): Promise<void> {
  const existing = await prisma.problem.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`Already seeded: ${existing.id} (${existing.slug}) - nothing to do.`);
    await prisma.$disconnect();
    return;
  }

  await ensureBucket();

  const problemId = randomUUID();
  const meta: ProblemMeta = {
    title: "Sum Array",
    description: "Read an integer N, then N integers. Print their sum.",
    constraints: "1 <= N <= 1000",
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    testcases: [
      { id: 1, weight: 1, hidden: false },
      { id: 2, weight: 1, hidden: false },
      { id: 3, weight: 2, hidden: true },
    ],
  };

  const testcases: TestcaseInput[] = [
    { id: 1, input: "3\n1 2 3\n", output: "6" },
    { id: 2, input: "1\n42\n", output: "42" },
    { id: 3, input: "5\n-1 -2 3 4 5\n", output: "9" },
  ];

  await problemService.createProblem(problemId, { meta, testcases });

  const problem = await prisma.problem.create({
    data: {
      id: problemId,
      title: meta.title,
      slug: SLUG,
      minioPath: `problems/${problemId}/meta.json`,
    },
  });

  console.log("Seeded problem:", problem.id, problem.slug);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
