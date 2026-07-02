create table if not exists "public"."saved_booth" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "buyer_id" uuid,
  "exhibitor_user_id" uuid,
  "exhibitor_profile_id" uuid,
  "event_id" uuid,
  "event_name" text,
  "exhibitor_company" text,
  "booth_number" text,
  "notes" text,
  "visit_status" text default 'interested',
  "priority" text default 'medium'
);

create trigger "trg_saved_booth_updated_date"
before update on "public"."saved_booth"
for each row execute function "public"."set_updated_date"();
