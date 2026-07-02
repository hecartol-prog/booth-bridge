create table if not exists "public"."integration_sync_log" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "connection_id" uuid,
  "user_id" uuid,
  "provider" text,
  "sync_type" text,
  "status" text default 'pending',
  "records_attempted" numeric default 0,
  "records_succeeded" numeric default 0,
  "records_failed" numeric default 0,
  "error_details" text,
  "payload_summary" jsonb,
  "duration_ms" numeric,
  "source_record_id" text,
  "target_record_id" text
);

create trigger "trg_integration_sync_log_updated_date"
before update on "public"."integration_sync_log"
for each row execute function "public"."set_updated_date"();
