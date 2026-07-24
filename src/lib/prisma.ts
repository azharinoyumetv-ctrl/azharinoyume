import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL;
  let isHyperdrive = false;
  try {
    const context = getCloudflareContext();
    if (context.env.HYPERDRIVE?.connectionString) {
      connectionString = context.env.HYPERDRIVE.connectionString;
      isHyperdrive = true;
    }
  } catch {
    // Next.js build and the VPS worker do not run inside a Cloudflare request.
  }
  connectionString ||= "postgresql://invalid:invalid@127.0.0.1:1/invalid?connect_timeout=1";

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: isHyperdrive ? 1 : Number(process.env.DATABASE_POOL_SIZE || 10),
    maxUses: isHyperdrive ? 1 : Infinity,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
