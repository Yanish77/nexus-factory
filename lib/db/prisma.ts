type PrismaClientLike = {
  $queryRawUnsafe(query: string): Promise<unknown>;
  workflowRun: {
    upsert(input: unknown): Promise<unknown>;
  };
  agent: {
    upsert(input: unknown): Promise<{ id: string }>;
  };
  event: {
    upsert(input: unknown): Promise<unknown>;
    findMany(input: unknown): Promise<Array<{
      id: string;
      workflowRunId: string;
      agent?: { key: string } | null;
      type: string;
      message: string;
      metadataJson: unknown;
      createdAt: Date;
    }>>;
  };
};

type PrismaClientConstructor = new () => PrismaClientLike;

const globalForPrisma = globalThis as typeof globalThis & {
  nexusPrisma?: PrismaClientLike;
};

export function getPrismaClient() {
  // Prisma Client is generated at deploy/startup time. Keep this require untyped so
  // type checks still pass before `prisma generate` has run locally.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client") as { PrismaClient: PrismaClientConstructor };
  globalForPrisma.nexusPrisma ??= new PrismaClient();
  return globalForPrisma.nexusPrisma;
}

export function hasDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.DATABASE_URL && env.DATABASE_URL.trim().length > 0);
}
