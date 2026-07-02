create table if not exists "public"."connection" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "exhibitor_user_id" uuid,
  "buyer_user_id" uuid,
  "exhibitor_profile_id" uuid,
  "buyer_profile_id" uuid,
  "status" text default 'pending',
  "initiated_by" text,
  "exhibitor_notes" text,
  "buyer_notes" text,
  "exhibitor_company" text,
  "buyer_company" text,
  "exhibitor_name" text,
  "buyer_name" text,
  "booth_number" text,
  "event_name" text
);

create trigger "trg_connection_updated_date"
before update on "public"."connection"
for each row execute function "public"."set_updated_date"();
