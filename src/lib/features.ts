import { prisma } from "@/lib/prisma";

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: { enabled: true },
  });
  return flag?.enabled === true;
}
