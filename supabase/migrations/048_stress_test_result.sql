create table if not exists "public"."stress_test_result" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "test_name" text,
  "action_count" numeric,
  "action_types" jsonb,
  "duration_ms" numeric,
  "avg_latency_ms" numeric,
  "failure_count" numeric,
  "duplicate_count" numeric,
  "sync_errors" numeric,
  "offline_queue_errors" numeric,
  "failure_rate" numeric,
  "status" text default 'running',
  "report_url" text,
  "raw_results" jsonb
);

create trigger "trg_stress_test_result_updated_date"
before update on "public"."stress_test_result"
for each row execute function "public"."set_updated_date"();
