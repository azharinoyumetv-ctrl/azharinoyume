ALTER TABLE "orders"
  ADD COLUMN "brand_name" TEXT,
  ADD COLUMN "brand_primary_color" TEXT,
  ADD COLUMN "brand_secondary_color" TEXT,
  ADD COLUMN "brand_rules" TEXT;

ALTER TABLE "renders"
ADD COLUMN "variant_key" TEXT NOT NULL DEFAULT 'master',
ADD COLUMN "aspect_ratio" TEXT,
ADD COLUMN "resolution" TEXT,
ADD COLUMN "frame_rate" TEXT,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "renders_order_id_variant_key_idx" ON "renders"("order_id", "variant_key");
