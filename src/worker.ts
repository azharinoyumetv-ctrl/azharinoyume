// Entry point for the render worker process (run with PM2)
import { startWorker } from "@/lib/queue/worker";

startWorker();

// Keep process alive
process.on("SIGTERM", async () => {
  console.log("[worker] SIGTERM received, draining...");
  process.exit(0);
});
