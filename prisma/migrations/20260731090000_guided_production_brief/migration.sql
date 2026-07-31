ALTER TABLE "orders"
  ADD COLUMN "audience" TEXT,
  ADD COLUMN "story_priority" TEXT,
  ADD COLUMN "mandatory_content" TEXT,
  ADD COLUMN "excluded_content" TEXT,
  ADD COLUMN "creative_freedom" TEXT,
  ADD COLUMN "target_duration_seconds" INTEGER,
  ADD COLUMN "brief_status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "brief_ambiguity_score" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "brief_confirmed_at" TIMESTAMP(3);

ALTER TABLE "edit_briefs"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "ambiguity_score" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "issues" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "approved_at" TIMESTAMP(3);

CREATE INDEX "orders_brief_status_idx" ON "orders"("brief_status");

INSERT INTO "pricing_products"
  ("id", "key", "kind", "name", "usd_cents", "credits", "active", "sort_order", "created_at", "updated_at")
VALUES
  ('00000000-0000-4000-8000-000000000101', 'project-basic', 'PROJECT', 'Basic automated project', 1499, 0, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000102', 'project-plus', 'PROJECT', 'Plus creator production', 4499, 0, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000103', 'project-premium', 'PROJECT', 'Premium commercial production', 12999, 0, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "kind" = EXCLUDED."kind",
  "name" = EXCLUDED."name",
  "usd_cents" = EXCLUDED."usd_cents",
  "credits" = EXCLUDED."credits",
  "active" = EXCLUDED."active",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = CURRENT_TIMESTAMP;
