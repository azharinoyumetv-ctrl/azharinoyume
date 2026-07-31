// Entry point for the render worker process (run with PM2)
import { startWorker } from "@/lib/queue/worker";
import { runMaintenance } from "@/lib/maintenance";
import { dispatchPendingProductionJobs } from "@/lib/production/pipeline";
import {
  bootstrapOpportunityEngine,
  runScheduledOpportunityDiscovery,
} from "@/lib/opportunities/engine";

const worker = startWorker();
runMaintenance().catch((error) => console.error("[maintenance] Initial run failed", error));
bootstrapOpportunityEngine().catch((error) =>
  console.error("[opportunities] Bootstrap failed", error),
);
dispatchPendingProductionJobs().catch((error) =>
  console.error("[production] Initial dispatch failed", error),
);
runScheduledOpportunityDiscovery().catch((error) =>
  console.error("[opportunities] Initial discovery failed", error),
);
const maintenanceTimer = setInterval(() => runMaintenance().catch((error) => console.error("[maintenance] Run failed", error)), 15 * 60_000);
const productionTimer = setInterval(
  () =>
    dispatchPendingProductionJobs().catch((error) =>
      console.error("[production] Dispatch failed", error),
    ),
  5_000,
);
const opportunityTimer = setInterval(
  () =>
    runScheduledOpportunityDiscovery().catch((error) =>
      console.error("[opportunities] Scheduled discovery failed", error),
    ),
  15 * 60_000,
);

// Keep process alive
process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM received, draining...");
  clearInterval(maintenanceTimer);
  clearInterval(productionTimer);
  clearInterval(opportunityTimer);
  await worker.close();
  process.exit(0);
});
