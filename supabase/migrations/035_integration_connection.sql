create table if not exists "public"."integration_connection" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_id" uuid,
  "provider" text,
  "status" text default 'pending',
  "display_name" text,
  "account_identifier" text,
  "scopes" jsonb,
  "last_sync" timestamptz,
  "records_synced" numeric default 0,
  "failed_syncs" numeric default 0,
  "error_message" text,
  "settings" jsonb,
  "is_active" boolean default true
);

create trigger "trg_integration_connection_updated_date"
before update on "public"."integration_connection"
for each row execute function "public"."set_updated_date"();
