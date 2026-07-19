ALTER TABLE "orders"
ADD COLUMN "editing_mode" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN "editor_config" JSONB;
