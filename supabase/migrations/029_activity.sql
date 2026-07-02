create table if not exists "public"."activity" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "activity_type" text,
  "user_id" uuid,
  "company_id" uuid,
  "company_name" text,
  "event_id" uuid,
  "event_name" text,
  "booth_id" uuid,
  "booth_number" text,
  "product_id" uuid,
  "product_title" text,
  "lead_id" uuid,
  "meeting_id" uuid,
  "rfi_id" uuid,
  "target_company_id" uuid,
  "target_company_name" text,
  "target_user_id" uuid,
  "source_module" text,
  "source_device" text,
  "source_integration" text,
  "metadata" jsonb,
  "points" numeric default 0,
  "status" text default 'recorded'
);

create trigger "trg_activity_updated_date"
before update on "public"."activity"
for each row execute function "public"."set_updated_date"();
