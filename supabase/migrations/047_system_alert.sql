create table if not exists "public"."system_alert" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "severity" text default 'info',
  "category" text default 'system',
  "title" text,
  "message" text,
  "status" text default 'active',
  "resolved_at" timestamptz,
  "metadata" jsonb
);

create trigger "trg_system_alert_updated_date"
before update on "public"."system_alert"
for each row execute function "public"."set_updated_date"();
