INSERT INTO "payment_providers" ("id", "name", "enabled", "mode", "regions", "config")
VALUES
  ('00000000-0000-4000-8000-000000000001', 'doku', true, 'auto', '["ID"]'::jsonb, '{"supports":["PACK"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000002', 'xendit', true, 'auto', '["ID"]'::jsonb, '{"supports":["PACK","SUBSCRIPTION"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000003', 'payoneer', false, 'manual', '["GLOBAL"]'::jsonb, '{"supports":["PACK"]}'::jsonb)
ON CONFLICT ("name") DO NOTHING;
