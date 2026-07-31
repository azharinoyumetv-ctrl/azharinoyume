CREATE TABLE "media_analyses" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "manifest" JSONB NOT NULL DEFAULT '{}',
  "confidence" DECIMAL(5,2),
  "issues" JSONB NOT NULL DEFAULT '[]',
  "model_version" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "media_analyses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "edit_plans" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "plan" JSONB NOT NULL,
  "confidence" DECIMAL(5,2),
  "risk_flags" JSONB NOT NULL DEFAULT '[]',
  "model_version" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "edit_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timeline_manifests" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "edit_plan_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "checksum" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timeline_manifests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quality_checks" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "render_id" TEXT NOT NULL,
  "qa_type" TEXT NOT NULL DEFAULT 'draft',
  "status" TEXT NOT NULL,
  "checks" JSONB NOT NULL,
  "technical_score" DECIMAL(5,2),
  "creative_score" DECIMAL(5,2),
  "requires_human" BOOLEAN NOT NULL DEFAULT false,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_analyses_asset_id_key" ON "media_analyses"("asset_id");
CREATE INDEX "media_analyses_order_id_status_idx" ON "media_analyses"("order_id", "status");
CREATE UNIQUE INDEX "edit_plans_order_id_version_key" ON "edit_plans"("order_id", "version");
CREATE UNIQUE INDEX "timeline_manifests_edit_plan_id_key" ON "timeline_manifests"("edit_plan_id");
CREATE UNIQUE INDEX "timeline_manifests_checksum_key" ON "timeline_manifests"("checksum");
CREATE UNIQUE INDEX "quality_checks_render_id_key" ON "quality_checks"("render_id");
CREATE INDEX "quality_checks_status_requires_human_idx" ON "quality_checks"("status", "requires_human");

ALTER TABLE "media_analyses" ADD CONSTRAINT "media_analyses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_analyses" ADD CONSTRAINT "media_analyses_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "uploaded_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "edit_plans" ADD CONSTRAINT "edit_plans_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timeline_manifests" ADD CONSTRAINT "timeline_manifests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timeline_manifests" ADD CONSTRAINT "timeline_manifests_edit_plan_id_fkey" FOREIGN KEY ("edit_plan_id") REFERENCES "edit_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_render_id_fkey" FOREIGN KEY ("render_id") REFERENCES "renders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
