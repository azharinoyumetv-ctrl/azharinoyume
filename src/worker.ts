// Entry point for the render worker process (run with PM2)
import { startWorker } from "@/lib/queue/worker";
import { runMaintenance } from "@/lib/maintenance";

const worker = startWorker();
runMaintenance().catch((error) => console.error("[maintenance] Initial run failed", error));
const maintenanceTimer = setInterval(() => runMaintenance().catch((error) => console.error("[maintenance] Run failed", error)), 15 * 60_000);

// Keep process alive
process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM received, draining...");
  clearInterval(maintenanceTimer);
  await worker.close();
  process.exit(0);
});
