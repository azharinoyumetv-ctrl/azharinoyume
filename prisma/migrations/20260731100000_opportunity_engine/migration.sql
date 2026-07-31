ALTER TABLE "job_leads"
  ADD COLUMN "external_id" TEXT,
  ADD COLUMN "connector_id" TEXT,
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "service_family" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "subcategory" TEXT,
  ADD COLUMN "deliverables" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "required_skills" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "location" TEXT,
  ADD COLUMN "language" TEXT,
  ADD COLUMN "engagement_model" TEXT,
  ADD COLUMN "budget_type" TEXT,
  ADD COLUMN "legitimacy_score" DECIMAL(5,2),
  ADD COLUMN "capability_score" DECIMAL(5,2),
  ADD COLUMN "profitability_score" DECIMAL(5,2),
  ADD COLUMN "risk_score" DECIMAL(5,2),
  ADD COLUMN "product_route" TEXT,
  ADD COLUMN "route_decision" TEXT,
  ADD COLUMN "risk_flags" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "policy_status" TEXT NOT NULL DEFAULT 'review_required',
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "source_connectors" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "connector_type" TEXT NOT NULL,
  "collection_method" TEXT NOT NULL,
  "permission_method" TEXT NOT NULL,
  "policy_status" TEXT NOT NULL DEFAULT 'review_required',
  "health" TEXT NOT NULL DEFAULT 'disabled',
  "auth_status" TEXT NOT NULL DEFAULT 'not_connected',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "allowed_actions" JSONB NOT NULL DEFAULT '[]',
  "retention_days" INTEGER,
  "rate_limit" JSONB NOT NULL DEFAULT '{}',
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "last_run_at" TIMESTAMP(3),
  "last_success_at" TIMESTAMP(3),
  "error_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "source_connectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "search_campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "categories" JSONB NOT NULL DEFAULT '[]',
  "keywords" JSONB NOT NULL DEFAULT '[]',
  "excluded_keywords" JSONB NOT NULL DEFAULT '[]',
  "locations" JSONB NOT NULL DEFAULT '[]',
  "languages" JSONB NOT NULL DEFAULT '[]',
  "sources" JSONB NOT NULL DEFAULT '[]',
  "product_routes" JSONB NOT NULL DEFAULT '[]',
  "minimum_budget" DECIMAL(10,2),
  "minimum_margin" DECIMAL(5,2),
  "schedule" TEXT,
  "last_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "search_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "opportunity_contracts" (
  "id" TEXT NOT NULL,
  "job_lead_id" TEXT,
  "title" TEXT NOT NULL,
  "client_name" TEXT,
  "client_company" TEXT,
  "client_email" TEXT,
  "client_country" TEXT,
  "source" TEXT,
  "product_routes" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'intake_required',
  "agreed_revenue" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "external_fees" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "estimated_cost" DECIMAL(10,2),
  "expected_margin" DECIMAL(5,2),
  "deadline" TIMESTAMP(3),
  "payment_status" TEXT NOT NULL DEFAULT 'pending',
  "contract_risk" TEXT NOT NULL DEFAULT 'unassessed',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "opportunity_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_interviews" (
  "id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "completion_percent" INTEGER NOT NULL DEFAULT 0,
  "ambiguity_score" INTEGER NOT NULL DEFAULT 100,
  "missing_answers" JSONB NOT NULL DEFAULT '[]',
  "missing_assets" JSONB NOT NULL DEFAULT '[]',
  "conflicts" JSONB NOT NULL DEFAULT '[]',
  "scope_change_risk" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "transcript" JSONB NOT NULL DEFAULT '[]',
  "assigned_operator_id" TEXT,
  "last_customer_response_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_interviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_specifications" (
  "id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "interview_id" TEXT,
  "product_route" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "requirements" JSONB NOT NULL DEFAULT '{}',
  "assumptions" JSONB NOT NULL DEFAULT '[]',
  "acceptance_criteria" JSONB NOT NULL DEFAULT '[]',
  "estimated_cost" DECIMAL(10,2),
  "quote_amount" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "expected_margin" DECIMAL(5,2),
  "immutable_hash" TEXT,
  "approved_at" TIMESTAMP(3),
  "customer_approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "source_connectors_name_key" ON "source_connectors"("name");
CREATE UNIQUE INDEX "job_leads_source_external_id_key" ON "job_leads"("source", "external_id");
CREATE INDEX "job_leads_category_pipeline_status_idx" ON "job_leads"("category", "pipeline_status");
CREATE INDEX "job_leads_product_route_pipeline_status_idx" ON "job_leads"("product_route", "pipeline_status");
CREATE INDEX "opportunity_contracts_status_created_at_idx" ON "opportunity_contracts"("status", "created_at");
CREATE UNIQUE INDEX "customer_interviews_contract_id_key" ON "customer_interviews"("contract_id");
CREATE INDEX "customer_interviews_status_ambiguity_score_idx" ON "customer_interviews"("status", "ambiguity_score");
CREATE UNIQUE INDEX "product_specifications_contract_id_product_route_version_key" ON "product_specifications"("contract_id", "product_route", "version");

ALTER TABLE "job_leads" ADD CONSTRAINT "job_leads_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "source_connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opportunity_contracts" ADD CONSTRAINT "opportunity_contracts_job_lead_id_fkey" FOREIGN KEY ("job_lead_id") REFERENCES "job_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_interviews" ADD CONSTRAINT "customer_interviews_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "opportunity_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "opportunity_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "customer_interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
