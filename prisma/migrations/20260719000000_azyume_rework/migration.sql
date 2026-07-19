-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "user_id" TEXT,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_company" TEXT,
    "package" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "purpose" TEXT,
    "visual_style" TEXT,
    "mood" TEXT,
    "editing_pace" TEXT,
    "color_grade" TEXT,
    "caption_style" TEXT,
    "music_style" TEXT,
    "platform" TEXT,
    "aspect_ratio" TEXT,
    "resolution" TEXT NOT NULL DEFAULT '1080p',
    "frame_rate" TEXT NOT NULL DEFAULT '30fps',
    "export_format" TEXT NOT NULL DEFAULT 'MP4',
    "compression" TEXT NOT NULL DEFAULT 'balanced',
    "customer_prompt_original" TEXT,
    "customer_prompt_language" TEXT,
    "customer_prompt_en" TEXT,
    "add_ons" JSONB NOT NULL DEFAULT '[]',
    "total_price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "manual_review_required" BOOLEAN NOT NULL DEFAULT false,
    "admin_approved" BOOLEAN NOT NULL DEFAULT false,
    "queue_position" INTEGER,
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "max_revisions" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "quote_id" TEXT,
    "estimated_credits" INTEGER NOT NULL DEFAULT 0,
    "actual_credits" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "paid_amount" DECIMAL(10,2),
    "paid_at" TIMESTAMP(3),
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "delivery_status" TEXT NOT NULL DEFAULT 'pending',
    "pdf_r2_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'auto',
    "regions" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "gateway_transaction_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raw_webhook" JSONB,
    "admin_approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateway_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "provider_event_id" TEXT,
    "headers_hash" TEXT,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_gateway_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reconciliation" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_assets" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT,
    "r2_key" TEXT NOT NULL,
    "file_name" TEXT,
    "file_size_bytes" BIGINT,
    "mime_type" TEXT,
    "asset_type" TEXT NOT NULL,
    "cloud_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "checksum_sha256" TEXT,
    "duration_ms" INTEGER,
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "r2_files" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "r2_key" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "signed_url" TEXT,
    "signed_url_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "r2_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edit_briefs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "prompt_original" TEXT,
    "prompt_language" TEXT,
    "prompt_en" TEXT,
    "structured_brief" JSONB,
    "r2_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edit_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renders" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "render_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "worker" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "output_r2_key" TEXT,
    "error_log" TEXT,
    "idempotency_key" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "reserved_credits" INTEGER NOT NULL DEFAULT 0,
    "actual_credits" INTEGER NOT NULL DEFAULT 0,
    "output_checksum" TEXT,
    "lease_expires_at" TIMESTAMP(3),

    CONSTRAINT "renders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "customer_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_links" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "r2_key" TEXT,
    "signed_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "downloaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "cost_type" TEXT NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "prompt_version" TEXT,
    "purpose" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cost_usd" DECIMAL(10,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_cost_logs" (
    "id" TEXT NOT NULL,
    "render_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "worker" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "estimated_cost_usd" DECIMAL(10,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_cost_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_cost_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "r2_gb_stored" DECIMAL(10,4) NOT NULL,
    "estimated_monthly_cost_usd" DECIMAL(10,4) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_cost_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "invoice_id" TEXT,
    "entry_type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_reports" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "gross_revenue" DECIMAL(10,2) NOT NULL,
    "gateway_fee" DECIMAL(10,2) NOT NULL,
    "net_received" DECIMAL(10,2) NOT NULL,
    "ai_cost" DECIMAL(10,4) NOT NULL,
    "render_cost" DECIMAL(10,4) NOT NULL,
    "storage_cost" DECIMAL(10,4) NOT NULL,
    "revision_cost" DECIMAL(10,4) NOT NULL,
    "total_direct_cost" DECIMAL(10,4) NOT NULL,
    "gross_profit" DECIMAL(10,2) NOT NULL,
    "profit_margin" DECIMAL(5,2) NOT NULL,
    "cost_cap_used_pct" DECIMAL(5,2) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_exports" (
    "id" TEXT NOT NULL,
    "export_type" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "r2_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_jobs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "queue_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_leads" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "budget_min" DECIMAL(10,2),
    "budget_max" DECIMAL(10,2),
    "currency" TEXT,
    "deadline" TEXT,
    "score" DECIMAL(5,2),
    "score_breakdown" JSONB,
    "pipeline_status" TEXT NOT NULL DEFAULT 'new_lead',
    "raw_snapshot" JSONB,
    "matched_keyword" TEXT,
    "draft_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_drafts" (
    "id" TEXT NOT NULL,
    "job_lead_id" TEXT NOT NULL,
    "draft_text" TEXT,
    "ai_model" TEXT,
    "admin_edited_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "admin_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT,
    "review_text" TEXT,
    "consent_show_video" BOOLEAN NOT NULL DEFAULT false,
    "consent_show_prompt" BOOLEAN NOT NULL DEFAULT false,
    "consent_hide_name" BOOLEAN NOT NULL DEFAULT false,
    "consent_hide_brand" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "showcase_r2_key" TEXT,
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_approvals" (
    "id" TEXT NOT NULL,
    "approval_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "pricing_products" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usd_cents" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "interval_days" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "quote_currency" TEXT NOT NULL,
    "rate" DECIMAL(16,6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_quotes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "usd_cents" INTEGER NOT NULL,
    "idr_amount" INTEGER NOT NULL,
    "fx_rate" DECIMAL(16,6) NOT NULL,
    "fx_rate_version" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "idempotency_key" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "provider" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "reference_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "usd_cents" INTEGER NOT NULL,
    "idr_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "payment_token_id" TEXT,
    "network_transaction_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "headers_hash" TEXT NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "failure_reason" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'xendit',
    "payment_token_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "next_billing_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available_credits" INTEGER NOT NULL DEFAULT 0,
    "reserved_credits" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_lots" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "subscription_id" TEXT,
    "type" TEXT NOT NULL,
    "issued_credits" INTEGER NOT NULL,
    "remaining_credits" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_reservations" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reserved_credits" INTEGER NOT NULL,
    "consumed_credits" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger_entries" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lot_id" TEXT,
    "reservation_id" TEXT,
    "entry_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "available_after" INTEGER NOT NULL,
    "reserved_after" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider_refund_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idr_amount" INTEGER NOT NULL,
    "credits_reversed" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider_upload_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "part_size_bytes" INTEGER NOT NULL,
    "total_size_bytes" BIGINT NOT NULL,
    "expected_parts" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_parts" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "part_number" INTEGER NOT NULL,
    "etag" TEXT,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_attempts" (
    "id" TEXT NOT NULL,
    "render_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "worker_job_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "output_r2_key" TEXT,
    "checksum" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "heartbeat_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_tasks" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "reason" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "review_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "ip_hash" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "gig_drafts" (
    "id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricing" JSONB NOT NULL DEFAULT '{}',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "faq" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ai_provider" TEXT,
    "ai_model" TEXT,
    "prompt_version" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gig_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channels" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quote_id_key" ON "orders"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providers_name_key" ON "payment_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gateway_transaction_id_key" ON "payment_transactions"("gateway_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_events_provider_provider_event_id_key" ON "payment_gateway_events"("provider", "provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_reconciliation_transaction_id_key" ON "payment_reconciliation"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "renders_idempotency_key_key" ON "renders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "profit_reports_order_id_key" ON "profit_reports"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_leads_draft_order_id_key" ON "job_leads"("draft_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_products_key_key" ON "pricing_products"("key");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_base_currency_quote_currency_key" ON "fx_rates"("base_currency", "quote_currency");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_quotes_idempotency_key_key" ON "checkout_quotes"("idempotency_key");

-- CreateIndex
CREATE INDEX "checkout_quotes_user_id_status_idx" ON "checkout_quotes"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_id_key" ON "payments"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_user_id_status_idx" ON "payments"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE INDEX "payment_events_status_received_at_idx" ON "payment_events"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_provider_event_id_key" ON "payment_events"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_next_billing_at_idx" ON "subscriptions"("status", "next_billing_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "credit_lots_wallet_id_status_expires_at_idx" ON "credit_lots"("wallet_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_lots_payment_id_key" ON "credit_lots"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_reservations_idempotency_key_key" ON "credit_reservations"("idempotency_key");

-- CreateIndex
CREATE INDEX "credit_reservations_wallet_id_status_idx" ON "credit_reservations"("wallet_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_entries_idempotency_key_key" ON "credit_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_wallet_id_created_at_idx" ON "credit_ledger_entries"("wallet_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_provider_refund_id_key" ON "payment_refunds"("provider_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "upload_sessions_asset_id_key" ON "upload_sessions"("asset_id");

-- CreateIndex
CREATE INDEX "upload_sessions_user_id_status_idx" ON "upload_sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "upload_parts_session_id_part_number_key" ON "upload_parts"("session_id", "part_number");

-- CreateIndex
CREATE UNIQUE INDEX "render_attempts_worker_job_id_key" ON "render_attempts"("worker_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "render_attempts_render_id_attempt_key" ON "render_attempts"("render_id", "attempt");

-- CreateIndex
CREATE INDEX "review_tasks_status_risk_score_idx" ON "review_tasks"("status", "risk_score");

-- CreateIndex
CREATE INDEX "audit_events_target_type_target_id_idx" ON "audit_events"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "gig_drafts_platform_status_idx" ON "gig_drafts"("platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "checkout_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reconciliation" ADD CONSTRAINT "payment_reconciliation_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reconciliation" ADD CONSTRAINT "payment_reconciliation_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_assets" ADD CONSTRAINT "uploaded_assets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_assets" ADD CONSTRAINT "uploaded_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "r2_files" ADD CONSTRAINT "r2_files_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_briefs" ADD CONSTRAINT "edit_briefs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renders" ADD CONSTRAINT "renders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_links" ADD CONSTRAINT "delivery_links_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_logs" ADD CONSTRAINT "cost_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_cost_logs" ADD CONSTRAINT "render_cost_logs_render_id_fkey" FOREIGN KEY ("render_id") REFERENCES "renders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_cost_logs" ADD CONSTRAINT "render_cost_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_cost_logs" ADD CONSTRAINT "storage_cost_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_reports" ADD CONSTRAINT "profit_reports_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_jobs" ADD CONSTRAINT "queue_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_leads" ADD CONSTRAINT "job_leads_draft_order_id_fkey" FOREIGN KEY ("draft_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_drafts" ADD CONSTRAINT "proposal_drafts_job_lead_id_fkey" FOREIGN KEY ("job_lead_id") REFERENCES "job_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_approvals" ADD CONSTRAINT "admin_approvals_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_quotes" ADD CONSTRAINT "checkout_quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_quotes" ADD CONSTRAINT "checkout_quotes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "pricing_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "checkout_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "credit_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "credit_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "uploaded_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_parts" ADD CONSTRAINT "upload_parts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_attempts" ADD CONSTRAINT "render_attempts_render_id_fkey" FOREIGN KEY ("render_id") REFERENCES "renders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_drafts" ADD CONSTRAINT "gig_drafts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
