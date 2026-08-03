UPDATE "pricing_products"
SET "active" = false
WHERE "kind" IN ('PACK', 'SUBSCRIPTION');

UPDATE "subscriptions"
SET "status" = 'CANCELLED',
    "cancel_at_period_end" = true,
    "next_billing_at" = NULL
WHERE "status" IN ('ACTIVE', 'PAST_DUE', 'PENDING');
