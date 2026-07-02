create table if not exists "public"."sponsored_listing" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "exhibitor_user_id" uuid,
  "company_name" text,
  "event_id" uuid,
  "event_name" text,
  "placement" text default 'homepage',
  "visibility_tier" text default 'bronze',
  "label" text default 'sponsored',
  "status" text default 'active',
  "start_date" date,
  "end_date" date,
  "daily_budget" numeric default 0,
  "event_budget" numeric default 0,
  "impressions" numeric default 0,
  "clicks" numeric default 0,
  "booth_visits" numeric default 0,
  "leads_generated" numeric default 0
);

create trigger "trg_sponsored_listing_updated_date"
before update on "public"."sponsored_listing"
for each row execute function "public"."set_updated_date"();
