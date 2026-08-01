import { reclassifyStoredOpportunities } from "../src/lib/opportunities/engine";
import { prisma } from "../src/lib/prisma";

try {
  const result = await reclassifyStoredOpportunities();
  console.log(`Reclassified ${result.updated} opportunities.`);
} finally {
  await prisma.$disconnect();
}
