ALTER TABLE "job_leads"
  ADD COLUMN "keywords" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "budget_period" TEXT;

ALTER TABLE "search_campaigns"
  ADD COLUMN "job_types" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "opportunity_discovery_runs" (
  "id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "fetched" INTEGER NOT NULL DEFAULT 0,
  "accepted" INTEGER NOT NULL DEFAULT 0,
  "rejected" INTEGER NOT NULL DEFAULT 0,
  "created" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "latency_ms" INTEGER,
  "error" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "opportunity_discovery_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "opportunity_discovery_runs_connector_id_started_at_idx"
  ON "opportunity_discovery_runs"("connector_id", "started_at");

ALTER TABLE "opportunity_discovery_runs"
  ADD CONSTRAINT "opportunity_discovery_runs_connector_id_fkey"
  FOREIGN KEY ("connector_id") REFERENCES "source_connectors"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
