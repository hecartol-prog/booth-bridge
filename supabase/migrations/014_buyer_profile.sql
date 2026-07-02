create table if not exists "public"."buyer_profile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_id" uuid,
  "job_title" text,
  "company" text,
  "company_address" text,
  "country" text,
  "industry" text,
  "interests" jsonb,
  "digital_card" jsonb
);

create trigger "trg_buyer_profile_updated_date"
before update on "public"."buyer_profile"
for each row execute function "public"."set_updated_date"();
